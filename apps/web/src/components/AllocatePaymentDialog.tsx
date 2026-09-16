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
  cardDueAmount,
  historySourceTag,
  isManualCard,
} from '../lib/labels';

export type AllocateMode =
  | { source: 'tx'; tx: LedgerTransaction }
  | { source: 'payable'; kind: 'card' | 'debt'; id: string };

type Target = {
  kind: 'card' | 'debt';
  id: string;
  name: string;
  due: number;
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
  onConfirm: (txId: string, body: { cardId?: string; debtId?: string }) => void;
}) {
  const [pickedTx, setPickedTx] = useState<string | null>(null);
  const [pickedTarget, setPickedTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!mode) {
      return;
    }
    setPickedTx(mode.source === 'tx' ? mode.tx.id : null);
    setPickedTarget(
      mode.source === 'payable' ? `${mode.kind}:${mode.id}` : null,
    );
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

  const tx =
    mode.source === 'tx'
      ? mode.tx
      : transactions.find((item) => item.id === pickedTx) ?? null;
  const targets = paymentTargets(cards, debts, tx?.amount);
  const amountHint =
    mode.source === 'payable' ? payableDue(mode, cards, debts) : tx?.amount ?? 0;
  const outflows = unmatchedOutflows(transactions, amountHint);
  const selectedTarget = targets.find((item) => `${item.kind}:${item.id}` === pickedTarget);

  function submit() {
    if (!tx || !selectedTarget) {
      return;
    }
    onConfirm(
      tx.id,
      selectedTarget.kind === 'card'
        ? { cardId: selectedTarget.id }
        : { debtId: selectedTarget.id },
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
              Declarar pagamento
            </p>
            <h2 id="allocate-title" className="mt-1 text-base font-semibold text-foreground">
              {mode.source === 'tx'
                ? 'Este Pix pagou o quê?'
                : `Qual Pix pagou ${payableName(mode, cards, debts)}?`}
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
          {mode.source === 'tx' && tx ? (
            <p className="text-sm leading-relaxed text-muted-fg">
              {tx.description} · {formatBRL(tx.amount)} em {formatDay(tx.date)}. O saldo da
              conta Open Finance já saiu; aqui só vinculamos a fatura ou a parcela.
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-muted-fg">
              Escolha a saída do Nubank (ou outro banco) que você mandou no Pix. Não cria
              lançamento novo e não desconta o saldo duas vezes.
            </p>
          )}

          {mode.source === 'payable' ? (
            <section className="mt-5">
              <h3 className="text-[11px] tracking-[0.14em] text-muted-fg uppercase">
                Saídas para vincular
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
                            <span className="block truncate text-foreground">{item.description}</span>
                            <span className="mt-0.5 block text-[11px] text-muted-fg">
                              {historySourceTag(item, accounts, cards)} · {formatDay(item.date)}
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
          ) : null}

          {mode.source === 'tx' ? (
            <section className="mt-5">
              <h3 className="text-[11px] tracking-[0.14em] text-muted-fg uppercase">
                Cartão, boleto ou empréstimo
              </h3>
              {targets.length === 0 ? (
                <p className="mt-3 text-sm text-muted-fg">
                  Cadastre um cartão ou boleto manual (sem Open Finance) para vincular.
                </p>
              ) : (
                <ul className="mt-3 grid gap-2">
                  {targets.map((item) => {
                    const key = `${item.kind}:${item.id}`;
                    const selected = pickedTarget === key;
                    const close = tx ? Math.abs(item.due - tx.amount) < 0.05 : false;
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => setPickedTarget(key)}
                          className={`flex min-h-11 w-full cursor-pointer items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            selected
                              ? 'border-secondary bg-secondary/10'
                              : 'border-white/10 hover:border-white/25'
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-foreground">{item.name}</span>
                            <span className="mt-0.5 block text-[11px] text-muted-fg">
                              {item.kind === 'card' ? 'Cartão manual' : 'Parcela'}
                              {close ? ' · valor bate' : ''}
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums text-destructive">
                            {formatBRL(item.due)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}

          {error ? (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex shrink-0 gap-2 border-t border-white/8 p-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md border border-border text-sm text-foreground transition-colors duration-200 hover:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy || !tx || !selectedTarget}
            onClick={submit}
            className="inline-flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md bg-primary text-sm text-on-primary transition-colors duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            Vincular Pix
          </button>
        </footer>
      </div>
    </div>
  );
}

function paymentTargets(cards: CreditCard[], debts: Debt[], amount?: number): Target[] {
  const items: Target[] = [
    ...cards.filter(isManualCard).map((card) => ({
      kind: 'card' as const,
      id: card.id,
      name: card.name,
      due: cardDueAmount(card),
    })),
    ...debts
      .filter((debt) => debt.remainingBalance > 0)
      .map((debt) => ({
        kind: 'debt' as const,
        id: debt.id,
        name: debt.creditor,
        due: debt.installmentAmount || debt.remainingBalance,
      })),
  ].filter((item) => item.due > 0);
  if (amount == null) {
    return items;
  }
  return items.sort(
    (a, b) => Math.abs(a.due - amount) - Math.abs(b.due - amount),
  );
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

function payableDue(
  mode: Extract<AllocateMode, { source: 'payable' }>,
  cards: CreditCard[],
  debts: Debt[],
): number {
  if (mode.kind === 'card') {
    const card = cards.find((item) => item.id === mode.id);
    return card ? cardDueAmount(card) : 0;
  }
  const debt = debts.find((item) => item.id === mode.id);
  return debt?.installmentAmount || debt?.remainingBalance || 0;
}

function payableName(
  mode: Extract<AllocateMode, { source: 'payable' }>,
  cards: CreditCard[],
  debts: Debt[],
): string {
  if (mode.kind === 'card') {
    return cards.find((item) => item.id === mode.id)?.name ?? 'este cartão';
  }
  return debts.find((item) => item.id === mode.id)?.creditor ?? 'esta parcela';
}

function formatDay(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}
