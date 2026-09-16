import { FormEvent, useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from '@phosphor-icons/react';
import type { Account, CreditCard, Debt } from '../lib/api';

export type AddTab = 'conta' | 'cartao' | 'emprestimo' | 'lancamento';

const fieldClass =
  'h-12 w-full rounded-md border border-border bg-black/40 px-3 text-foreground outline-none ring-ring transition-colors duration-200 focus-visible:ring-2';

type AddItemDialogProps = {
  open: boolean;
  tab: AddTab;
  busy: boolean;
  error: string | null;
  today: string;
  accounts: Account[];
  cards: CreditCard[];
  debts: Debt[];
  onTab: (tab: AddTab) => void;
  onClose: () => void;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
    path: string,
    body: Record<string, unknown>,
  ) => void;
};

export function AddItemDialog({
  open,
  tab,
  busy,
  error,
  today,
  accounts,
  cards,
  debts,
  onTab,
  onClose,
  onSubmit,
}: AddItemDialogProps) {
  const titleId = useId();
  const tabsId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      'form input, form select',
    );
    focusable?.focus();
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, tab, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 cursor-pointer bg-black/55"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-[#0a0f0d] p-5 shadow-xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="font-display text-lg font-black">
              Adicionar
            </h2>
            <p className="mt-1 text-sm text-muted-fg">
              Conta, cartão, empréstimo ou lançamento.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-md border border-border transition-colors duration-200 hover:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" weight="bold" aria-hidden />
            <span className="sr-only">Fechar</span>
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Tipo de cadastro"
          className="mt-5 flex flex-wrap gap-2"
        >
          {(
            [
              ['conta', 'Conta'],
              ['cartao', 'Cartão'],
              ['emprestimo', 'Empréstimo'],
              ['lancamento', 'Lançamento'],
            ] as const
          ).map(([id, label]) => {
            const selected = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${tabsId}-${id}`}
                id={`${tabsId}-tab-${id}`}
                onClick={() => onTab(id)}
                className={`h-11 cursor-pointer rounded-md border px-4 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selected
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-border hover:border-secondary'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="mt-5">
          {tab === 'conta' ? (
            <form
              id={`${tabsId}-conta`}
              role="tabpanel"
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                const data = new FormData(event.currentTarget);
                onSubmit(event, '/accounts', {
                  name: String(data.get('name')),
                  institution: String(data.get('institution')) || undefined,
                  kind: String(data.get('kind')),
                  currentBalance: Number(data.get('currentBalance')),
                });
              }}
            >
              <Field label="Nome">
                <input name="name" required minLength={2} className={fieldClass} />
              </Field>
              <Field label="Banco / instituição">
                <input name="institution" className={fieldClass} placeholder="Nubank" />
              </Field>
              <Field label="Tipo">
                <select name="kind" className={fieldClass} defaultValue="checking">
                  <option value="checking">Corrente</option>
                  <option value="savings">Poupança</option>
                  <option value="wallet">Carteira</option>
                </select>
              </Field>
              <Field label="Saldo atual">
                <input
                  name="currentBalance"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  defaultValue={0}
                  className={fieldClass}
                />
              </Field>
              <div className="sm:col-span-2">
                <Submit busy={busy} label="Salvar conta" />
              </div>
            </form>
          ) : null}

          {tab === 'cartao' ? (
            <form
              id={`${tabsId}-cartao`}
              role="tabpanel"
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                const data = new FormData(event.currentTarget);
                onSubmit(event, '/cards', {
                  name: String(data.get('name')),
                  institution: String(data.get('institution')) || undefined,
                  creditLimit: Number(data.get('creditLimit')),
                  closingDay: Number(data.get('closingDay')),
                  dueDay: Number(data.get('dueDay')),
                  currentInvoice: Number(data.get('currentInvoice') || 0),
                });
              }}
            >
              <Field label="Nome">
                <input name="name" required minLength={2} className={fieldClass} />
              </Field>
              <Field label="Bandeira / banco">
                <input name="institution" className={fieldClass} />
              </Field>
              <Field label="Limite">
                <input
                  name="creditLimit"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  className={fieldClass}
                />
              </Field>
              <Field label="Fatura aberta">
                <input
                  name="currentInvoice"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={0}
                  className={fieldClass}
                />
              </Field>
              <Field label="Fecha dia">
                <input
                  name="closingDay"
                  type="number"
                  min={1}
                  max={31}
                  required
                  className={fieldClass}
                />
              </Field>
              <Field label="Vence dia">
                <input
                  name="dueDay"
                  type="number"
                  min={1}
                  max={31}
                  required
                  className={fieldClass}
                />
              </Field>
              <div className="sm:col-span-2">
                <Submit busy={busy} label="Salvar cartão" />
              </div>
            </form>
          ) : null}

          {tab === 'emprestimo' ? (
            <form
              id={`${tabsId}-emprestimo`}
              role="tabpanel"
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                const data = new FormData(event.currentTarget);
                onSubmit(event, '/debts', {
                  creditor: String(data.get('creditor')),
                  remainingBalance: Number(data.get('remainingBalance')),
                  installmentAmount: Number(data.get('installmentAmount')),
                  dueDay: Number(data.get('dueDay')),
                });
              }}
            >
              <Field label="Credor">
                <input name="creditor" required minLength={2} className={fieldClass} />
              </Field>
              <Field label="Saldo devedor">
                <input
                  name="remainingBalance"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  className={fieldClass}
                />
              </Field>
              <Field label="Parcela">
                <input
                  name="installmentAmount"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  className={fieldClass}
                />
              </Field>
              <Field label="Vence dia">
                <input
                  name="dueDay"
                  type="number"
                  min={1}
                  max={31}
                  required
                  className={fieldClass}
                />
              </Field>
              <div className="sm:col-span-2">
                <Submit busy={busy} label="Salvar empréstimo" />
              </div>
            </form>
          ) : null}

          {tab === 'lancamento' ? (
            <form
              id={`${tabsId}-lancamento`}
              role="tabpanel"
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                const data = new FormData(event.currentTarget);
                const lane = String(data.get('lane'));
                const type =
                  lane === 'account_expense' || lane === 'card_expense'
                    ? 'expense'
                    : lane;
                onSubmit(event, '/transactions', {
                  type,
                  amount: Number(data.get('amount')),
                  date: String(data.get('date')),
                  description: String(data.get('description')),
                  accountId:
                    lane === 'card_expense'
                      ? undefined
                      : String(data.get('accountId')) || undefined,
                  cardId:
                    lane === 'account_expense' || lane === 'income'
                      ? undefined
                      : String(data.get('cardId')) || undefined,
                  debtId:
                    lane === 'debt_payment'
                      ? String(data.get('debtId')) || undefined
                      : undefined,
                });
              }}
            >
              <Field label="Tipo">
                <select name="lane" className={fieldClass} defaultValue="account_expense">
                  <option value="income">Entrada na conta</option>
                  <option value="account_expense">Saída na conta / Pix</option>
                  <option value="card_expense">Compra no cartão</option>
                  <option value="card_payment">Pagar fatura</option>
                  <option value="debt_payment">Pagar parcela</option>
                </select>
              </Field>
              <Field label="Conta">
                <select name="accountId" className={fieldClass} defaultValue="">
                  <option value="">—</option>
                  {accounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cartão">
                <select name="cardId" className={fieldClass} defaultValue="">
                  <option value="">—</option>
                  {cards.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Empréstimo">
                <select name="debtId" className={fieldClass} defaultValue="">
                  <option value="">—</option>
                  {debts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.creditor}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Descrição">
                <input name="description" required minLength={2} className={fieldClass} />
              </Field>
              <Field label="Valor">
                <input
                  name="amount"
                  type="number"
                  min={0.01}
                  step="0.01"
                  required
                  className={fieldClass}
                />
              </Field>
              <Field label="Data">
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={today}
                  className={fieldClass}
                />
              </Field>
              <div className="sm:col-span-2">
                <Submit busy={busy} label="Lançar" />
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm">
      {label}
      {children}
    </label>
  );
}

function Submit({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex h-12 w-full cursor-pointer items-center justify-center rounded-md bg-primary font-display text-sm font-bold tracking-wide text-on-primary uppercase transition-colors duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? 'Salvando…' : label}
    </button>
  );
}
