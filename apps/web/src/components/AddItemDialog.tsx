import { FormEvent, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Plus, X } from '@phosphor-icons/react';
import type { Account, CreditCard, Debt } from '../lib/api';

export type AddTab = 'conta' | 'cartao' | 'emprestimo' | 'investimento' | 'lancamento';

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
              Conta, cartão, empréstimo, investimento, boleto parcelado e lançamento.
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
              ['investimento', 'Investimento'],
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
            <AccountForm
              tabsId={tabsId}
              busy={busy}
              onSubmit={onSubmit}
            />
          ) : null}

          {tab === 'cartao' ? (
            <CardForm tabsId={tabsId} busy={busy} onSubmit={onSubmit} />
          ) : null}

          {tab === 'emprestimo' ? (
            <DebtForm tabsId={tabsId} busy={busy} onSubmit={onSubmit} />
          ) : null}

          {tab === 'investimento' ? (
            <InvestmentForm tabsId={tabsId} busy={busy} onSubmit={onSubmit} />
          ) : null}

          {tab === 'lancamento' ? (
            <TransactionForm
              tabsId={tabsId}
              busy={busy}
              today={today}
              accounts={accounts}
              cards={cards}
              debts={debts}
              onSubmit={onSubmit}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AccountForm({
  tabsId,
  busy,
  onSubmit,
}: {
  tabsId: string;
  busy: boolean;
  onSubmit: AddItemDialogProps['onSubmit'];
}) {
  const [origin, setOrigin] = useState<'manual' | 'open_finance'>('manual');
  const openFinance = origin === 'open_finance';

  return (
    <form
      id={`${tabsId}-conta`}
      role="tabpanel"
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        if (openFinance) {
          onSubmit(event, '/connections', {
            itemId: String(data.get('itemId')).trim(),
          });
          return;
        }
        onSubmit(event, '/accounts', {
          name: String(data.get('name')),
          institution: String(data.get('institution')) || undefined,
          kind: String(data.get('kind')),
          currentBalance: Number(data.get('currentBalance')),
        });
      }}
    >
      <Field label="Origem">
        <select
          name="origin"
          className={fieldClass}
          value={origin}
          onChange={(event) =>
            setOrigin(event.target.value as 'manual' | 'open_finance')
          }
        >
          <option value="manual">Manual</option>
          <option value="open_finance">Open Finance (Pluggy)</option>
        </select>
      </Field>
      {openFinance ? (
        <>
          <p className="sm:col-span-2 text-sm leading-6 text-muted-fg">
            Client ID e secret já estão na API. Cole só o itemId do Demo da
            Pluggy. Outro banco = outro itemId. Conta nova no mesmo banco: use
            Sincronizar no Overview.
          </p>
          <Field label="Item ID">
            <input
              name="itemId"
              required
              minLength={8}
              autoComplete="off"
              placeholder="Cole o itemId da conexão"
              className={fieldClass}
            />
          </Field>
          <div className="sm:col-span-2">
            <Submit busy={busy} label="Conectar e puxar dados" />
          </div>
        </>
      ) : (
        <>
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
        </>
      )}
    </form>
  );
}

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split('-').map(Number);
  const date = new Date(year, mon - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function CardForm({
  tabsId,
  busy,
  onSubmit,
}: {
  tabsId: string;
  busy: boolean;
  onSubmit: AddItemDialogProps['onSubmit'];
}) {
  const [invoices, setInvoices] = useState([{ month: currentMonthValue(), amount: '0' }]);

  return (
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
          invoices: invoices.map((item) => ({
            month: item.month,
            amount: Number(item.amount || 0),
          })),
        });
      }}
    >
      <Field label="Nome">
        <input name="name" required minLength={2} className={fieldClass} />
      </Field>
      <Field label="Bandeira / banco">
        <input name="institution" className={fieldClass} placeholder="Nubank" />
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
      <Field label="Fecha dia">
        <input name="closingDay" type="number" min={1} max={31} required className={fieldClass} />
      </Field>
      <Field label="Vence dia">
        <input name="dueDay" type="number" min={1} max={31} required className={fieldClass} />
      </Field>
      <div className="sm:col-span-2 grid gap-3 rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm">
            Faturas por mês
            <span className="mt-1 block text-muted-fg">
              Mês atual, o seguinte, e assim por diante. Cada linha é o valor daquele ciclo.
            </span>
          </p>
          <button
            type="button"
            onClick={() =>
              setInvoices((rows) => [
                ...rows,
                {
                  month: shiftMonth(rows[rows.length - 1]?.month ?? currentMonthValue(), 1),
                  amount: '0',
                },
              ])
            }
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm transition-colors duration-200 hover:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-4 w-4" weight="bold" aria-hidden />
            Mês
          </button>
        </div>
        {invoices.map((row, index) => (
          <div key={`${row.month}-${index}`} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Field label={index === 0 ? 'Mês' : `Mês ${index + 1}`}>
              <input
                type="month"
                required
                value={row.month}
                onChange={(event) =>
                  setInvoices((rows) =>
                    rows.map((item, i) =>
                      i === index ? { ...item, month: event.target.value } : item,
                    ),
                  )
                }
                className={fieldClass}
              />
            </Field>
            <Field label="Valor da fatura">
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={row.amount}
                onChange={(event) =>
                  setInvoices((rows) =>
                    rows.map((item, i) =>
                      i === index ? { ...item, amount: event.target.value } : item,
                    ),
                  )
                }
                className={fieldClass}
              />
            </Field>
            {invoices.length > 1 ? (
              <button
                type="button"
                onClick={() => setInvoices((rows) => rows.filter((_, i) => i !== index))}
                className="mt-6 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-md border border-border text-sm transition-colors duration-200 hover:border-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Remover ${row.month}`}
              >
                <X className="h-4 w-4" weight="bold" aria-hidden />
              </button>
            ) : (
              <span className="hidden sm:block" />
            )}
          </div>
        ))}
      </div>
      <div className="sm:col-span-2">
        <Submit busy={busy} label="Salvar cartão" />
      </div>
    </form>
  );
}

