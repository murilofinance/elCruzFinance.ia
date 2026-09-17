import { useEffect, useState, type ReactNode } from 'react';
import { Bank, CreditCard as CardIcon, Handshake, Plus, TrendUp, X } from '@phosphor-icons/react';
import {
  apiFetch,
  formatBRL,
  type Account,
  type CreditCard,
  type Debt,
  type Investment,
  type LedgerTransaction,
} from '../lib/api';
import { canAllocatePayment } from '../lib/labels';

export type DetailTarget =
  | { type: 'account'; id: string }
  | { type: 'card'; id: string }
  | { type: 'debt'; id: string }
  | { type: 'investment'; id: string };

const INVESTMENT_KIND: Record<Investment['kind'], string> = {
  fixed: 'Renda fixa',
  funds: 'Fundos',
  stocks: 'Ações',
  crypto: 'Cripto',
  other: 'Outro',
};

export function ItemDetailDialog({
  target,
  accounts,
  cards,
  debts,
  investments,
  transactions,
  onClose,
  onPay,
  onAllocate,
  onSaved,
}: {
  target: DetailTarget | null;
  accounts: Account[];
  cards: CreditCard[];
  debts: Debt[];
  investments: Investment[];
  transactions: LedgerTransaction[];
  onClose: () => void;
  onPay?: (target: { type: 'card' | 'debt'; id: string }) => void;
  onAllocate?: (tx: LedgerTransaction) => void;
  onSaved?: () => Promise<void> | void;
}) {
  useEffect(() => {
    if (!target) {
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
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [target, onClose]);

  if (!target) {
    return null;
  }

  const account = target.type === 'account' ? accounts.find((row) => row.id === target.id) : null;
  const card = target.type === 'card' ? cards.find((row) => row.id === target.id) : null;
  const debt = target.type === 'debt' ? debts.find((row) => row.id === target.id) : null;
  const investment =
    target.type === 'investment' ? investments.find((row) => row.id === target.id) : null;
  const title =
    account?.name ??
    card?.name ??
    debt?.creditor ??
    investment?.name ??
    'Detalhe';
  const kindLabel =
    target.type === 'card'
      ? 'Cartão'
      : target.type === 'account'
        ? 'Conta'
        : target.type === 'investment'
          ? 'Investimento'
          : debt?.kind === 'bill'
            ? 'Boleto parcelado'
            : 'Empréstimo';
  const Icon =
    target.type === 'card'
      ? CardIcon
      : target.type === 'investment'
        ? TrendUp
        : target.type === 'debt'
          ? Handshake
          : Bank;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Fechar detalhe"
        className="absolute inset-0 cursor-pointer bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-detail-title"
        className="relative z-10 flex max-h-[min(90dvh,720px)] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl border border-border bg-[#0a0f0d] shadow-xl"
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-white/8 px-5 py-4">
          <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 text-secondary">
            <Icon className="h-5 w-5" weight="bold" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] tracking-[0.14em] text-muted-fg uppercase">{kindLabel}</p>
            <h2
              id="item-detail-title"
              className="mt-1 break-words text-base font-semibold leading-snug text-foreground"
            >
              {title}
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

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-5">
          {card ? (
            <CardDetail
              card={card}
              transactions={transactions}
              onPay={
                onPay && card.origin !== 'open_finance'
                  ? () => onPay({ type: 'card', id: card.id })
                  : undefined
              }
              onSaved={onSaved}
            />
          ) : null}
          {account ? (
            <AccountDetail
              account={account}
              transactions={transactions}
              onAllocate={onAllocate}
              onSaved={onSaved}
            />
          ) : null}
          {debt ? (
            <DebtDetail
              debt={debt}
              onPay={onPay ? () => onPay({ type: 'debt', id: debt.id }) : undefined}
              onSaved={onSaved}
            />
          ) : null}
          {investment ? (
            <InvestmentDetail investment={investment} onSaved={onSaved} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CardDetail({
  card,
  transactions,
  onPay,
  onSaved,
}: {
  card: CreditCard;
  transactions: LedgerTransaction[];
  onPay?: () => void;
  onSaved?: () => Promise<void> | void;
}) {
  const invoices = [...(card.invoices ?? [])].sort((a, b) => b.month.localeCompare(a.month));
  const related = transactions.filter((item) => item.cardId === card.id).slice(0, 12);
  const manual = card.origin !== 'open_finance';
  return (
    <div className="grid gap-5">
      <Money
        value={
          invoices.find((row) => row.amount > 0.009)?.amount ?? card.currentInvoice
        }
        tone="negative"
      />
      <p className="text-sm leading-6 text-muted-fg">
        Fecha dia {card.closingDay} · vence dia {card.dueDay}
        {card.creditLimit > 0 ? ` · limite ${formatBRL(card.creditLimit)}` : ''}
        {manual ? ' · manual' : ' · Open Finance'}
      </p>
      {manual && onPay ? (
        <button
          type="button"
          onClick={onPay}
          className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-md bg-primary text-sm text-on-primary transition-colors duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Pagar com Pix do extrato
        </button>
      ) : null}
      {manual ? (
        <CardEditor key={card.id} card={card} onSaved={onSaved} />
      ) : (
        <Section title="Faturas">
          {invoices.filter((row) => row.amount > 0.009).length > 0 ? (
            invoices
              .filter((row) => row.amount > 0.009)
              .map((row) => (
                <Row key={row.month} label={formatMonth(row.month)} amount={row.amount} tone="negative" />
              ))
          ) : (
            <Row label="Fatura atual" amount={card.currentInvoice} tone="negative" />
          )}
        </Section>
      )}
      {related.length > 0 ? (
        <Section title="Lançamentos">
          {related.map((item) => (
            <Row
              key={item.id}
              label={item.description}
              amount={item.amount}
              tone={item.type === 'income' ? 'positive' : 'negative'}
              signed
              income={item.type === 'income'}
            />
          ))}
        </Section>
      ) : null}
    </div>
  );
}

function CardEditor({
  card,
  onSaved,
}: {
  card: CreditCard;
  onSaved?: () => Promise<void> | void;
}) {
  const [rows, setRows] = useState(
    () =>
      (card.invoices?.length
        ? card.invoices
        : [{ month: currentMonthValue(), amount: card.currentInvoice }]
      ).map((item) => ({ month: item.month, amount: String(item.amount) })),
  );
  const [dueDay, setDueDay] = useState(String(card.dueDay));
  const [closingDay, setClosingDay] = useState(String(card.closingDay));
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submitPatch(
          `/cards/${card.id}`,
          {
            dueDay: Number(dueDay),
            closingDay: Number(closingDay),
            invoices: rows.map((item) => ({
              month: item.month,
              amount: Number(item.amount || 0),
            })),
          },
          onSaved,
          setError,
        );
      }}
    >
      <h3 className="text-[11px] tracking-[0.14em] text-muted-fg uppercase">
        Editar faturas
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha dia">
          <input
            type="number"
            min={1}
            max={31}
            value={closingDay}
            onChange={(event) => setClosingDay(event.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="Vence dia">
          <input
            type="number"
            min={1}
            max={31}
            value={dueDay}
            onChange={(event) => setDueDay(event.target.value)}
            className={fieldClass}
          />
        </Field>
      </div>
      {rows.map((row, index) => (
        <div key={`${row.month}-${index}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
          <Field label="Mês">
            <input
              type="month"
              value={row.month}
              onChange={(event) =>
                setRows((list) =>
                  list.map((item, i) =>
                    i === index ? { ...item, month: event.target.value } : item,
                  ),
                )
              }
              className={fieldClass}
              required
            />
          </Field>
          <Field label="Valor">
            <input
              type="number"
              min={0}
              step="0.01"
              value={row.amount}
              onChange={(event) =>
                setRows((list) =>
                  list.map((item, i) =>
                    i === index ? { ...item, amount: event.target.value } : item,
                  ),
                )
              }
              className={fieldClass}
              required
            />
          </Field>
          <button
            type="button"
            aria-label="Remover fatura"
            onClick={() => setRows((list) => list.filter((_, i) => i !== index))}
            className="inline-flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/10 text-muted-fg transition-colors duration-200 hover:border-destructive hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" weight="bold" aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setRows((list) => [
            ...list,
            { month: currentMonthValue(), amount: '0' },
          ])
        }
        className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-white/10 text-sm text-muted-fg transition-colors duration-200 hover:border-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="h-4 w-4" weight="bold" aria-hidden />
        Adicionar mês
      </button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <SaveButton />
    </form>
  );
}

function AccountDetail({
  account,
  transactions,
  onAllocate,
  onSaved,
}: {
  account: Account;
  transactions: LedgerTransaction[];
  onAllocate?: (tx: LedgerTransaction) => void;
  onSaved?: () => Promise<void> | void;
}) {
  const related = transactions.filter((item) => item.accountId === account.id).slice(0, 12);
  const manual = account.origin !== 'open_finance';
  return (
    <div className="grid gap-5">
      <Money
        value={account.currentBalance}
        tone={account.currentBalance < 0 ? 'negative' : 'positive'}
      />
      <p className="text-sm leading-6 break-words text-muted-fg">
        {account.institution ?? 'Conta'}
        {manual ? ' · manual' : ' · Open Finance'}
      </p>
      {manual ? <AccountEditor key={account.id} account={account} onSaved={onSaved} /> : null}
      <Section title="Lançamentos">
        {related.length > 0 ? (
          related.map((item) => {
            const allocable = Boolean(onAllocate) && canAllocatePayment(item);
            return (
              <Row
                key={item.id}
                label={item.description}
                amount={item.amount}
                tone={item.type === 'income' ? 'positive' : 'negative'}
                signed
                income={item.type === 'income'}
                onClick={allocable ? () => onAllocate?.(item) : undefined}
              />
            );
          })
        ) : (
          <p className="text-sm text-muted-fg">Nenhum lançamento nesta conta ainda.</p>
        )}
      </Section>
    </div>
  );
}

function AccountEditor({
  account,
  onSaved,
}: {
  account: Account;
  onSaved?: () => Promise<void> | void;
}) {
  const [balance, setBalance] = useState(String(account.currentBalance));
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submitPatch(
          `/accounts/${account.id}`,
          { currentBalance: Number(balance) },
          onSaved,
          setError,
        );
      }}
    >
      <h3 className="text-[11px] tracking-[0.14em] text-muted-fg uppercase">Editar saldo</h3>
      <Field label="Saldo atual">
        <input
          type="number"
          step="0.01"
          value={balance}
          onChange={(event) => setBalance(event.target.value)}
          className={fieldClass}
          required
        />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <SaveButton />
    </form>
  );
}

function DebtDetail({
  debt,
  onPay,
  onSaved,
}: {
  debt: Debt;
  onPay?: () => void;
  onSaved?: () => Promise<void> | void;
}) {
  const count = Math.max(
    1,
    debt.installmentCount ??
      (debt.installmentAmount > 0
        ? Math.ceil(debt.remainingBalance / debt.installmentAmount)
        : 1),
  );
  const remaining = Math.max(
    1,
    debt.installmentAmount > 0
      ? Math.ceil(debt.remainingBalance / debt.installmentAmount)
      : count,
  );
  const schedule = upcomingDues(debt.dueDay || 10, remaining);
  const bill = debt.kind === 'bill';
  return (
    <div className="grid gap-5">
      <Money value={debt.remainingBalance} tone="neutral" />
      <p className="text-sm leading-6 text-muted-fg">
        {bill ? 'Boleto parcelado' : 'Empréstimo'} · {count}x de{' '}
        {formatBRL(debt.installmentAmount)} · vence todo dia {debt.dueDay}
      </p>
      {onPay ? (
        <button
          type="button"
          onClick={onPay}
          className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-md bg-primary text-sm text-on-primary transition-colors duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Pagar com Pix do extrato
        </button>
      ) : null}
      <DebtEditor key={debt.id} debt={debt} onSaved={onSaved} />
      <Section title="Parcelas">
        {schedule.map((iso, index) => (
          <Row
            key={iso}
            label={`Parcela ${index + 1} · ${formatDay(iso)}`}
            amount={debt.installmentAmount}
            tone="negative"
          />
        ))}
      </Section>
    </div>
  );
}

function DebtEditor({
  debt,
  onSaved,
}: {
  debt: Debt;
  onSaved?: () => Promise<void> | void;
}) {
  const [remaining, setRemaining] = useState(String(debt.remainingBalance));
  const [installment, setInstallment] = useState(String(debt.installmentAmount));
  const [dueDay, setDueDay] = useState(String(debt.dueDay));
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submitPatch(
          `/debts/${debt.id}`,
          {
            remainingBalance: Number(remaining),
            installmentAmount: Number(installment),
            dueDay: Number(dueDay),
          },
          onSaved,
          setError,
        );
      }}
    >
      <h3 className="text-[11px] tracking-[0.14em] text-muted-fg uppercase">
        Editar valor e vencimento
      </h3>
      <Field label="Saldo restante">
        <input
          type="number"
          min={0}
          step="0.01"
          value={remaining}
          onChange={(event) => setRemaining(event.target.value)}
          className={fieldClass}
          required
        />
      </Field>
      <Field label="Valor da parcela">
        <input
          type="number"
          min={0}
          step="0.01"
          value={installment}
          onChange={(event) => setInstallment(event.target.value)}
          className={fieldClass}
          required
        />
      </Field>
      <Field label="Vence todo dia">
        <input
          type="number"
          min={1}
          max={31}
          value={dueDay}
          onChange={(event) => setDueDay(event.target.value)}
          className={fieldClass}
          required
        />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <SaveButton />
    </form>
  );
}

function InvestmentDetail({
  investment,
  onSaved,
}: {
  investment: Investment;
  onSaved?: () => Promise<void> | void;
}) {
  const manual = investment.origin !== 'open_finance';
  return (
    <div className="grid gap-5">
      <Money value={investment.currentValue} tone="positive" />
      <p className="text-sm leading-6 break-words text-muted-fg">
        {INVESTMENT_KIND[investment.kind]}
        {investment.institution ? ` · ${investment.institution}` : ''}
        {manual ? ' · manual' : ' · Open Finance'}
      </p>
      {manual ? (
        <InvestmentEditor key={investment.id} investment={investment} onSaved={onSaved} />
      ) : null}
    </div>
  );
}

function InvestmentEditor({
  investment,
  onSaved,
}: {
  investment: Investment;
  onSaved?: () => Promise<void> | void;
}) {
  const [value, setValue] = useState(String(investment.currentValue));
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submitPatch(
          `/investments/${investment.id}`,
          { currentValue: Number(value) },
          onSaved,
          setError,
        );
      }}
    >
      <h3 className="text-[11px] tracking-[0.14em] text-muted-fg uppercase">Editar valor</h3>
      <Field label="Valor atual">
        <input
          type="number"
          min={0}
          step="0.01"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className={fieldClass}
          required
        />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <SaveButton />
    </form>
  );
}

const fieldClass =
  'h-12 w-full rounded-md border border-border bg-black/40 px-3 text-sm text-foreground outline-none ring-ring focus-visible:ring-2';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs text-muted-fg">
      {label}
      {children}
    </label>
  );
}

function SaveButton() {
  return (
    <button
      type="submit"
      className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-md bg-primary text-sm text-on-primary transition-colors duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      Salvar alterações
    </button>
  );
}

async function submitPatch(
  path: string,
  body: Record<string, unknown>,
  onSaved: (() => Promise<void> | void) | undefined,
  setError: (message: string | null) => void,
) {
  setError(null);
  try {
    await apiFetch(path, { method: 'PATCH', body });
    await onSaved?.();
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
  }
}

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="text-[11px] tracking-[0.14em] text-muted-fg uppercase">{title}</h3>
      <ul className="mt-3 divide-y divide-white/8 border-t border-white/8">{children}</ul>
    </section>
  );
}

function Row({
  label,
  amount,
  tone,
  signed,
  income,
  onClick,
}: {
  label: string;
  amount: number;
  tone: 'positive' | 'negative' | 'neutral';
  signed?: boolean;
  income?: boolean;
  onClick?: () => void;
}) {
  const color =
    tone === 'positive'
      ? 'text-primary'
      : tone === 'negative'
        ? 'text-destructive'
        : 'text-foreground';
  const inner = (
    <>
      <span className="min-w-0 break-words leading-5 text-foreground">{label}</span>
      <span className={`shrink-0 whitespace-nowrap tabular-nums ${color}`}>
        {signed ? (income ? '+' : '−') : null}
        {formatBRL(amount)}
      </span>
    </>
  );
  if (onClick) {
    return (
      <li>
        <button
          type="button"
          onClick={onClick}
          className="grid min-h-11 w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-3 text-left text-sm transition-colors duration-200 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {inner}
        </button>
      </li>
    );
  }
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-3 text-sm">
      {inner}
    </li>
  );
}

function Money({
  value,
  tone,
}: {
  value: number;
  tone: 'positive' | 'negative' | 'neutral';
}) {
  const color =
    tone === 'positive'
      ? 'text-primary'
      : tone === 'negative'
        ? 'text-destructive'
        : 'text-foreground';
  return (
    <p className={`text-[28px] font-semibold leading-none tracking-tight tabular-nums ${color}`}>
      {formatBRL(value)}
    </p>
  );
}

function formatMonth(value: string): string {
  const [year, month] = value.split('-');
  return `${month}/${year}`;
}

function formatDay(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
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
  for (let i = 0; i < Math.min(count, 12); i += 1) {
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
