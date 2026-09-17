import { useEffect, useState } from 'react';
import { X } from '@phosphor-icons/react';
import {
  formatBRL,
  type Account,
  type CreditCard,
  type Debt,
  type LedgerTransaction,
} from '../lib/api';
import {
  canAllocatePayment,
  historySourceTag,
  isManualCard,
} from '../lib/labels';

export type AllocateMode =
  | { source: 'tx'; tx: LedgerTransaction }
  | { source: 'payable'; kind: 'card' | 'debt'; id: string };

type Installment = {
  key: string;
  kind: 'card' | 'debt';
  id: string;
  name: string;
  detail: string;
  amount: number;
  invoiceMonth?: string;
};

export function AllocatePaymentDialog({
  mode,
  accounts,
  cards,
  debts,
  transactions,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  mode: AllocateMode | null;
  accounts: Account[];
  cards: CreditCard[];
  debts: Debt[];
  transactions: LedgerTransaction[];
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (
    txId: string,
    body: { cardId?: string; debtId?: string; invoiceMonth?: string },
  ) => void;
}) {
  const [step, setStep] = useState<'installment' | 'pix'>('installment');
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [pickedTx, setPickedTx] = useState<string | null>(null);

  useEffect(() => {
    if (!mode) {
      return;
    }
    setStep('installment');
    setPickedKey(null);
    setPickedTx(mode.source === 'tx' ? mode.tx.id : null);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [mode, onClose]);

  if (!mode) {
    return null;
  }

  const installments =
    mode.source === 'payable'
      ? payableInstallments(mode, cards, debts)
      : allInstallments(cards, debts);
  const picked = installments.find((item) => item.key === pickedKey) ?? null;
  const tx =
    mode.source === 'tx'
      ? mode.tx
      : transactions.find((item) => item.id === pickedTx) ?? null;
  const outflows = unmatchedOutflows(transactions, picked?.amount ?? 0);
  const fromHistory = mode.source === 'tx';
  const showPix = !fromHistory && step === 'pix';
  const canSubmit = Boolean(tx && picked);

  function submit() {
    if (!tx || !picked) {
      return;
    }
    onConfirm(
      tx.id,
      picked.kind === 'card'
        ? { cardId: picked.id, invoiceMonth: picked.invoiceMonth }
        : { debtId: picked.id },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 cursor-pointer bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="allocate-title"
        className="relative z-10 flex max-h-[min(90dvh,720px)] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl border border-border bg-[#0a0f0d] shadow-xl"
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-white/8 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] tracking-[0.14em] text-muted-fg uppercase">
              {fromHistory || step === 'installment' ? '1 · Parcela' : '2 · Pix'}
            </p>
            <h2 id="allocate-title" className="mt-1 text-base font-semibold text-foreground">
              {showPix
                ? 'Qual Pix pagou essa parcela?'
                : fromHistory
                  ? 'Este Pix pagou qual parcela?'
                  : 'Qual fatura ou parcela você pagou?'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border text-foreground transition-colors duration-200 hover:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" weight="bold" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {fromHistory && tx ? (
            <p className="text-sm leading-relaxed text-muted-fg">
              {tx.description} · {formatBRL(tx.amount)} em {formatDay(tx.date)}. Escolha a
              fatura ou parcela correspondente.
            </p>
          ) : showPix && picked ? (
            <p className="text-sm leading-relaxed text-muted-fg">
              {picked.name} · {picked.detail} · {formatBRL(picked.amount)}. Agora escolha o
              Pix no extrato. O saldo do banco não é descontado de novo.
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-muted-fg">
              Primeiro a parcela (mês e valor). Depois o Pix que saiu da Nubank ou de outro
              banco.
            </p>
          )}

          {!showPix ? (
            <section className="mt-5">
              <h3 className="text-[11px] tracking-[0.14em] text-muted-fg uppercase">
                Faturas e parcelas
              </h3>
              {installments.length === 0 ? (
                <p className="mt-3 text-sm text-muted-fg">
                  Não há fatura ou parcela em aberto neste item.
                </p>
              ) : (
                <ul className="mt-3 grid gap-2">
                  {installments.map((item) => {
                    const selected = pickedKey === item.key;
                    const close =
                      tx && Math.abs(item.amount - tx.amount) < 0.05;
                    return (
                      <li key={item.key}>
                        <button
                          type="button"
                          onClick={() => setPickedKey(item.key)}
                          className={`flex min-h-11 w-full cursor-pointer items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            selected
                              ? 'border-secondary bg-secondary/10'
                              : 'border-white/10 hover:border-white/25'
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-foreground">{item.name}</span>
                            <span className="mt-0.5 block text-[11px] text-muted-fg">
                              {item.detail}
                              {close ? ' · valor bate com o Pix' : ''}
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums text-destructive">
                            {formatBRL(item.amount)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : (
            <section className="mt-5">
              <h3 className="text-[11px] tracking-[0.14em] text-muted-fg uppercase">
                Pix no extrato
              </h3>
              {outflows.length === 0 ? (
                <p className="mt-3 text-sm text-muted-fg">
                  Nenhuma saída livre no extrato. Sincronize o Open Finance depois do Pix e
                  tente de novo.
                </p>
              ) : (
                <ul className="mt-3 grid gap-2">
                  {outflows.map((item) => {
                    const selected = pickedTx === item.id;
                    const close = picked
                      ? Math.abs(item.amount - picked.amount) < 0.05
                      : false;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setPickedTx(item.id)}
                          className={`flex min-h-11 w-full cursor-pointer items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            selected
                              ? 'border-secondary bg-secondary/10'
                              : 'border-white/10 hover:border-white/25'
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-foreground">
                              {item.description}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-muted-fg">
                              {historySourceTag(item, accounts, cards)} · {formatDay(item.date)}
                              {close ? ' · valor bate' : ''}
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums text-destructive">
                            {formatBRL(item.amount)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {error ? (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex shrink-0 gap-2 border-t border-white/8 p-4">
          {showPix ? (
            <button
              type="button"
              onClick={() => {
                setStep('installment');
                setPickedTx(null);
              }}
              className="inline-flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md border border-border text-sm text-foreground transition-colors duration-200 hover:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Voltar
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md border border-border text-sm text-foreground transition-colors duration-200 hover:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancelar
            </button>
          )}
          {!fromHistory && step === 'installment' ? (
            <button
              type="button"
              disabled={!picked}
              onClick={() => setStep('pix')}
              className="inline-flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md bg-primary text-sm text-on-primary transition-colors duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              Escolher Pix
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || !canSubmit}
              onClick={submit}
              className="inline-flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md bg-primary text-sm text-on-primary transition-colors duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              Vincular Pix
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function payableInstallments(
  mode: Extract<AllocateMode, { source: 'payable' }>,
  cards: CreditCard[],
  debts: Debt[],
): Installment[] {
  if (mode.kind === 'card') {
    const card = cards.find((item) => item.id === mode.id);
    return card ? cardInstallments(card) : [];
  }
  const debt = debts.find((item) => item.id === mode.id);
  return debt ? debtInstallments(debt) : [];
}

function allInstallments(cards: CreditCard[], debts: Debt[]): Installment[] {
  return [
    ...cards.filter(isManualCard).flatMap(cardInstallments),
    ...debts.flatMap(debtInstallments),
  ];
}

function cardInstallments(card: CreditCard): Installment[] {
  const rows = [...(card.invoices ?? [])]
    .filter((item) => item.amount > 0.009)
    .sort((a, b) => a.month.localeCompare(b.month));
  const list =
    rows.length > 0
      ? rows
      : card.currentInvoice > 0.009
        ? [{ month: currentMonthValue(), amount: card.currentInvoice }]
        : [];
  return list.map((row) => ({
    key: `card:${card.id}:${row.month}`,
    kind: 'card' as const,
    id: card.id,
    name: card.name,
    detail: `Fatura ${formatMonth(row.month)}`,
    amount: row.amount,
    invoiceMonth: row.month,
  }));
}

function debtInstallments(debt: Debt): Installment[] {
  if (debt.remainingBalance <= 0 && debt.installmentAmount <= 0) {
    return [];
  }
  const amount = debt.installmentAmount || debt.remainingBalance;
  const count = Math.max(
    1,
    debt.installmentAmount > 0
      ? Math.ceil(debt.remainingBalance / debt.installmentAmount)
      : 1,
  );
  return upcomingDues(debt.dueDay || 10, Math.min(count, 12)).map((iso, index) => ({
    key: `debt:${debt.id}:${iso}`,
    kind: 'debt' as const,
    id: debt.id,
    name: debt.creditor,
    detail: `Parcela ${index + 1} · vence ${formatDay(iso)}`,
    amount,
  }));
}

function unmatchedOutflows(
  transactions: LedgerTransaction[],
  amount: number,
): LedgerTransaction[] {
  return transactions
    .filter(canAllocatePayment)
    .sort((a, b) => Math.abs(a.amount - amount) - Math.abs(b.amount - amount))
    .slice(0, 12);
}

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(value: string): string {
  const [year, month] = value.split('-');
  return `${month}/${year}`;
}

function formatDay(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

function upcomingDues(dueDay: number, count: number): string[] {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const dates: string[] = [];
  let cursor = today;
  for (let i = 0; i < count; i += 1) {
    const next = nextDue(dueDay, cursor);
    dates.push(next);
    const [year, month, day] = next.split('-').map(Number);
    const date = new Date(year, month - 1, day + 1);
    cursor = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  return dates;
}

function nextDue(dueDay: number, today: string): string {
  const [year, month] = today.split('-').map(Number);
  const dim = (y: number, m: number) => new Date(y, m, 0).getDate();
  const thisMonth = `${year}-${String(month).padStart(2, '0')}-${String(Math.min(dueDay, dim(year, month))).padStart(2, '0')}`;
  if (thisMonth >= today) {
    return thisMonth;
  }
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(Math.min(dueDay, dim(nextYear, nextMonth))).padStart(2, '0')}`;
}