function DebtForm({
  tabsId,
  busy,
  onSubmit,
}: {
  tabsId: string;
  busy: boolean;
  onSubmit: AddItemDialogProps['onSubmit'];
}) {
  const [totalToPay, setTotalToPay] = useState('');
  const [installmentCount, setInstallmentCount] = useState('12');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const suggested = useMemo(() => {
    const total = Number(totalToPay);
    const count = Number(installmentCount);
    if (!(total > 0) || !(count > 0)) {
      return '';
    }
    return (Math.round((total / count) * 100) / 100).toFixed(2);
  }, [totalToPay, installmentCount]);

  return (
    <form
      id={`${tabsId}-emprestimo`}
      role="tabpanel"
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        const count = Number(data.get('installmentCount'));
        const total = Number(data.get('totalToPay'));
        const typed = Number(data.get('installmentAmount'));
        onSubmit(event, '/debts', {
          creditor: String(data.get('creditor')),
          kind: 'loan',
          principalReceived: Number(data.get('principalReceived')),
          totalToPay: total,
          installmentCount: count,
          installmentAmount: typed > 0 ? typed : count > 0 ? total / count : 0,
          dueDay: Number(data.get('dueDay')),
        });
      }}
    >
      <Field label="Credor">
        <input name="creditor" required minLength={2} className={fieldClass} placeholder="Nubank" />
      </Field>
      <Field label="Vence dia">
        <input name="dueDay" type="number" min={1} max={31} required className={fieldClass} />
      </Field>
      <Field label="Valor recebido">
        <input
          name="principalReceived"
          type="number"
          min={0}
          step="0.01"
          required
          className={fieldClass}
        />
      </Field>
      <Field label="Valor a ser pago">
        <input
          name="totalToPay"
          type="number"
          min={0}
          step="0.01"
          required
          value={totalToPay}
          onChange={(event) => setTotalToPay(event.target.value)}
          className={fieldClass}
        />
      </Field>
      <Field label="Quantidade de parcelas">
        <input
          name="installmentCount"
          type="number"
          min={1}
          max={360}
          required
          value={installmentCount}
          onChange={(event) => setInstallmentCount(event.target.value)}
          className={fieldClass}
        />
      </Field>
      <Field label="Valor da parcela">
        <input
          name="installmentAmount"
          type="number"
          min={0}
          step="0.01"
          value={installmentAmount}
          placeholder={suggested || '0'}
          onChange={(event) => setInstallmentAmount(event.target.value)}
          className={fieldClass}
        />
      </Field>
      <p className="sm:col-span-2 text-sm text-muted-fg">
        Se deixar a parcela em branco, usamos valor a ser pago ÷ quantidade.
        {suggested ? ` Sugestão: R$ ${suggested.replace('.', ',')}.` : null}
      </p>
      <div className="sm:col-span-2">
        <Submit busy={busy} label="Salvar empréstimo" />
      </div>
    </form>
  );
}

