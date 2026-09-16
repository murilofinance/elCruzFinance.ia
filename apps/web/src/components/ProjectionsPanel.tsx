import { CalendarBlank } from '@phosphor-icons/react';
import { formatBRL, type ProjectionBoard } from '../lib/api';

export function ProjectionsPanel({
  board,
  loading,
}: {
  board: ProjectionBoard;
  loading: boolean;
}) {
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
          <p className="mt-1 text-sm text-muted-fg">{board.headline}</p>
        </>
      )}
      {board.items.length > 0 ? (
        <ul className="mt-5 space-y-3 border-t border-white/8 pt-4 text-sm">
          {board.items.slice(0, 6).map((item) => (
            <li key={`${item.kind}-${item.id}`} className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate">{item.title}</span>
                <span className="block truncate text-[11px] text-muted-fg">
                  {item.overdue ? 'Atrasado · ' : 'Vence '}
                  {formatDay(item.dueDate)}
                  {item.detail ? ` · ${item.detail}` : ''}
                </span>
              </span>
              <span className="shrink-0 text-destructive">{formatBRL(item.amount)}</span>
            </li>
          ))}
        </ul>
      ) : loading ? null : (
        <p className="mt-5 border-t border-white/8 pt-4 text-sm text-muted-fg">
          Sem faturas ou parcelas com data pela frente.
        </p>
      )}
    </section>
  );
}

function formatDay(iso: string): string {
  const [, month, day] = iso.split('-');
  if (!month || !day) {
    return iso;
  }
  return `${day}/${month}`;
}
