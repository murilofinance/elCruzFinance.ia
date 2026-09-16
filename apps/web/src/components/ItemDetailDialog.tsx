import { useEffect, type ReactNode } from 'react';
import { Bank, CreditCard as CardIcon, Handshake, TrendUp, X } from '@phosphor-icons/react';
import {
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
            />
          ) : null}
          {account ? (
            <AccountDetail
              account={account}
              transactions={transactions}
              onAllocate={onAllocate}
            />
          ) : null}
          {debt ? (
            <DebtDetail
              debt={debt}
              onPay={onPay ? () => onPay({ type: 'debt', id: debt.id }) : undefined}
            />
          ) : null}
          {investment ? <InvestmentDetail investment={investment} /> : null}
        </div>
      </div>
    </div>
  );
}

function CardDetail({
  card,
  transactions,
  onPay,
}: {
  card: CreditCard;
  transactions: LedgerTransaction[];
  onPay?: () => void;
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

function AccountDetail({
  account,
  transactions,
  onAllocate,
}: {
  account: Account;
  transactions: LedgerTransaction[];
  onAllocate?: (tx: LedgerTransaction) => void;
}) {
  const related = transactions.filter((item) => item.accountId === account.id).slice(0, 12);
  return (
    <div className="grid gap-5">
      <Money
        value={account.currentBalance}
        tone={account.currentBalance < 0 ? 'negative' : 'positive'}
      />
      <p className="text-sm leading-6 break-words text-muted-fg">
        {account.institution ?? 'Conta'}
        {account.origin === 'open_finance' ? ' · Open Finance' : ''}
      </p>
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

function DebtDetail({ debt, onPay }: { debt: Debt; onPay?: () => void }) {
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

function InvestmentDetail({ investment }: { investment: Investment }) {
  return (
    <div className="grid gap-5">
      <Money value={investment.currentValue} tone="positive" />
      <p className="text-sm leading-6 break-words text-muted-fg">
        {INVESTMENT_KIND[investment.kind]}
        {investment.institution ? ` · ${investment.institution}` : ''}
        {investment.origin === 'open_finance' ? ' · Open Finance' : ''}
      </p>
    </div>
  );
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
