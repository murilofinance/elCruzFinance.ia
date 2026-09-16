import { ChartLine } from '@phosphor-icons/react';
import { formatBRL, type LedgerTransaction } from '../lib/api';

const EXAMPLE = [320, 180, 195, 210, 240, 205, 261];
const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

type BalanceChartProps = {
  cash: number;
  hasRealData: boolean;
  transactions?: LedgerTransaction[];
};

export function BalanceChart({
  cash,
  hasRealData,
  transactions = [],
}: BalanceChartProps) {
  const history = hasRealData ? cashHistory(cash, transactions) : null;
  const series = history?.values ?? EXAMPLE;
  const labels = history?.labels ?? ['mai', 'jun', 'jul', 'ago', 'set', 'out', 'hoje'];
  const width = 920;
  const height = 240;
  const padX = 8;
  const padY = 20;
  const max = Math.max(...series, 1);
  const points = series.map((value, index) => {
    const x = padX + (index * (width - padX * 2)) / Math.max(series.length - 1, 1);
    const y = height - padY - (value / max) * (height - padY * 2);
    return { x, y, value };
  });
  const last = points[points.length - 1];
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${last.x},${height - padY} L${points[0].x},${height - padY} Z`;

  return (
    <figure className="rounded-2xl border border-white/10 bg-[#0b100e] p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] tracking-[0.14em] text-muted-fg uppercase">
            <ChartLine className="h-4 w-4" weight="bold" aria-hidden />
            Evolução do saldo
          </p>
          <p className="font-display mt-2 text-3xl font-black">
            {formatBRL(hasRealData ? cash : 0)}
          </p>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-2 h-52 w-full sm:h-60"
        role="img"
        aria-label={
          hasRealData
            ? `Saldo atual ${formatBRL(cash)}`
            : 'Gráfico de exemplo. Adicione uma conta para ver seus dados.'
        }
      >
        <defs>
          <linearGradient id="elcruz-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#00E68A" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#00E68A" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={area}
          fill="url(#elcruz-area)"
          className={hasRealData ? '' : 'opacity-45'}
        />
        <path
          d={line}
          fill="none"
          stroke="#00E68A"
          strokeWidth="2.4"
          strokeDasharray={hasRealData ? undefined : '8 7'}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={last.x} cy={last.y} r="4.5" fill="#00E68A" />
      </svg>
      <figcaption className="flex justify-between text-[11px] text-muted-fg">
        <span>{labels[0]}</span>
        <span>{labels[Math.floor(labels.length / 2)]}</span>
        <span>{labels[labels.length - 1]}</span>
      </figcaption>
    </figure>
  );
}

function cashHistory(cash: number, transactions: LedgerTransaction[]) {
  const bankTx = transactions.filter(
    (item) =>
      item.type === 'card_payment' ||
      ((item.type === 'income' || item.type === 'expense') && !item.cardId),
  );
  const points = 7;
  const values: number[] = [];
  const labels: string[] = [];
  let cursor = cash;
  const now = new Date();
  for (let offset = 0; offset < points; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    labels.unshift(offset === 0 ? 'hoje' : MONTH_LABELS[date.getMonth()]);
    values.unshift(Math.max(0, cursor));
    const monthNet = bankTx
      .filter((item) => item.date.startsWith(key))
      .reduce((sum, item) => {
        if (item.type === 'income') {
          return sum + item.amount;
        }
        return sum - item.amount;
      }, 0);
    cursor -= monthNet;
  }
  return { values, labels };
}
