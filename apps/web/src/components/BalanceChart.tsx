import { ChartLine } from '@phosphor-icons/react';
import { formatBRL } from '../lib/api';

const EXAMPLE = [320, 180, 195, 210, 240, 205, 261];
const MONTHS = ['mai', 'jun', 'jul', 'ago', 'set', 'out', 'hoje'];

type BalanceChartProps = {
  cash: number;
  hasRealData: boolean;
};

export function BalanceChart({ cash, hasRealData }: BalanceChartProps) {
  const width = 920;
  const height = 240;
  const padX = 8;
  const padY = 20;
  const series = hasRealData
    ? [cash * 0.92, cash * 0.88, cash * 0.95, cash * 0.9, cash * 0.97, cash * 0.99, cash]
    : EXAMPLE;
  const max = Math.max(...series, 1);
  const points = series.map((value, index) => {
    const x = padX + (index * (width - padX * 2)) / (series.length - 1);
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
        {!hasRealData ? (
          <p className="rounded-md border border-white/10 px-2 py-1 text-[11px] tracking-wide text-muted-fg uppercase">
            Exemplo
          </p>
        ) : null}
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
        <span>{MONTHS[0]}</span>
        <span>{MONTHS[3]}</span>
        <span>{MONTHS[MONTHS.length - 1]}</span>
      </figcaption>
    </figure>
  );
}
