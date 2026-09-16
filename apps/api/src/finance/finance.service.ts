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
  CreateInvestmentDto,
  CreateTransactionDto,
  ConnectOpenFinanceDto,
  SyncOpenFinanceDto,
} from './finance.dto';
import {
  Account,
  AccountKind,
  Category,
  CreditCard,
  Debt,
  DEFAULT_CATEGORIES,
  Investment,
  LedgerTransaction,
  ProjectionBoard,
  ProjectionItem,
  TransactionType,
} from './finance.types';
import { shortBankLabel } from './labels';
import {
  PluggyService,
  type PluggyAccount,
  type PluggyInvestment,
  type PluggyTransaction,
} from './pluggy.service';

@Injectable()
export class FinanceService {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly pluggy: PluggyService,
  ) {}

  private col(uid: string, name: string) {
    return this.firebase.db.collection(`users/${uid}/${name}`);
  }

  private pluggyCredentials(input: {
    clientId?: string;
    clientSecret?: string;
  }) {
    const clientId =
      input.clientId?.trim() || process.env.PLUGGY_CLIENT_ID?.trim() || '';
    const clientSecret =
      input.clientSecret?.trim() ||
      process.env.PLUGGY_CLIENT_SECRET?.trim() ||
      '';
    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'Credenciais Pluggy ausentes. Configure PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET na API.',
      );
    }
    return { clientId, clientSecret };
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
      .map((doc) => {
        const data = doc.data() as Omit<Debt, 'id'>;
        return {
          id: doc.id,
          ...data,
          kind: data.kind === 'bill' ? ('bill' as const) : ('loan' as const),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createDebt(uid: string, dto: CreateDebtDto): Promise<Debt> {
    const now = new Date().toISOString();
    const ref = this.col(uid, 'debts').doc();
    const payload: Omit<Debt, 'id'> = {
      creditor: dto.creditor.trim(),
      kind: dto.kind === 'bill' ? 'bill' : 'loan',
      principalReceived: dto.principalReceived ?? 0,
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

  async listInvestments(uid: string): Promise<Investment[]> {
    const snap = await this.col(uid, 'investments').get();
    return snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Investment, 'id'>) }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createInvestment(uid: string, dto: CreateInvestmentDto): Promise<Investment> {
    const now = new Date().toISOString();
    const ref = this.col(uid, 'investments').doc();
    const payload: Omit<Investment, 'id'> = {
      name: dto.name.trim(),
      institution: dto.institution?.trim() || null,
      kind: dto.kind,
      currentValue: dto.currentValue,
      origin: 'manual',
      externalId: null,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(payload);
    return { id: ref.id, ...payload };
  }

  async connectOpenFinance(uid: string, dto: ConnectOpenFinanceDto) {
    const { clientId, clientSecret } = this.pluggyCredentials(dto);
    const itemId = dto.itemId.trim();
    const snapshot = await this.pluggy.fetchSnapshot({
      clientId,
      clientSecret,
      itemId,
    });

    const now = new Date().toISOString();
    const connectionRef = this.col(uid, 'connections').doc(itemId);
    const existing = await connectionRef.get();
    await connectionRef.set(
      {
        itemId,
        clientId,
        clientSecret,
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
    let investments = 0;
    const localByExternal = new Map<
      string,
      { kind: 'account' | 'card'; id: string }
    >();
    for (const remote of snapshot.accounts) {
      if (remote.type === 'CREDIT') {
        const id = await this.upsertPluggyCard(
          uid,
          remote,
          snapshot.connectorName,
          now,
        );
        localByExternal.set(remote.id, { kind: 'card', id });
        cards += 1;
      } else {
        const id = await this.upsertPluggyAccount(
          uid,
          remote,
          snapshot.connectorName,
          now,
        );
        localByExternal.set(remote.id, { kind: 'account', id });
        accounts += 1;
      }
    }
    for (const remote of snapshot.investments) {
      await this.upsertPluggyInvestment(uid, remote, snapshot.connectorName, now);
      investments += 1;
    }

    let transactions = 0;
    for (const remote of snapshot.transactions) {
      const local = localByExternal.get(remote.accountId);
      if (!local) {
        continue;
      }
      const created = await this.upsertPluggyTransaction(uid, remote, local, now);
      if (created) {
        transactions += 1;
      }
    }

    return {
      connectorName: snapshot.connectorName,
      itemStatus: snapshot.itemStatus,
      accounts,
      cards,
      investments,
      transactions,
    };
  }

  async listConnections(uid: string) {
    const snap = await this.col(uid, 'connections').get();
    return snap.docs
      .map((doc) => {
        const data = doc.data() as {
          itemId?: string;
          connectorName?: string;
          status?: string;
          lastSyncAt?: string;
        };
        return {
          id: doc.id,
          itemId: data.itemId ?? doc.id,
          connectorName: data.connectorName ?? 'Open Finance',
          status: data.status ?? 'ok',
          lastSyncAt: data.lastSyncAt ?? null,
        };
      })
      .sort((a, b) => (b.lastSyncAt ?? '').localeCompare(a.lastSyncAt ?? ''));
  }

  async syncOpenFinance(uid: string, dto: SyncOpenFinanceDto = {}) {
    const connections = await this.col(uid, 'connections').get();
    if (connections.empty) {
      throw new BadRequestException(
        'Nenhuma conexão Pluggy salva. Adicione pela origem Open Finance.',
      );
    }
    const wanted = dto.itemId?.trim();
    const targets = connections.docs.filter((doc) =>
      wanted ? doc.id === wanted || doc.data().itemId === wanted : true,
    );
    if (targets.length === 0) {
      throw new BadRequestException('Essa conexão Pluggy não foi encontrada.');
    }

    let accounts = 0;
    let cards = 0;
    let transactions = 0;
    let connectorName = 'Open Finance';
    for (const doc of targets) {
      const data = doc.data() as {
        clientId?: string;
        clientSecret?: string;
        itemId?: string;
        connectorName?: string;
      };
      if (!data.itemId) {
        continue;
      }
      const result = await this.connectOpenFinance(uid, {
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        itemId: data.itemId,
      });
      accounts += result.accounts;
      cards += result.cards;
      transactions += result.transactions;
      connectorName = result.connectorName;
    }
    return { connectorName, accounts, cards, transactions };
  }

  private async upsertPluggyAccount(
    uid: string,
    remote: PluggyAccount,
    institution: string,
    now: string,
  ): Promise<string> {
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
      const ref = this.col(uid, 'accounts').doc();
      await ref.set(payload);
      return ref.id;
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
    return snap.id;
  }

  private async upsertPluggyCard(
    uid: string,
    remote: PluggyAccount,
    institution: string,
    now: string,
  ): Promise<string> {
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
      const ref = this.col(uid, 'cards').doc();
      await ref.set(payload);
      return ref.id;
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
    return snap.id;
  }

  private async upsertPluggyInvestment(
    uid: string,
    remote: PluggyInvestment,
    institution: string,
    now: string,
  ): Promise<string> {
    const existing = await this.col(uid, 'investments')
      .where('externalId', '==', remote.id)
      .limit(1)
      .get();
    const payload: Omit<Investment, 'id'> = {
      name: remote.name?.trim() || remote.code?.trim() || 'Investimento',
      institution,
      kind: mapInvestmentKind(remote.type),
      currentValue: Number(remote.balance ?? remote.value ?? remote.amount ?? 0),
      origin: 'open_finance',
      externalId: remote.id,
      createdAt: now,
      updatedAt: now,
    };
    if (existing.empty) {
      const ref = this.col(uid, 'investments').doc();
      await ref.set(payload);
      return ref.id;
    }
    const snap = existing.docs[0];
    const previous = snap.data() as Omit<Investment, 'id'>;
    await snap.ref.update({
      name: payload.name,
      institution: payload.institution,
      kind: payload.kind,
      currentValue: payload.currentValue,
      origin: 'open_finance',
      externalId: remote.id,
      updatedAt: now,
      createdAt: previous.createdAt ?? now,
    });
    return snap.id;
  }

  private async upsertPluggyTransaction(
    uid: string,
    remote: PluggyTransaction,
    local: { kind: 'account' | 'card'; id: string },
    now: string,
  ): Promise<boolean> {
    if (remote.status && remote.status !== 'POSTED') {
      return false;
    }
    const existing = await this.col(uid, 'transactions')
      .where('externalId', '==', remote.id)
      .limit(1)
      .get();
    const amount = Math.abs(Number(remote.amount) || 0);
    if (amount <= 0) {
      return false;
    }
    const type = mapPluggyTransactionType(local.kind, remote.type);
    const payload: Omit<LedgerTransaction, 'id'> = {
      type,
      amount,
      date: (remote.date ?? now).slice(0, 10),
      description: (
        remote.description ||
        remote.descriptionRaw ||
        'Transação Open Finance'
      ).trim(),
      accountId: local.kind === 'account' ? local.id : null,
      cardId: local.kind === 'card' ? local.id : null,
      debtId: null,
      toAccountId: null,
      categoryId: null,
      externalId: remote.id,
      source: 'open_finance',
      status: 'confirmed',
      createdAt: now,
    };
    if (existing.empty) {
      await this.col(uid, 'transactions').doc().set(payload);
      return true;
    }
    await existing.docs[0].ref.update({
      type: payload.type,
      amount: payload.amount,
      date: payload.date,
      description: payload.description,
      accountId: payload.accountId,
      cardId: payload.cardId,
      source: 'open_finance',
      status: 'confirmed',
      updatedAt: now,
    });
    return false;
  }

  async listTransactions(uid: string): Promise<LedgerTransaction[]> {
    const snap = await this.col(uid, 'transactions').get();
    return snap.docs
      .map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<LedgerTransaction, 'id'>),
      }))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 120);
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
      externalId: null,
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
    const month = saoPauloToday().slice(0, 7);

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

  async listProjections(uid: string): Promise<ProjectionBoard> {
    const [cards, debts, transactions] = await Promise.all([
      this.listCards(uid),
      this.listDebts(uid),
      this.listTransactions(uid),
    ]);
    return buildProjectionBoard(cards, debts, transactions);
  }

  async advisorContext(uid: string) {
    const [accounts, cards, debts, investments, transactions] = await Promise.all([
      this.listAccounts(uid),
      this.listCards(uid),
      this.listDebts(uid),
      this.listInvestments(uid),
      this.listTransactions(uid),
    ]);
    const projections = buildProjectionBoard(cards, debts, transactions);
    const cash = roundMoney(
      accounts.reduce((sum, item) => sum + item.currentBalance, 0),
    );
    return {
      hoje: projections.asOf,
      disponivelSeguro: roundMoney(
        cash - projections.items.reduce((sum, item) => sum + item.amount, 0),
      ),
      caixa: cash,
      investimentos: roundMoney(
        investments.reduce((sum, item) => sum + item.currentValue, 0),
      ),
      faturasAbertas: roundMoney(
        projections.items
          .filter((item) => item.kind === 'card')
          .reduce((sum, item) => sum + item.amount, 0),
      ),
      parcelasAbertas: roundMoney(
        projections.items
          .filter((item) => item.kind === 'debt' || item.kind === 'bill')
          .reduce((sum, item) => sum + item.amount, 0),
      ),
      contas: accounts.map((item) => ({
        banco: shortBankLabel(item.institution, item.name),
        nome: item.name,
        tipo: item.kind,
        saldo: roundMoney(item.currentBalance),
      })),
      cartoes: cards.map((item) => ({
        banco: shortBankLabel(item.institution, item.name),
        nome: item.name,
        fatura: roundMoney(invoiceThisMonth(item)),
        limite: roundMoney(item.creditLimit),
        fechaDia: item.closingDay,
        venceDia: item.dueDay,
        faturas: item.invoices ?? [],
      })),
      emprestimos: debts
        .filter((item) => item.kind !== 'bill')
        .map((item) => ({
          credor: item.creditor,
          saldo: roundMoney(item.remainingBalance),
          parcela: roundMoney(item.installmentAmount),
          venceDia: item.dueDay,
        })),
      boletos: debts
        .filter((item) => item.kind === 'bill')
        .map((item) => ({
          nome: item.creditor,
          saldo: roundMoney(item.remainingBalance),
          parcela: roundMoney(item.installmentAmount),
          vezes: item.installmentCount,
          venceDia: item.dueDay,
        })),
      carteira: investments.map((item) => ({
        nome: item.name,
        instituicao: item.institution,
        tipo: item.kind,
        valor: roundMoney(item.currentValue),
      })),
      vencimentos: projections.items.map((item) => ({
        tipo:
          item.kind === 'card'
            ? 'fatura'
            : item.kind === 'bill'
              ? 'boleto'
              : 'emprestimo',
        nome: item.title,
        valor: item.amount,
        venceEm: item.dueDate,
        atrasado: item.overdue,
      })),
      extratoRecente: transactions.slice(0, 35).map((item) => {
        const account = accounts.find((row) => row.id === item.accountId);
        const card = cards.find((row) => row.id === item.cardId);
        return {
          data: item.date,
          tipo: item.type,
          valor: roundMoney(item.amount),
          descricao: item.description.slice(0, 80),
          origem: card
            ? shortBankLabel(card.institution, card.name)
            : account
              ? shortBankLabel(account.institution, account.name)
              : item.source,
        };
      }),
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

function mapInvestmentKind(
  type?: string | null,
): Investment['kind'] {
  const value = (type ?? '').toUpperCase();
  if (value.includes('CRYPTO') || value.includes('CRIPTO')) {
    return 'crypto';
  }
  if (value.includes('FIXED') || value.includes('CDB') || value.includes('TESOURO')) {
    return 'fixed';
  }
  if (value.includes('FUND') || value.includes('COTA')) {
    return 'funds';
  }
  if (value.includes('EQUITY') || value.includes('STOCK') || value.includes('ACAO')) {
    return 'stocks';
  }
  return 'other';
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
  const month = saoPauloToday().slice(0, 7);
  return card.invoices?.find((item) => item.month === month)?.amount ?? card.currentInvoice;
}

function buildProjectionBoard(
  cards: CreditCard[],
  debts: Debt[],
  transactions: LedgerTransaction[],
): ProjectionBoard {
  const today = saoPauloToday();
  const month = today.slice(0, 7);
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

  const items: ProjectionItem[] = [];
  for (const card of cards) {
    const amount = invoiceThisMonth(card);
    if (!(amount > 0) || paidCardThisMonth.has(card.id)) {
      continue;
    }
    const dueDate = nextDueDate(card.dueDay || 10, today);
    items.push({
      id: card.id,
      kind: 'card',
      title: shortBankLabel(card.institution, card.name),
      detail: `Fatura ${card.name}`,
      amount,
      dueDate,
      overdue: dueDate < today,
    });
  }
  for (const debt of debts) {
    if (
      !(debt.installmentAmount > 0) ||
      debt.remainingBalance <= 0 ||
      paidDebtThisMonth.has(debt.id)
    ) {
      continue;
    }
    const bill = debt.kind === 'bill';
    const dueDate = nextDueDate(debt.dueDay || 10, today);
    items.push({
      id: debt.id,
      kind: bill ? 'bill' : 'debt',
      title: debt.creditor,
      detail: bill
        ? `Boleto ${debt.installmentCount}x ${formatMoney(debt.installmentAmount)}`
        : `Parcela ${formatMoney(debt.installmentAmount)}`,
      amount: debt.installmentAmount,
      dueDate,
      overdue: dueDate < today,
    });
  }
  items.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || b.amount - a.amount);
  const totalDue = roundMoney(items.reduce((sum, item) => sum + item.amount, 0));
  const next = items[0];
  const headline = next
    ? `Próximo: ${next.title} ${formatMoney(next.amount)} em ${formatDay(next.dueDate)}.`
    : 'Nenhum vencimento de fatura ou parcela à vista.';
  return { asOf: today, totalDue, items, headline };
}

function saoPauloToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function nextDueDate(dueDay: number, today: string): string {
  const [year, month] = today.split('-').map(Number);
  const thisMonth = isoDate(year, month, Math.min(dueDay, daysInMonth(year, month)));
  if (thisMonth >= today) {
    return thisMonth;
  }
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return isoDate(nextYear, nextMonth, Math.min(dueDay, daysInMonth(nextYear, nextMonth)));
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDay(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function mapPluggyTransactionType(
  kind: 'account' | 'card',
  remoteType?: string,
): TransactionType {
  const credit = remoteType === 'CREDIT';
  if (kind === 'card') {
    return credit ? 'card_payment' : 'expense';
  }
  return credit ? 'income' : 'expense';
}
