import { auth } from './firebase';

const apiUrl = import.meta.env.VITE_API_URL ?? '/api';

export async function apiFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  if (!auth?.currentUser) {
    throw new Error('Não autenticado');
  }
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(`${apiUrl}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(payload?.message)
      ? payload.message.join(' ')
      : payload?.message;
    throw new Error(message ?? `Erro ${response.status}`);
  }
  return (await response.json()) as T;
}

export type MeResponse = {
  uid: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Account = {
  id: string;
  name: string;
  institution: string | null;
  kind: 'checking' | 'savings' | 'wallet';
  currentBalance: number;
};

export type CreditCard = {
  id: string;
  name: string;
  institution: string | null;
  creditLimit: number;
  closingDay: number;
  dueDay: number;
  currentInvoice: number;
};

export type Debt = {
  id: string;
  creditor: string;
  remainingBalance: number;
  installmentAmount: number;
  dueDay: number;
};

export type LedgerTransaction = {
  id: string;
  type: 'income' | 'expense' | 'transfer' | 'card_payment' | 'debt_payment';
  amount: number;
  date: string;
  description: string;
};

export type SafeToSpend = {
  cash: number;
  openInvoices: number;
  openInstallments: number;
  available: number;
  asOf: string;
};

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
