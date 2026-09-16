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
} from './finance.dto';
import {
  Account,
  Category,
  CreditCard,
  Debt,
  DEFAULT_CATEGORIES,
  LedgerTransaction,
} from './finance.types';

@Injectable()
export class FinanceService {
  constructor(private readonly firebase: FirebaseService) {}

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
    const ref = this.col(uid, 'cards').doc();
    const payload: Omit<CreditCard, 'id'> = {
      name: dto.name.trim(),
      institution: dto.institution?.trim() || null,
      creditLimit: dto.creditLimit,
      closingDay: dto.closingDay,
      dueDay: dto.dueDay,
      currentInvoice: dto.currentInvoice ?? 0,
      origin: 'manual',
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
      remainingBalance: dto.remainingBalance,
      installmentAmount: dto.installmentAmount,
      dueDay: dto.dueDay,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(payload);
    return { id: ref.id, ...payload };
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
    } else {
      throw new BadRequestException('Transferência entre contas entra na v2.');
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
      .filter((card) => card.currentInvoice > 0 && !paidCardThisMonth.has(card.id))
      .reduce((sum, card) => sum + card.currentInvoice, 0);

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
