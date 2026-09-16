import { useEffect } from 'react';
import { X } from '@phosphor-icons/react';
import {
  formatBRL,
  type Account,
  type CreditCard,
  type Debt,
  type Investment,
  type LedgerTransaction,
} from '../lib/api';

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
}: {
  target: DetailTarget | null;
  accounts: Account[];
  cards: CreditCard[];
  debts: Debt[];
  investments: Investment[];
  transactions: LedgerTransaction[];
  onClose: () => void;
}) {
  useEffect(() => {
    if (!target) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 cursor-pointer bg-black/55"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-detail-title"
        className="relative z-10 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-[#0a0f0d] p-5 shadow-xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] tracking-[0.14em] text-muted-fg uppercase">
              {target.type === 'card'
                ? 'Cartão'
                : target.type === 'account'
                  ? 'Conta'
                  : target.type === 'investment'
                    ? 'Investimento'
                    : debt?.kind === 'bill'
                      ? 'Boleto parcelado'
                      : 'Empréstimo'}
            </p>
            <h2 id="item-detail-title" className="font-display mt-1 text-lg font-black">
              {title}
            </h2>
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

        {card ? <CardDetail card={card} transactions={transactions} /> : null}
        {account ? <AccountDetail account={account} transactions={transactions} /> : null}
        {debt ? <DebtDetail debt={debt} /> : null}
        {investment ? <InvestmentDetail investment={investment} /> : null}
      </div>
    </div>
  );
}

function CardDetail({
  card,
  transactions,
}: {
  card: CreditCard;
  transactions: LedgerTransaction[];
}) {
  const invoices = [...(card.invoices ?? [])].sort((a, b) => b.month.localeCompare(a.month));
  const related = transactions.filter((item) => item.cardId === card.id).slice(0, 8);
  return (
    <div className="mt-5 grid gap-4">
      <p className="text-sm text-muted-fg">
        Fecha dia {card.closingDay} · vence dia {card.dueDay}
        {card.creditLimit > 0 ? ` · limite ${formatBRL(card.creditLimit)}` : ''}
      </p>
      <ul className="space-y-3 border-t border-white/8 pt-4 text-sm">
        {invoices.length > 0 ? (
          invoices.map((row) => (
            <li key={row.month} className="flex items-center justify-between gap-3">
              <span>{formatMonth(row.month)}</span>
              <span className="text-destructive">{formatBRL(row.amount)}</span>
            </li>
          ))
        ) : (
          <li className="flex items-center justify-between gap-3">
            <span>Fatura atual</span>
            <span className="text-destructive">{formatBRL(card.currentInvoice)}</span>
          </li>
        )}
      </ul>
      {related.length > 0 ? (
        <div>
          <p className="text-[11px] tracking-[0.14em] text-muted-fg uppercase">Lançamentos</p>
          <ul className="mt-3 space-y-2 text-sm">
            {related.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 text-muted-fg">
                <span className="truncate">{item.description}</span>
                <span className="shrink-0">{formatBRL(item.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function AccountDetail({
  account,
  transactions,
}: {
  account: Account;
  transactions: LedgerTransaction[];
}) {
  const related = transactions.filter((item) => item.accountId === account.id).slice(0, 10);
  return (
    <div className="mt-5 grid gap-4">
      <p className="font-display text-[28px] font-black text-primary">
        {formatBRL(account.currentBalance)}
      </p>
      <p className="text-sm text-muted-fg">
        {account.institution ?? 'Conta'}
        {account.origin === 'open_finance' ? ' · Open Finance' : ''}
      </p>
      <ul className="space-y-3 border-t border-white/8 pt-4 text-sm">
        {related.length > 0 ? (
          related.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">{item.description}</span>
              <span className={item.type === 'income' ? 'text-primary' : 'text-destructive'}>
                {item.type === 'income' ? '+' : '−'}
                {formatBRL(item.amount)}
              </span>
            </li>
          ))
        ) : (
          <li className="text-muted-fg">Nenhum lançamento nesta conta ainda.</li>
        )}
      </ul>
    </div>
  );
}

function DebtDetail({ debt }: { debt: Debt }) {
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
    <div className="mt-5 grid gap-4">
      <p className="font-display text-[28px] font-black">
        {formatBRL(debt.remainingBalance)}
      </p>
      <p className="text-sm text-muted-fg">
        {bill ? 'Boleto parcelado' : 'Empréstimo'} · {count}x de{' '}
        {formatBRL(debt.installmentAmount)} · vence todo dia {debt.dueDay}
      </p>
      <ul className="space-y-3 border-t border-white/8 pt-4 text-sm">
        {schedule.map((iso, index) => (
          <li key={iso} className="flex items-center justify-between gap-3">
            <span>
              Parcela {index + 1} · {formatDay(iso)}
            </span>
            <span className="text-destructive">{formatBRL(debt.installmentAmount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InvestmentDetail({ investment }: { investment: Investment }) {
  return (
    <div className="mt-5 grid gap-4">
      <p className="font-display text-[28px] font-black text-primary">
        {formatBRL(investment.currentValue)}
      </p>
      <p className="text-sm text-muted-fg">
        {INVESTMENT_KIND[investment.kind]}
        {investment.institution ? ` · ${investment.institution}` : ''}
        {investment.origin === 'open_finance' ? ' · Open Finance' : ''}
      </p>
    </div>
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
