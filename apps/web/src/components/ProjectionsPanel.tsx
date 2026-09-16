import { CalendarBlank } from '@phosphor-icons/react';
import { formatBRL, type ProjectionBoard } from '../lib/api';

export function ProjectionsPanel({
  board,
  loading,
}: {
  board: ProjectionBoard;
  loading: boolean;
}) {
  const months = board.months?.length
    ? board.months
    : groupLegacy(board);
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0b100e] p-5 sm:p-6">
      <p className="flex items-center gap-2 text-[11px] tracking-[0.14em] text-muted-fg uppercase">
        <CalendarBlank className="h-4 w-4" weight="bold" aria-hidden />
        Próximos pagamentos
      </p>
      {loading ? (
        <div className="mt-3 h-8 w-40 animate-pulse rounded bg-white/10" />
      ) : (
        <>
          <p className="font-display mt-3 text-[28px] font-black text-destructive">
            {formatBRL(board.totalDue)}
          </p>
          <p className="mt-1 text-sm text-muted-fg">
            {board.headline} Projeção dos próximos 4 meses.
          </p>
        </>
      )}
      {months.some((row) => row.items.length > 0) ? (
        <div className="mt-5 space-y-4 border-t border-white/8 pt-4 text-sm">
          {months.map((row) => (
            <section key={row.month}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-[11px] font-bold tracking-[0.14em] uppercase text-secondary">
                  {row.label}
                </h3>
                <span className="text-destructive">{formatBRL(row.total)}</span>
              </div>
              {row.items.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {row.items.map((item) => (
                    <li
                      key={`${item.kind}-${item.id}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{item.title}</span>
                        <span className="block truncate text-[11px] text-muted-fg">
                          {item.overdue ? 'Atrasado · ' : 'Vence '}
                          {formatDay(item.dueDate)}
                          {item.detail ? ` · ${item.detail}` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-destructive">
                        {formatBRL(item.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[11px] text-muted-fg">Sem vencimento neste mês.</p>
              )}
            </section>
          ))}
        </div>
      ) : loading ? null : (
        <p className="mt-5 border-t border-white/8 pt-4 text-sm text-muted-fg">
          Sem faturas ou parcelas com data pela frente.
        </p>
      )}
    </section>
  );
}

function groupLegacy(board: ProjectionBoard) {
  const map = new Map<string, typeof board.items>();
  for (const item of board.items) {
    const month = item.dueDate.slice(0, 7);
    const list = map.get(month) ?? [];
    list.push(item);
    map.set(month, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, items]) => ({
      month,
      label: month,
      total: items.reduce((sum, item) => sum + item.amount, 0),
      items,
    }));
}

function formatDay(iso: string): string {
  const [, month, day] = iso.split('-');
  if (!month || !day) {
    return iso;
  }
  return `${day}/${month}`;
}