function InvestmentForm({
  tabsId,
  busy,
  onSubmit,
}: {
  tabsId: string;
  busy: boolean;
  onSubmit: AddItemDialogProps['onSubmit'];
}) {
  return (
    <form
      id={`${tabsId}-investimento`}
      role="tabpanel"
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        onSubmit(event, '/investments', {
          name: String(data.get('name')),
          institution: String(data.get('institution')) || undefined,
          kind: String(data.get('kind')),
          currentValue: Number(data.get('currentValue')),
        });
      }}
    >
      <Field label="Nome">
        <input name="name" required minLength={2} className={fieldClass} placeholder="Tesouro Selic" />
      </Field>
      <Field label="Instituição">
        <input name="institution" className={fieldClass} placeholder="Nubank" />
      </Field>
      <Field label="Tipo">
        <select name="kind" className={fieldClass} defaultValue="fixed">
          <option value="fixed">Renda fixa</option>
          <option value="funds">Fundos</option>
          <option value="stocks">Ações</option>
          <option value="crypto">Cripto</option>
          <option value="other">Outro</option>
        </select>
      </Field>
      <Field label="Valor atual">
        <input
          name="currentValue"
          type="number"
          min={0}
          step="0.01"
          required
          defaultValue={0}
          className={fieldClass}
        />
      </Field>
      <p className="sm:col-span-2 text-sm text-muted-fg">
        Entra no total de investimentos. Não mistura com o disponível seguro (caixa).
      </p>
      <div className="sm:col-span-2">
        <Submit busy={busy} label="Salvar investimento" />
      </div>
    </form>
  );
}

const LANES = [
  { id: 'income_salary', label: 'Salário', type: 'income', account: true },
  { id: 'income_pix', label: 'Pix recebido', type: 'income', account: true },
  { id: 'income_deposit', label: 'Depósito em espécie', type: 'income', account: true },
  { id: 'income_cashback', label: 'Cashback / rendimento', type: 'income', account: true },
  { id: 'income_refund', label: 'Estorno / reembolso', type: 'income', account: true },
  { id: 'expense_pix', label: 'Pix enviado', type: 'expense', account: true },
  { id: 'expense_ted', label: 'TED / DOC', type: 'expense', account: true },
  { id: 'expense_boleto', label: 'Boleto à vista', type: 'expense', account: true },
  { id: 'bill_plan', label: 'Boleto parcelado', type: 'bill_plan', billPlan: true },
  { id: 'bill_payment', label: 'Pagar boleto parcelado', type: 'debt_payment', account: true, bill: true },
  { id: 'expense_debit', label: 'Débito / saque', type: 'expense', account: true },
  { id: 'expense_subscription', label: 'Assinatura', type: 'expense', account: true },
  { id: 'expense_other', label: 'Outra saída na conta', type: 'expense', account: true },
  { id: 'card_expense', label: 'Compra no crédito à vista', type: 'expense', card: true },
  { id: 'card_installment', label: 'Compra parcelada no crédito', type: 'expense', card: true },
  { id: 'card_payment', label: 'Pagar fatura do cartão', type: 'card_payment', account: true, card: true },
  { id: 'debt_payment', label: 'Pagar parcela de empréstimo', type: 'debt_payment', account: true, debt: true },
  { id: 'transfer', label: 'Transferência entre contas', type: 'transfer', account: true, toAccount: true },
] as const;

