import { FormEvent, useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ArrowsClockwise,
  Bank,
  ChartLineUp,
  CreditCard as CardIcon,
  Handshake,
  Plus,
  SignOut,
} from '@phosphor-icons/react';
import { AddItemDialog, type AddTab } from '../components/AddItemDialog';
import { BalanceChart } from '../components/BalanceChart';
import { FinanceChat } from '../components/FinanceChat';
import { ItemDetailDialog, type DetailTarget } from '../components/ItemDetailDialog';
import { ProjectionsPanel } from '../components/ProjectionsPanel';
import { useAuth } from '../auth/AuthProvider';
import {
  apiFetch,
  formatBRL,
  type Account,
  type CreditCard,
  type Debt,
  type Investment,
  type LedgerTransaction,
  type PluggyConnectResult,
  type PluggyConnection,
  type ProjectionBoard,
  type SafeToSpend,
} from '../lib/api';
import { historySourceTag } from '../lib/labels';

const ZERO_SAFE: SafeToSpend = {
  cash: 0,
  openInvoices: 0,
  openInstallments: 0,
  available: 0,
  asOf: new Date().toISOString(),
};

const EMPTY_PROJECTIONS: ProjectionBoard = {
  asOf: new Date().toISOString().slice(0, 10),
  totalDue: 0,
  items: [],
  headline: 'Nenhum vencimento de fatura ou parcela à vista.',
};

