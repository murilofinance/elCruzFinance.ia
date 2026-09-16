export type AccountKind = 'checking' | 'savings' | 'wallet';

export type Account = {
  id: string;
  name: string;
  institution: string | null;
  kind: AccountKind;
  currency: 'BRL';
  currentBalance: number;
  origin: 'manual' | 'open_finance';
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreditCard = {
  id: string;
  name: string;
  institution: string | null;
  creditLimit: number;
  closingDay: number;
  dueDay: number;
  currentInvoice: number;
  invoices: { month: string; amount: number }[];
  origin: 'manual' | 'open_finance';
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Debt = {
  id: string;
  creditor: string;
  kind: 'loan' | 'bill';
  principalReceived: number;
  totalToPay: number;
  installmentCount: number;
  remainingBalance: number;
  installmentAmount: number;
  dueDay: number;
  createdAt: string;
  updatedAt: string;
};

export type Investment = {
  id: string;
  name: string;
  institution: string | null;
  kind: 'fixed' | 'funds' | 'stocks' | 'crypto' | 'other';
  currentValue: number;
  origin: 'manual' | 'open_finance';
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'card_payment'
  | 'debt_payment';

export type LedgerTransaction = {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  accountId: string | null;
  cardId: string | null;
  debtId: string | null;
  toAccountId: string | null;
  categoryId: string | null;
  externalId: string | null;
  source: 'manual' | 'open_finance' | 'ocr' | 'import';
  status: 'draft' | 'confirmed' | 'ignored';
  createdAt: string;
};

export type Category = {
  id: string;
  name: string;
  kind: 'income' | 'expense';
  seeded: boolean;
};

export type ProjectionItem = {
  id: string;
  kind: 'card' | 'debt' | 'bill';
  title: string;
  detail: string;
  amount: number;
  dueDate: string;
  overdue: boolean;
};

export type ProjectionBoard = {
  asOf: string;
  totalDue: number;
  items: ProjectionItem[];
  headline: string;
};

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Salário', kind: 'income', seeded: true },
  { name: 'Outras entradas', kind: 'income', seeded: true },
  { name: 'Moradia', kind: 'expense', seeded: true },
  { name: 'Alimentação', kind: 'expense', seeded: true },
  { name: 'Mercado', kind: 'expense', seeded: true },
  { name: 'Transporte', kind: 'expense', seeded: true },
  { name: 'Saúde', kind: 'expense', seeded: true },
  { name: 'Educação', kind: 'expense', seeded: true },
  { name: 'Lazer', kind: 'expense', seeded: true },
  { name: 'Assinaturas', kind: 'expense', seeded: true },
  { name: 'Pessoal', kind: 'expense', seeded: true },
  { name: 'Contas fixas', kind: 'expense', seeded: true },
  { name: 'Sem categoria', kind: 'expense', seeded: true },
];
