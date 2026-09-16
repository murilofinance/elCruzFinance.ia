import { FormEvent, useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Bank,
  CreditCard as CardIcon,
  Handshake,
  Plus,
  SignOut,
} from '@phosphor-icons/react';
import { AddItemDialog, type AddTab } from '../components/AddItemDialog';
import { BalanceChart } from '../components/BalanceChart';
import { useAuth } from '../auth/AuthProvider';
import {
  apiFetch,
  formatBRL,
  type Account,
  type CreditCard,
  type Debt,
  type PluggyConnectResult,
  type SafeToSpend,
} from '../lib/api';

const ZERO_SAFE: SafeToSpend = {
  cash: 0,
  openInvoices: 0,
  openInstallments: 0,
  available: 0,
  asOf: new Date().toISOString(),
};

export function HomePage() {
  const { logout } = useAuth();
  const [tab, setTab] = useState<AddTab>('conta');
  const [addOpen, setAddOpen] = useState(false);
  const [safe, setSafe] = useState<SafeToSpend>(ZERO_SAFE);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [apiDown, setApiDown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const [nextSafe, nextAccounts, nextCards, nextDebts] = await Promise.all([
      loadOr('/safe-to-spend', ZERO_SAFE),
      loadOr<Account[]>('/accounts', []),
      loadOr<CreditCard[]>('/cards', []),
      loadOr<Debt[]>('/debts', []),
    ]);
    setSafe(nextSafe);
    setAccounts(nextAccounts);
    setCards(nextCards);
    setDebts(nextDebts);
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
          `${result.connectorName}: ${result.accounts} conta(s) e ${result.cards} cartão(ões) sincronizados.`,
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
  const hasRealData = accounts.length > 0 || cards.length > 0 || debts.length > 0;
  const cardLimit = cards.reduce((sum, item) => sum + item.creditLimit, 0);
  const usedPct =
    cardLimit > 0 ? Math.min(100, Math.round((invoices / cardLimit) * 100)) : 0;

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

        <section className="grid gap-4 md:grid-cols-3">
          <KpiCard
            icon={<Bank className="h-4 w-4" weight="bold" aria-hidden />}
            label="Contas bancárias"
            value={formatBRL(cash)}
            loading={loading}
            tone="positive"
            empty="Nenhuma conta"
            items={accounts.map((item) => ({
              id: item.id,
              name: item.name,
              detail:
                item.origin === 'open_finance'
                  ? `${item.institution ?? 'Open Finance'} · OF`
                  : item.institution,
              value: formatBRL(item.currentBalance),
            }))}
          />
          <KpiCard
            icon={<CardIcon className="h-4 w-4" weight="bold" aria-hidden />}
            label="Cartões de crédito"
            value={formatBRL(invoices)}
            loading={loading}
            tone="negative"
            empty="Nenhum cartão"
            bar={cards.length > 0 ? usedPct : undefined}
            hint={
              cards.length > 0
                ? `${usedPct}% utilizado`
                : undefined
            }
            hintRight={
              cards.length > 0 ? `Limite: ${formatBRL(cardLimit)}` : undefined
            }
            items={cards.map((item) => ({
              id: item.id,
              name: item.name,
              detail:
                item.origin === 'open_finance'
                  ? `${item.institution ?? 'Open Finance'} · OF`
                  : item.invoices && item.invoices.length > 1
                    ? `${item.invoices.length} faturas`
                    : item.institution,
              value: formatBRL(
                item.invoices?.find((row) => row.month === month)?.amount ??
                  item.currentInvoice,
              ),
            }))}
          />
          <KpiCard
            icon={<Handshake className="h-4 w-4" weight="bold" aria-hidden />}
            label="Empréstimos"
            value={formatBRL(owed)}
            loading={loading}
            tone="neutral"
            empty="Nenhum empréstimo"
            items={debts.map((item) => ({
              id: item.id,
              name: item.creditor,
              detail: item.installmentCount
                ? `${item.installmentCount}x ${formatBRL(item.installmentAmount)}`
                : null,
              value: formatBRL(item.remainingBalance),
            }))}
          />
        </section>

        <BalanceChart cash={cash} hasRealData={hasRealData} />
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
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  hintRight?: string;
  tone: 'positive' | 'negative' | 'neutral';
  bar?: number;
  items: { id: string; name: string; detail?: string | null; value: string }[];
  empty: string;
  loading: boolean;
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
            <li key={item.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate">{item.name}</span>
                {item.detail ? (
                  <span className="block truncate text-[11px] text-muted-fg">
                    {item.detail}
                  </span>
                ) : null}
              </span>
              <span className={valueClass}>{item.value}</span>
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