export function HomePage() {
  const { logout } = useAuth();
  const [tab, setTab] = useState<AddTab>('conta');
  const [addOpen, setAddOpen] = useState(false);
  const [safe, setSafe] = useState<SafeToSpend>(ZERO_SAFE);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [connections, setConnections] = useState<PluggyConnection[]>([]);
  const [projections, setProjections] = useState<ProjectionBoard>(EMPTY_PROJECTIONS);
  const [detail, setDetail] = useState<DetailTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [apiDown, setApiDown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const [
      nextSafe,
      nextAccounts,
      nextCards,
      nextDebts,
      nextInvestments,
      nextTx,
      nextConnections,
      nextProj,
    ] =
      await Promise.all([
        loadOr('/safe-to-spend', ZERO_SAFE),
        loadOr<Account[]>('/accounts', []),
        loadOr<CreditCard[]>('/cards', []),
        loadOr<Debt[]>('/debts', []),
        loadOr<Investment[]>('/investments', []),
        loadOr<LedgerTransaction[]>('/transactions', []),
        loadOr<PluggyConnection[]>('/connections', []),
        loadOr<ProjectionBoard>('/ai/projections', EMPTY_PROJECTIONS),
      ]);
    setSafe(nextSafe);
    setAccounts(nextAccounts);
    setCards(nextCards);
    setDebts(nextDebts);
    setInvestments(nextInvestments);
    setTransactions(nextTx);
    setConnections(nextConnections);
    setProjections(nextProj);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void apiFetch('/me')
      .then(() => {
        if (!cancelled) {
          setApiDown(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApiDown(true);
        }
      })
      .then(() => reload())
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  async function syncPluggy() {
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<PluggyConnectResult>('/connections/sync', {
        method: 'POST',
        body: {},
      });
      setNotice(
        `${result.connectorName}: ${result.accounts} conta(s), ${result.cards} cartão(ões), ${result.investments ?? 0} investimento(s) e ${result.transactions ?? 0} transação(ões).`,
      );
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível sincronizar');
    } finally {
      setBusy(false);
    }
  }

  function openAdd(next: AddTab = 'conta') {
    setTab(next);
    setError(null);
    setAddOpen(true);
  }

  async function onSubmit(
    event: FormEvent<HTMLFormElement>,
    path: string,
    body: Record<string, unknown>,
  ) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<PluggyConnectResult>(path, {
        method: 'POST',
        body,
      });
      setAddOpen(false);
      if (path === '/connections') {
        setNotice(
          `${result.connectorName}: ${result.accounts} conta(s), ${result.cards} cartão(ões), ${result.investments ?? 0} investimento(s) e ${result.transactions ?? 0} transação(ões).`,
        );
      } else {
        setNotice('Item adicionado.');
      }
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar');
    } finally {
      setBusy(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const cash = accounts.reduce((sum, item) => sum + item.currentBalance, 0);
  const invoices = cards.reduce((sum, item) => {
    const billed =
      item.invoices?.find((row) => row.month === month)?.amount ?? item.currentInvoice;
    return sum + billed;
  }, 0);
  const owed = debts.reduce((sum, item) => sum + item.remainingBalance, 0);
  const invested = investments.reduce((sum, item) => sum + item.currentValue, 0);
  const hasRealData =
    accounts.length > 0 ||
    cards.length > 0 ||
    debts.length > 0 ||
    investments.length > 0;
  const invoicedWithLimit = cards.filter((item) => item.creditLimit > 0);
  const cardLimit = invoicedWithLimit.reduce((sum, item) => sum + item.creditLimit, 0);
  const usedOnLimit = invoicedWithLimit.reduce((sum, item) => {
    const billed =
      item.invoices?.find((row) => row.month === month)?.amount ?? item.currentInvoice;
    return sum + billed;
  }, 0);
  const usedPct =
    cardLimit > 0 ? Math.min(100, Math.round((usedOnLimit / cardLimit) * 100)) : 0;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-5 sm:px-8">
          <img
            src="/brand/mark.png"
            alt="ElCruz Finance"
            width={28}
            height={28}
            className="h-7 w-7 rounded-md"
          />
          <nav aria-label="Principal" className="flex h-14 items-center">
            <span className="flex h-14 items-center border-b-2 border-primary px-1 text-sm font-medium text-primary">
              Overview
            </span>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {connections.length > 0 ? (
              <button
                type="button"
                onClick={() => void syncPluggy()}
                disabled={busy}
                className="inline-flex h-11 min-w-11 cursor-pointer items-center gap-2 rounded-md border border-white/10 px-4 text-sm font-medium transition-colors duration-200 hover:border-secondary hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowsClockwise className="h-4 w-4" weight="bold" aria-hidden />
                {busy ? 'Sincronizando…' : 'Sincronizar'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => openAdd('conta')}
              className="inline-flex h-11 min-w-11 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-on-primary transition-colors duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="h-4 w-4" weight="bold" aria-hidden />
              Adicionar
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex h-11 min-w-11 cursor-pointer items-center gap-2 rounded-md border border-white/10 px-4 text-sm font-medium transition-colors duration-200 hover:border-secondary hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <SignOut className="h-4 w-4" weight="bold" aria-hidden />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 sm:px-8">
        <div>
          <h1 className="font-display text-2xl font-black">Overview</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Visão geral dos seus dados financeiros.
            {!loading ? ` Disponível seguro: ${formatBRL(safe.available)}` : null}
          </p>
        </div>

        {apiDown ? (
          <p
            role="status"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            Não foi possível conectar à API. Os valores ficam em R$ 0,00 até reconectar.
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="text-sm text-secondary">
            {notice}
          </p>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<Bank className="h-4 w-4" weight="bold" aria-hidden />}
            label="Contas bancárias"
            value={formatBRL(cash)}
            loading={loading}
            tone={cash < 0 ? 'negative' : 'positive'}
            empty="Nenhuma conta"
            onSelect={(id) => setDetail({ type: 'account', id })}
            items={accounts.map((item) => ({
              id: item.id,
              name: item.name,
              detail:
                item.origin === 'open_finance'
                  ? `${item.institution ?? 'Open Finance'} · OF`
                  : item.institution,
              value: formatBRL(item.currentBalance),
              amount: item.currentBalance,
            }))}
          />
          <KpiCard
            icon={<CardIcon className="h-4 w-4" weight="bold" aria-hidden />}
            label="Cartões de crédito"
            value={formatBRL(invoices)}
            loading={loading}
            tone="negative"
            empty="Nenhum cartão"
            bar={cardLimit > 0 ? usedPct : undefined}
            hint={cardLimit > 0 ? `${usedPct}% utilizado` : undefined}
            hintRight={cardLimit > 0 ? `Limite: ${formatBRL(cardLimit)}` : undefined}
            onSelect={(id) => setDetail({ type: 'card', id })}
            items={cards.map((item) => ({
              id: item.id,
              name: item.name,
              detail:
                item.invoices && item.invoices.length > 1
                  ? `${item.invoices.length} faturas`
                  : item.origin === 'open_finance'
                    ? `${item.institution ?? 'Open Finance'} · OF`
                    : item.institution,
              value: formatBRL(
                item.invoices?.find((row) => row.month === month)?.amount ??
                  item.currentInvoice,
              ),
            }))}
          />
          <KpiCard
            icon={<Handshake className="h-4 w-4" weight="bold" aria-hidden />}
            label="Empréstimos e boletos"
            value={formatBRL(owed)}
            loading={loading}
            tone="neutral"
            empty="Nenhum empréstimo"
            onSelect={(id) => setDetail({ type: 'debt', id })}
            items={debts.map((item) => ({
              id: item.id,
              name: item.creditor,
              detail: item.kind === 'bill'
                ? `Boleto · ${item.installmentCount ?? 0}x ${formatBRL(item.installmentAmount)}`
                : item.installmentCount
                  ? `${item.installmentCount}x ${formatBRL(item.installmentAmount)}`
                  : null,
              value: formatBRL(item.remainingBalance),
            }))}
          />
          <KpiCard
            icon={<ChartLineUp className="h-4 w-4" weight="bold" aria-hidden />}
            label="Investimentos"
            value={formatBRL(invested)}
            loading={loading}
            tone="positive"
            empty="Nenhum investimento"
            onSelect={(id) => setDetail({ type: 'investment', id })}
            items={investments.map((item) => ({
              id: item.id,
              name: item.name,
              detail:
                item.origin === 'open_finance'
                  ? `${item.institution ?? 'Open Finance'} · OF`
                  : item.institution,
              value: formatBRL(item.currentValue),
              amount: item.currentValue,
            }))}
          />
        </section>

        <BalanceChart
          cash={cash}
          hasRealData={hasRealData}
          transactions={transactions}
        />

        <section className="grid gap-4 lg:grid-cols-2">
          <ProjectionsPanel board={projections} loading={loading} />
          <FinanceChat />
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0b100e] p-5 sm:p-6">
          <h2 className="font-display text-sm font-bold tracking-[0.14em] uppercase">
            Histórico
          </h2>
          <p className="mt-1 text-sm text-muted-fg">
            Extrato dos últimos 90 dias (Open Finance) e lançamentos manuais.
          </p>
          {transactions.length === 0 ? (
            <p className="mt-5 text-sm text-muted-fg">
              Nenhuma transação ainda. Se a Nubank já está conectada, clique em
              Sincronizar para puxar o extrato. Outro banco: Adicionar → Conta →
              Open Finance com o novo itemId.
            </p>
          ) : (
            <ul className="mt-5 divide-y divide-white/8">
              {transactions.slice(0, 40).map((item) => {
                const inflow = item.type === 'income';
                const tag = historySourceTag(item, accounts, cards);
                return (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-4 py-3 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="inline-flex shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] tracking-wide text-primary uppercase">
                          {tag}
                        </span>
                        <span className="truncate">{item.description}</span>
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-fg">
                        {formatDate(item.date)}
                      </span>
                    </span>
                    <span
                      className={
                        inflow ? 'shrink-0 text-primary' : 'shrink-0 text-destructive'
                      }
                    >
                      {inflow ? '+' : '−'}
                      {formatBRL(item.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <AddItemDialog
        open={addOpen}
        tab={tab}
        busy={busy}
        error={error}
        today={today}
        accounts={accounts}
        cards={cards}
        debts={debts}
        onTab={setTab}
        onClose={() => setAddOpen(false)}
        onSubmit={onSubmit}
      />
      <ItemDetailDialog
        target={detail}
        accounts={accounts}
        cards={cards}
        debts={debts}
        investments={investments}
        transactions={transactions}
        onClose={() => setDetail(null)}
      />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  hintRight,
  tone,
  bar,
  items,
  empty,
  loading,
  onSelect,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  hintRight?: string;
  tone: 'positive' | 'negative' | 'neutral';
  bar?: number;
  items: {
    id: string;
    name: string;
    detail?: string | null;
    value: string;
    amount?: number;
  }[];
  empty: string;
  loading: boolean;
  onSelect?: (id: string) => void;
}) {
  const valueClass =
    tone === 'positive'
      ? 'text-primary'
      : tone === 'negative'
        ? 'text-destructive'
        : 'text-foreground';
  return (
    <article className="rounded-2xl border border-white/10 bg-[#0b100e] p-5">
      <p className="flex items-center gap-2 text-[11px] tracking-[0.14em] text-muted-fg uppercase">
        {icon}
        {label}
      </p>
      {loading ? (
        <div className="mt-3 h-8 w-32 animate-pulse rounded bg-white/10" />
      ) : (
        <p className={`font-display mt-3 text-[28px] font-black ${valueClass}`}>
          {value}
        </p>
      )}
      {typeof bar === 'number' ? (
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-[11px] text-muted-fg">
            <span>{hint}</span>
            <span>{hintRight}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-destructive transition-[width] duration-200"
              style={{ width: `${bar}%` }}
            />
          </div>
        </div>
      ) : null}
      {items.length > 0 ? (
        <ul className="mt-5 space-y-3 border-t border-white/8 pt-4 text-sm">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect?.(item.id)}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md text-left transition-colors duration-200 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
              <span className="min-w-0">
                <span className="block truncate">{item.name}</span>
                {item.detail ? (
                  <span className="block truncate text-[11px] text-muted-fg">
                    {item.detail}
                  </span>
                ) : null}
              </span>
              <span
                className={
                  typeof item.amount === 'number' && item.amount < 0
                    ? 'text-destructive'
                    : valueClass
                }
              >
                {item.value}
              </span>
              </button>
            </li>
          ))}
        </ul>
      ) : loading ? null : (
        <p className="mt-5 border-t border-white/8 pt-4 text-sm text-muted-fg">
          {empty}
        </p>
      )}
    </article>
  );
}

async function loadOr<T>(path: string, fallback: T): Promise<T> {
  try {
    return await apiFetch<T>(path);
  } catch {
    return fallback;
  }
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return value;
  }
  return `${day}/${month}/${year}`;
}
