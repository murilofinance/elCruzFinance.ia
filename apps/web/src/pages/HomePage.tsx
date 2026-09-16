import { FormEvent, useCallback, useEffect, useState } from 'react';
import { SignOut } from '@phosphor-icons/react';
import { useAuth } from '../auth/AuthProvider';
import { BrandBackdrop } from '../components/BrandBackdrop';
import {
  apiFetch,
  formatBRL,
  type Account,
  type CreditCard,
  type Debt,
  type LedgerTransaction,
  type SafeToSpend,
} from '../lib/api';

const fieldClass =
  'h-12 w-full rounded-md border border-border bg-black/40 px-3 text-foreground outline-none ring-ring transition-colors duration-200 focus-visible:ring-2';
const cardClass =
  'rounded-xl border border-border bg-black/70 p-6 backdrop-blur-md';

export function HomePage() {
  const { user, logout } = useAuth();
  const [safe, setSafe] = useState<SafeToSpend | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const [nextSafe, nextAccounts, nextCards, nextDebts, nextTx] =
      await Promise.all([
        apiFetch<SafeToSpend>('/insights/safe-to-spend'),
        apiFetch<Account[]>('/accounts'),
        apiFetch<CreditCard[]>('/cards'),
        apiFetch<Debt[]>('/debts'),
        apiFetch<LedgerTransaction[]>('/transactions'),
      ]);
    setSafe(nextSafe);
    setAccounts(nextAccounts);
    setCards(nextCards);
    setDebts(nextDebts);
    setTransactions(nextTx);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void apiFetch('/me')
      .then(() => reload())
      .then(() => {
        if (!cancelled) {
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  async function onSubmit(
    event: FormEvent<HTMLFormElement>,
    path: string,
    body: Record<string, unknown>,
  ) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch(path, { method: 'POST', body });
      (event.target as HTMLFormElement).reset();
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar');
    } finally {
      setBusy(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <BrandBackdrop scrim="bg-black/80">
      <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 px-5 py-10 sm:px-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <img
              src="/brand/mark.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-md"
            />
            <p className="font-display mt-4 text-[11px] font-bold tracking-[0.28em] text-secondary uppercase">
              Disponível seguro
            </p>
            <h1 className="font-display mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              {loading || !safe ? '…' : formatBRL(safe.available)}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-fg">
              Caixa menos fatura e parcela deste mês. Olá, {user?.email}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex h-11 min-w-11 cursor-pointer items-center gap-2 rounded-md border border-border px-4 text-sm font-medium transition-colors duration-200 hover:border-secondary hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SignOut className="h-4 w-4" weight="bold" aria-hidden />
            Sair
          </button>
        </header>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {safe ? (
          <section className="grid gap-3 sm:grid-cols-3">
            <Kpi label="Caixa" value={formatBRL(safe.cash)} />
            <Kpi label="Faturas abertas" value={formatBRL(safe.openInvoices)} />
            <Kpi
              label="Parcelas do mês"
              value={formatBRL(safe.openInstallments)}
            />
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-2">
          <article className={cardClass}>
            <h2 className="font-display text-sm font-bold tracking-wide uppercase">
              Conta
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {accounts.length === 0 ? (
                <li className="text-muted-fg">Nenhuma conta ainda.</li>
              ) : (
                accounts.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span>{item.name}</span>
                    <span>{formatBRL(item.currentBalance)}</span>
                  </li>
                ))
              )}
            </ul>
            <form
              className="mt-6 grid gap-3"
              onSubmit={(event) =>
                void onSubmit(event, '/accounts', {
                  name: String(new FormData(event.currentTarget).get('name')),
                  institution:
                    String(new FormData(event.currentTarget).get('institution')) ||
                    undefined,
                  kind: String(new FormData(event.currentTarget).get('kind')),
                  currentBalance: Number(
                    new FormData(event.currentTarget).get('currentBalance'),
                  ),
                })
              }
            >
              <label className="grid gap-1 text-sm">
                Nome
                <input name="name" required minLength={2} className={fieldClass} />
              </label>
              <label className="grid gap-1 text-sm">
                Instituição
                <input name="institution" className={fieldClass} />
              </label>
              <label className="grid gap-1 text-sm">
                Tipo
                <select name="kind" className={fieldClass} defaultValue="checking">
                  <option value="checking">Corrente</option>
                  <option value="savings">Poupança</option>
                  <option value="wallet">Carteira</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Saldo atual
                <input
                  name="currentBalance"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  className={fieldClass}
                />
              </label>
              <Submit busy={busy} label="Salvar conta" />
            </form>
          </article>

          <article className={cardClass}>
            <h2 className="font-display text-sm font-bold tracking-wide uppercase">
              Cartão
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {cards.length === 0 ? (
                <li className="text-muted-fg">Nenhum cartão ainda.</li>
              ) : (
                cards.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span>
                      {item.name} · vence dia {item.dueDay}
                    </span>
                    <span>{formatBRL(item.currentInvoice)}</span>
                  </li>
                ))
              )}
            </ul>
            <form
              className="mt-6 grid gap-3"
              onSubmit={(event) => {
                const data = new FormData(event.currentTarget);
                void onSubmit(event, '/cards', {
                  name: String(data.get('name')),
                  institution: String(data.get('institution')) || undefined,
                  creditLimit: Number(data.get('creditLimit')),
                  closingDay: Number(data.get('closingDay')),
                  dueDay: Number(data.get('dueDay')),
                  currentInvoice: Number(data.get('currentInvoice') || 0),
                });
              }}
            >
              <label className="grid gap-1 text-sm">
                Nome
                <input name="name" required minLength={2} className={fieldClass} />
              </label>
              <label className="grid gap-1 text-sm">
                Bandeira / banco
                <input name="institution" className={fieldClass} />
              </label>
              <label className="grid gap-1 text-sm">
                Limite
                <input
                  name="creditLimit"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  className={fieldClass}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm">
                  Fecha dia
                  <input
                    name="closingDay"
                    type="number"
                    min={1}
                    max={31}
                    required
                    className={fieldClass}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Vence dia
                  <input
                    name="dueDay"
                    type="number"
                    min={1}
                    max={31}
                    required
                    className={fieldClass}
                  />
                </label>
              </div>
              <label className="grid gap-1 text-sm">
                Fatura aberta
                <input
                  name="currentInvoice"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={0}
                  className={fieldClass}
                />
              </label>
              <Submit busy={busy} label="Salvar cartão" />
            </form>
          </article>

          <article className={cardClass}>
            <h2 className="font-display text-sm font-bold tracking-wide uppercase">
              Empréstimo
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {debts.length === 0 ? (
                <li className="text-muted-fg">Nenhuma dívida ainda.</li>
              ) : (
                debts.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span>
                      {item.creditor} · parcela {formatBRL(item.installmentAmount)}
                    </span>
                    <span>{formatBRL(item.remainingBalance)}</span>
                  </li>
                ))
              )}
            </ul>
            <form
              className="mt-6 grid gap-3"
              onSubmit={(event) => {
                const data = new FormData(event.currentTarget);
                void onSubmit(event, '/debts', {
                  creditor: String(data.get('creditor')),
                  remainingBalance: Number(data.get('remainingBalance')),
                  installmentAmount: Number(data.get('installmentAmount')),
                  dueDay: Number(data.get('dueDay')),
                });
              }}
            >
              <label className="grid gap-1 text-sm">
                Credor
                <input
                  name="creditor"
                  required
                  minLength={2}
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Saldo devedor
                <input
                  name="remainingBalance"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Parcela
                <input
                  name="installmentAmount"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Vence dia
                <input
                  name="dueDay"
                  type="number"
                  min={1}
                  max={31}
                  required
                  className={fieldClass}
                />
              </label>
              <Submit busy={busy} label="Salvar dívida" />
            </form>
          </article>

          <article className={cardClass}>
            <h2 className="font-display text-sm font-bold tracking-wide uppercase">
              Lançamento
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {transactions.length === 0 ? (
                <li className="text-muted-fg">Nenhum lançamento ainda.</li>
              ) : (
                transactions.slice(0, 8).map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span>
                      {item.date} · {item.description}
                    </span>
                    <span>{formatBRL(item.amount)}</span>
                  </li>
                ))
              )}
            </ul>
            <form
              className="mt-6 grid gap-3"
              onSubmit={(event) => {
                const data = new FormData(event.currentTarget);
                const lane = String(data.get('lane'));
                const type =
                  lane === 'account_expense' || lane === 'card_expense'
                    ? 'expense'
                    : lane;
                void onSubmit(event, '/transactions', {
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
              <label className="grid gap-1 text-sm">
                Tipo
                <select name="lane" className={fieldClass} defaultValue="account_expense">
                  <option value="income">Entrada na conta</option>
                  <option value="account_expense">Saída na conta / Pix</option>
                  <option value="card_expense">Compra no cartão</option>
                  <option value="card_payment">Pagar fatura</option>
                  <option value="debt_payment">Pagar parcela</option>
                </select>
              </label>
              <p className="text-xs text-muted-fg">
                Compra no cartão sobe a fatura, não o saldo. Pagar fatura baixa
                os dois.
              </p>
              <label className="grid gap-1 text-sm">
                Conta
                <select name="accountId" className={fieldClass} defaultValue="">
                  <option value="">—</option>
                  {accounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Cartão
                <select name="cardId" className={fieldClass} defaultValue="">
                  <option value="">—</option>
                  {cards.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Empréstimo
                <select name="debtId" className={fieldClass} defaultValue="">
                  <option value="">—</option>
                  {debts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.creditor}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Descrição
                <input
                  name="description"
                  required
                  minLength={2}
                  className={fieldClass}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm">
                  Valor
                  <input
                    name="amount"
                    type="number"
                    min={0.01}
                    step="0.01"
                    required
                    className={fieldClass}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Data
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={today}
                    className={fieldClass}
                  />
                </label>
              </div>
              <Submit busy={busy} label="Lançar" />
            </form>
          </article>
        </section>
      </main>
    </BrandBackdrop>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className={cardClass}>
      <p className="text-xs tracking-wide text-muted-fg uppercase">{label}</p>
      <p className="font-display mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}

function Submit({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex h-12 cursor-pointer items-center justify-center rounded-md bg-primary font-display text-sm font-bold tracking-wide text-on-primary uppercase transition-colors duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? 'Salvando…' : label}
    </button>
  );
}