function TransactionForm({
  tabsId,
  busy,
  today,
  accounts,
  cards,
  debts,
  onSubmit,
}: {
  tabsId: string;
  busy: boolean;
  today: string;
  accounts: Account[];
  cards: CreditCard[];
  debts: Debt[];
  onSubmit: AddItemDialogProps['onSubmit'];
}) {
  const [laneId, setLaneId] = useState<(typeof LANES)[number]['id']>('expense_pix');
  const lane = LANES.find((item) => item.id === laneId) ?? LANES[0];

  return (
    <form
      id={`${tabsId}-lancamento`}
      role="tabpanel"
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        if (lane.id === 'bill_plan') {
          const count = Number(data.get('installmentCount'));
          const amount = Number(data.get('amount'));
          const description = String(data.get('description')).trim();
          onSubmit(event, '/debts', {
            creditor: description,
            kind: 'bill',
            principalReceived: 0,
            installmentCount: count,
            installmentAmount: amount,
            totalToPay: Math.round(amount * count * 100) / 100,
            dueDay: Number(data.get('dueDay')),
          });
          return;
        }
        const prefix = lane.label;
        const description = String(data.get('description'));
        onSubmit(event, '/transactions', {
          type: lane.type,
          amount: Number(data.get('amount')),
          date: String(data.get('date')),
          description: description.startsWith(prefix)
            ? description
            : `${prefix}: ${description}`,
          accountId: 'account' in lane && lane.account
            ? String(data.get('accountId')) || undefined
            : undefined,
          toAccountId: 'toAccount' in lane && lane.toAccount
            ? String(data.get('toAccountId')) || undefined
            : undefined,
          cardId: 'card' in lane && lane.card
            ? String(data.get('cardId')) || undefined
            : undefined,
          debtId:
            ('debt' in lane && lane.debt) || ('bill' in lane && lane.bill)
              ? String(data.get('debtId')) || undefined
              : undefined,
        });
      }}
    >
      <Field label="Tipo">
        <select
          name="lane"
          className={fieldClass}
          value={laneId}
          onChange={(event) =>
            setLaneId(event.target.value as (typeof LANES)[number]['id'])
          }
        >
          {LANES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      {'account' in lane && lane.account ? (
        <Field label={'toAccount' in lane && lane.toAccount ? 'Conta de origem' : 'Conta'}>
          <select name="accountId" required className={fieldClass} defaultValue="">
            <option value="" disabled>
              Escolha
            </option>
            {accounts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      {'toAccount' in lane && lane.toAccount ? (
        <Field label="Conta de destino">
          <select name="toAccountId" required className={fieldClass} defaultValue="">
            <option value="" disabled>
              Escolha
            </option>
            {accounts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      {'card' in lane && lane.card ? (
        <Field label="Cartão">
          <select name="cardId" required className={fieldClass} defaultValue="">
            <option value="" disabled>
              Escolha
            </option>
            {cards.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      {'debt' in lane && lane.debt ? (
        <Field label="Empréstimo">
          <select name="debtId" required className={fieldClass} defaultValue="">
            <option value="" disabled>
              Escolha
            </option>
            {debts
              .filter((item) => item.kind !== 'bill')
              .map((item) => (
              <option key={item.id} value={item.id}>
                {item.creditor}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      {'bill' in lane && lane.bill ? (
        <Field label="Boleto parcelado">
          <select name="debtId" required className={fieldClass} defaultValue="">
            <option value="" disabled>
              Escolha
            </option>
            {debts
              .filter((item) => item.kind === 'bill')
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.creditor} · {item.installmentCount ?? 0}x {item.installmentAmount}
                </option>
              ))}
          </select>
        </Field>
      ) : null}
      {'billPlan' in lane && lane.billPlan ? (
        <>
          <Field label="Quantidade de parcelas">
            <input
              name="installmentCount"
              type="number"
              min={1}
              max={360}
              required
              defaultValue={6}
              className={fieldClass}
            />
          </Field>
          <Field label="Vence todo dia">
            <input
              name="dueDay"
              type="number"
              min={1}
              max={31}
              required
              defaultValue={30}
              className={fieldClass}
            />
          </Field>
        </>
      ) : null}
      <Field label={'billPlan' in lane && lane.billPlan ? 'Nome da conta (ex.: Dentista)' : 'Descrição'}>
        <input
          name="description"
          required
          minLength={2}
          className={fieldClass}
          placeholder={'billPlan' in lane && lane.billPlan ? 'Dentista' : undefined}
        />
      </Field>
      <Field label={'billPlan' in lane && lane.billPlan ? 'Valor da parcela' : 'Valor'}>
        <input name="amount" type="number" min={0.01} step="0.01" required className={fieldClass} />
      </Field>
      {'billPlan' in lane && lane.billPlan ? (
        <p className="sm:col-span-2 text-sm text-muted-fg">
          Exemplo: 6x de R$ 365 todo dia 30. Isso cria a conta a pagar e entra nas
          projeções. O caixa só baixa quando você usar “Pagar boleto parcelado”.
        </p>
      ) : (
        <Field label="Data">
          <input name="date" type="date" required defaultValue={today} className={fieldClass} />
        </Field>
      )}
      <div className="sm:col-span-2">
        <Submit
          busy={busy}
          label={lane.id === 'bill_plan' ? 'Criar boleto parcelado' : 'Lançar'}
        />
      </div>
    </form>
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
