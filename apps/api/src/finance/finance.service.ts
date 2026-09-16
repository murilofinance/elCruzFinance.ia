import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import {
  CreateAccountDto,
  CreateCardDto,
  CreateDebtDto,
  CreateTransactionDto,
  ConnectOpenFinanceDto,
} from './finance.dto';
import {
  Account,
  AccountKind,
  Category,
  CreditCard,
  Debt,
  DEFAULT_CATEGORIES,
  LedgerTransaction,
} from './finance.types';
import { PluggyService, type PluggyAccount } from './pluggy.service';

@Injectable()
export class FinanceService {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly pluggy: PluggyService,
  ) {}

  private col(uid: string, name: string) {
    return this.firebase.db.collection(`users/${uid}/${name}`);
  }

  async seedCategories(uid: string): Promise<Category[]> {
    const snap = await this.col(uid, 'categories').get();
    if (!snap.empty) {
      return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Category, 'id'>) }));
    }
    const batch = this.firebase.db.batch();
    const created: Category[] = [];
    for (const item of DEFAULT_CATEGORIES) {
      const ref = this.col(uid, 'categories').doc();
      batch.set(ref, item);
      created.push({ id: ref.id, ...item });
    }
    await batch.commit();
    return created;
  }

  listCategories(uid: string) {
    return this.seedCategories(uid);
  }

  async listAccounts(uid: string): Promise<Account[]> {
    const snap = await this.col(uid, 'accounts').get();
    return snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Account, 'id'>) }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createAccount(uid: string, dto: CreateAccountDto): Promise<Account> {
    const now = new Date().toISOString();
    const ref = this.col(uid, 'accounts').doc();
    const payload: Omit<Account, 'id'> = {
      name: dto.name.trim(),
      institution: dto.institution?.trim() || null,
      kind: dto.kind,
      currency: 'BRL',
      currentBalance: dto.currentBalance,
      origin: 'manual',
      externalId: null,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(payload);
    return { id: ref.id, ...payload };
  }

  async listCards(uid: string): Promise<CreditCard[]> {
    const snap = await this.col(uid, 'cards').get();
    return snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<CreditCard, 'id'>) }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createCard(uid: string, dto: CreateCardDto): Promise<CreditCard> {
    const now = new Date().toISOString();
    const invoices = normalizeInvoices(dto.invoices);
    const month = now.slice(0, 7);
    const currentInvoice =
      invoices.find((item) => item.month === month)?.amount ??
      invoices[0]?.amount ??
      0;
    const ref = this.col(uid, 'cards').doc();
    const payload: Omit<CreditCard, 'id'> = {
      name: dto.name.trim(),
      institution: dto.institution?.trim() || null,
      creditLimit: dto.creditLimit,
      closingDay: dto.closingDay,
      dueDay: dto.dueDay,
      currentInvoice,
      invoices,
      origin: 'manual',
      externalId: null,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(payload);
    return { id: ref.id, ...payload };
  }

  async listDebts(uid: string): Promise<Debt[]> {
    const snap = await this.col(uid, 'debts').get();
    return snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Debt, 'id'>) }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createDebt(uid: string, dto: CreateDebtDto): Promise<Debt> {
    const now = new Date().toISOString();
    const ref = this.col(uid, 'debts').doc();
    const payload: Omit<Debt, 'id'> = {
      creditor: dto.creditor.trim(),
      principalReceived: dto.principalReceived,
      totalToPay: dto.totalToPay,
      installmentCount: dto.installmentCount,
      remainingBalance: dto.totalToPay,
      installmentAmount:
        dto.installmentAmount > 0
          ? dto.installmentAmount
          : dto.installmentCount > 0
            ? roundMoney(dto.totalToPay / dto.installmentCount)
            : 0,
      dueDay: dto.dueDay,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(payload);
    return { id: ref.id, ...payload };
  }

  async connectOpenFinance(uid: string, dto: ConnectOpenFinanceDto) {
    const snapshot = await this.pluggy.fetchSnapshot({
      clientId: dto.clientId.trim(),
      clientSecret: dto.clientSecret.trim(),
      itemId: dto.itemId.trim(),
    });

    const now = new Date().toISOString();
    const connectionRef = this.col(uid, 'connections').doc(dto.itemId.trim());
    const existing = await connectionRef.get();
    await connectionRef.set(
      {
        itemId: dto.itemId.trim(),
        clientId: dto.clientId.trim(),
        clientSecret: dto.clientSecret.trim(),
        connectorName: snapshot.connectorName,
        itemStatus: snapshot.itemStatus,
        status: snapshot.accounts.length > 0 ? 'ok' : 'empty',
        lastSyncAt: now,
        updatedAt: now,
        createdAt: existing.exists
          ? (existing.data()?.createdAt as string | undefined) ?? now
          : now,
      },
      { merge: true },
    );

    let accounts = 0;
    let cards = 0;
    for (const remote of snapshot.accounts) {
      if (remote.type === 'CREDIT') {
        await this.upsertPluggyCard(uid, remote, snapshot.connectorName, now);
        cards += 1;
      } else {
        await this.upsertPluggyAccount(uid, remote, snapshot.connectorName, now);
        accounts += 1;
      }
    }

    return {
      connectorName: snapshot.connectorName,
      itemStatus: snapshot.itemStatus,
      accounts,
      cards,
    };
  }

  private async upsertPluggyAccount(
    uid: string,
    remote: PluggyAccount,
    institution: string,
    now: string,
  ) {
    const existing = await this.col(uid, 'accounts')
      .where('externalId', '==', remote.id)
      .limit(1)
      .get();
    const payload: Omit<Account, 'id'> = {
      name: remote.marketingName?.trim() || remote.name?.trim() || 'Conta',
      institution,
      kind: mapAccountKind(remote.subtype),
      currency: 'BRL',
      currentBalance: Number(remote.balance ?? 0),
      origin: 'open_finance',
      externalId: remote.id,
      createdAt: now,
      updatedAt: now,
    };
    if (existing.empty) {
      await this.col(uid, 'accounts').doc().set(payload);
      return;
    }
    const snap = existing.docs[0];
    const previous = snap.data() as Omit<Account, 'id'>;
    await snap.ref.update({
      name: payload.name,
      institution: payload.institution,
      kind: payload.kind,
      currentBalance: payload.currentBalance,
      origin: 'open_finance',
      externalId: remote.id,
      updatedAt: now,
      createdAt: previous.createdAt ?? now,
    });
  }

  private async upsertPluggyCard(
    uid: string,
    remote: PluggyAccount,
    institution: string,
    now: string,
  ) {
    const existing = await this.col(uid, 'cards')
      .where('externalId', '==', remote.id)
      .limit(1)
      .get();
    const close = dayFrom(remote.creditData?.balanceCloseDate);
    const due = dayFrom(remote.creditData?.balanceDueDate);
    const payload: Omit<CreditCard, 'id'> = {
      name: remote.marketingName?.trim() || remote.name?.trim() || 'Cartão',
      institution,
      creditLimit: Number(remote.creditData?.creditLimit ?? 0),
      closingDay: close,
      dueDay: due,
      currentInvoice: Math.abs(Number(remote.balance ?? 0)),
      invoices: [
        {
          month: now.slice(0, 7),
          amount: Math.abs(Number(remote.balance ?? 0)),
        },
      ],
      origin: 'open_finance',
      externalId: remote.id,
      createdAt: now,
      updatedAt: now,
    };
    if (existing.empty) {
      await this.col(uid, 'cards').doc().set(payload);
      return;
    }
    const snap = existing.docs[0];
    const previous = snap.data() as Omit<CreditCard, 'id'>;
    await snap.ref.update({
      name: payload.name,
      institution: payload.institution,
      creditLimit: payload.creditLimit,
      closingDay: payload.closingDay,
      dueDay: payload.dueDay,
      currentInvoice: payload.currentInvoice,
      invoices: payload.invoices,
      origin: 'open_finance',
      externalId: remote.id,
      updatedAt: now,
      createdAt: previous.createdAt ?? now,
    });
  }

  async listTransactions(uid: string): Promise<LedgerTransaction[]> {
    const snap = await this.col(uid, 'transactions').get();
    return snap.docs
      .map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<LedgerTransaction, 'id'>),
      }))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);
  }

  async createTransaction(
    uid: string,
    dto: CreateTransactionDto,
  ): Promise<LedgerTransaction> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.date)) {
      throw new BadRequestException('Data no formato AAAA-MM-DD.');
    }

    const now = new Date().toISOString();
    const accountId = dto.accountId ?? null;
    const cardId = dto.cardId ?? null;
    const debtId = dto.debtId ?? null;
    const toAccountId = dto.toAccountId ?? null;

    if (dto.type === 'income' || dto.type === 'expense') {
      if (dto.type === 'expense' && cardId && !accountId) {
        await this.bumpCardInvoice(uid, cardId, dto.amount);
      } else if (accountId) {
        const delta = dto.type === 'income' ? dto.amount : -dto.amount;
        await this.bumpAccount(uid, accountId, delta);
      } else {
        throw new BadRequestException(
          'Informe a conta (Pix/saldo) ou o cartão (compra na fatura).',
        );
      }
    } else if (dto.type === 'card_payment') {
      if (!accountId || !cardId) {
        throw new BadRequestException('Pagamento de fatura precisa de conta e cartão.');
      }
      await this.bumpAccount(uid, accountId, -dto.amount);
      await this.bumpCardInvoice(uid, cardId, -dto.amount);
    } else if (dto.type === 'debt_payment') {
      if (!accountId || !debtId) {
        throw new BadRequestException('Parcela precisa de conta e empréstimo.');
      }
      await this.bumpAccount(uid, accountId, -dto.amount);
      await this.bumpDebt(uid, debtId, -dto.amount);
    } else if (dto.type === 'transfer') {
      if (!accountId || !toAccountId) {
        throw new BadRequestException(
          'Transferência precisa da conta de origem e da de destino.',
        );
      }
      if (accountId === toAccountId) {
        throw new BadRequestException('Escolha duas contas diferentes.');
      }
      await this.bumpAccount(uid, accountId, -dto.amount);
      await this.bumpAccount(uid, toAccountId, dto.amount);
    } else {
      throw new BadRequestException('Tipo de lançamento inválido.');
    }

    const ref = this.col(uid, 'transactions').doc();
    const payload: Omit<LedgerTransaction, 'id'> = {
      type: dto.type,
      amount: dto.amount,
      date: dto.date,
      description: dto.description.trim(),
      accountId,
      cardId,
      debtId,
      toAccountId,
      categoryId: dto.categoryId ?? null,
      source: 'manual',
      status: 'confirmed',
      createdAt: now,
    };
    await ref.set(payload);
    return { id: ref.id, ...payload };
  }

  async safeToSpend(uid: string) {
    const [accounts, cards, debts, transactions] = await Promise.all([
      this.listAccounts(uid),
      this.listCards(uid),
      this.listDebts(uid),
      this.listTransactions(uid),
    ]);

    const cash = accounts.reduce((sum, item) => sum + item.currentBalance, 0);
    const month = new Date().toISOString().slice(0, 7);

    const paidCardThisMonth = new Set(
      transactions
        .filter((tx) => tx.type === 'card_payment' && tx.date.startsWith(month) && tx.cardId)
        .map((tx) => tx.cardId as string),
    );
    const paidDebtThisMonth = new Set(
      transactions
        .filter((tx) => tx.type === 'debt_payment' && tx.date.startsWith(month) && tx.debtId)
        .map((tx) => tx.debtId as string),
    );

    const openInvoices = cards
      .filter((card) => invoiceThisMonth(card) > 0 && !paidCardThisMonth.has(card.id))
      .reduce((sum, card) => sum + invoiceThisMonth(card), 0);

    const openInstallments = debts
      .filter((debt) => debt.installmentAmount > 0 && !paidDebtThisMonth.has(debt.id))
      .reduce((sum, debt) => sum + debt.installmentAmount, 0);

    const available = cash - openInvoices - openInstallments;

    return {
      cash,
      openInvoices,
      openInstallments,
      available,
      asOf: new Date().toISOString(),
    };
  }

  private async bumpAccount(uid: string, accountId: string, delta: number) {
    const ref = this.col(uid, 'accounts').doc(accountId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new NotFoundException('Conta não encontrada.');
    }
    const current = snap.data() as Omit<Account, 'id'>;
    await ref.update({
      currentBalance: current.currentBalance + delta,
      updatedAt: new Date().toISOString(),
    });
  }

  private async bumpCardInvoice(uid: string, cardId: string, delta: number) {
    const ref = this.col(uid, 'cards').doc(cardId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new NotFoundException('Cartão não encontrado.');
    }
    const current = snap.data() as Omit<CreditCard, 'id'>;
    await ref.update({
      currentInvoice: Math.max(0, current.currentInvoice + delta),
      updatedAt: new Date().toISOString(),
    });
  }

  private async bumpDebt(uid: string, debtId: string, delta: number) {
    const ref = this.col(uid, 'debts').doc(debtId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new NotFoundException('Empréstimo não encontrado.');
    }
    const current = snap.data() as Omit<Debt, 'id'>;
    await ref.update({
      remainingBalance: Math.max(0, current.remainingBalance + delta),
      updatedAt: new Date().toISOString(),
    });
  }
}

function mapAccountKind(subtype?: string | null): AccountKind {
  if (subtype === 'SAVINGS_ACCOUNT') {
    return 'savings';
  }
  return 'checking';
}

function dayFrom(iso?: string | null): number {
  const day = Number(iso?.slice(8, 10));
  return day >= 1 && day <= 31 ? day : 10;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeInvoices(
  invoices: { month: string; amount: number }[] | undefined,
): { month: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const item of invoices ?? []) {
    if (!/^\d{4}-\d{2}$/.test(item.month)) {
      continue;
    }
    map.set(item.month, Number(item.amount) || 0);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }));
}

function invoiceThisMonth(card: CreditCard): number {
  const month = new Date().toISOString().slice(0, 7);
  return card.invoices?.find((item) => item.month === month)?.amount ?? card.currentInvoice;
}
