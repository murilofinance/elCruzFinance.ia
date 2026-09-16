import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { PaperPlaneTilt, Sparkle } from '@phosphor-icons/react';
import { apiFetch, type AiChatResponse } from '../lib/api';

const SUGGESTIONS = [
  'O que eu preciso pagar nos próximos dias?',
  'Quanto está a fatura de cada cartão?',
  'Qual banco teve mais saída este mês?',
];

const MONEY_RE = /-?R\$\s*-?\s*[\d.]+,\d{2}/;
const MONEY_SPLIT_RE = /(-?R\$\s*-?\s*[\d.]+,\d{2})/g;

type ChatTurn = { role: 'user' | 'assistant'; content: string };
type ReplyBlock =
  | { type: 'p'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; heading?: string; items: string[] };

export function FinanceChat() {
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      role: 'assistant',
      content:
        'Pergunte o que vence, faturas ou bancos. Eu organizo em lista com valores e datas.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLUListElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [turns, busy]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) {
      return;
    }
    const history = turns.slice(1).slice(-8);
    setDraft('');
    setError(null);
    setBusy(true);
    setTurns((rows) => [...rows, { role: 'user', content: message }]);
    try {
      const result = await apiFetch<AiChatResponse>('/ai/chat', {
        method: 'POST',
        body: { message, history },
      });
      setTurns((rows) => [...rows, { role: 'assistant', content: result.reply }]);
    } catch (err: unknown) {
      const next =
        err instanceof Error ? err.message : 'Não foi possível falar com a IA.';
      setError(next);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  return (
    <section className="flex min-h-[380px] flex-col rounded-2xl border border-white/10 bg-[#0b100e] p-5 sm:p-6">
      <p className="flex items-center gap-2 text-[11px] tracking-[0.14em] text-muted-fg uppercase">
        <Sparkle className="h-4 w-4" weight="bold" aria-hidden />
        Assistente
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted-fg">
        Respostas em lista, com valor e data. Se o Gemini lotar, usa os dados da Overview.
      </p>
      <ul
        ref={scroller}
        className="mt-4 flex max-h-96 min-h-40 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto pr-1 text-sm"
      >
        {turns.map((turn, index) => (
          <li
            key={`${turn.role}-${index}`}
            className={
              turn.role === 'user'
                ? 'ml-8 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-foreground'
                : 'mr-4 rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-foreground'
            }
          >
            {turn.role === 'assistant' ? (
              <ChatReply text={turn.content} />
            ) : (
              <p className="leading-relaxed break-words">{turn.content}</p>
            )}
          </li>
        ))}
        {busy ? (
          <li className="mr-4 animate-pulse rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-muted-fg">
            Organizando seus vencimentos…
          </li>
        ) : null}
      </ul>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((item) => (
          <button
            key={item}
            type="button"
            disabled={busy}
            onClick={() => void send(item)}
            className="min-h-11 cursor-pointer rounded-full border border-white/10 px-3 py-2 text-[11px] leading-snug text-muted-fg transition-colors duration-200 hover:border-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            {item}
          </button>
        ))}
      </div>
      <form className="mt-3 flex gap-2" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="ai-chat">
          Perguntar à IA
        </label>
        <input
          id="ai-chat"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ex.: o que vence até sexta?"
          maxLength={500}
          className="h-12 min-w-0 flex-1 rounded-md border border-border bg-black/40 px-3 text-sm text-foreground outline-none ring-ring focus-visible:ring-2"
        />
        <button
          type="submit"
          disabled={busy || draft.trim().length < 2}
          aria-label="Enviar"
          className="inline-flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-md bg-primary text-on-primary transition-colors duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PaperPlaneTilt className="h-5 w-5" weight="bold" aria-hidden />
        </button>
      </form>
    </section>
  );
}

function ChatReply({ text }: { text: string }) {
  const blocks = parseReply(tidyReply(text));
  return (
    <div className="grid gap-2.5 leading-relaxed">
      {blocks.map((block, index) => {
        if (block.type === 'list') {
          const overdue = /atrasad/i.test(block.heading ?? '');
          return (
            <ul key={index} className="grid gap-1.5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <ReplyRow text={item} overdue={overdue} />
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === 'heading') {
          return (
            <p
              key={index}
              className="pt-1 text-[11px] font-semibold tracking-[0.14em] text-secondary uppercase"
            >
              {block.text}
            </p>
          );
        }
        return (
          <p key={index} className="break-words text-foreground">
            {highlightMoney(block.text)}
          </p>
        );
      })}
    </div>
  );
}

function ReplyRow({ text, overdue }: { text: string; overdue: boolean }) {
  const parsed = splitMoneyLine(text);
  const tone = overdue || parsed.negative ? 'text-destructive' : 'text-secondary';
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        overdue
          ? 'border-destructive/35 bg-destructive/10'
          : 'border-white/10 bg-black/35'
      }`}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <span className="min-w-0 break-words">{parsed.label || text}</span>
        {parsed.money ? (
          <strong className={`shrink-0 tabular-nums ${tone}`}>{parsed.money}</strong>
        ) : null}
      </div>
      {parsed.rest ? (
        <p className="mt-0.5 text-xs leading-relaxed text-muted-fg">{parsed.rest}</p>
      ) : null}
    </div>
  );
}

function tidyReply(raw: string): string {
  return raw
    .replace(/\r/g, '')
    .replace(/\*\*/g, '')
    .replace(
      /(Atrasados:|Próximos(?: vencimentos)?[^:\n]{0,40}:|Faturas(?: agora)?:|Saldo[^:\n]{0,40}:|Saídas[^:\n]{0,40}:)/gi,
      '\n$1\n',
    )
    .replace(/\s*[•*]\s+/g, '\n- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseReply(text: string): ReplyBlock[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks: ReplyBlock[] = [];
  let lastHeading = '';
  for (const line of lines) {
    if (line.startsWith('- ') || line.startsWith('• ')) {
      const item = line.replace(/^[-•]\s+/, '');
      const last = blocks[blocks.length - 1];
      if (last?.type === 'list') {
        last.items.push(item);
      } else {
        blocks.push({ type: 'list', heading: lastHeading, items: [item] });
      }
      continue;
    }
    if (isHeading(line)) {
      lastHeading = line.replace(/:$/, '');
      blocks.push({ type: 'heading', text: lastHeading });
      continue;
    }
    blocks.push({ type: 'p', text: line });
  }
  return blocks;
}

function isHeading(line: string): boolean {
  if (MONEY_RE.test(line)) {
    return false;
  }
  const title = line.replace(/:$/, '');
  if (title.length > 42) {
    return false;
  }
  return (
    line.endsWith(':') ||
    /^(atrasados|próximos|proximos|faturas|saldo|saídas|saidas)/i.test(title)
  );
}

function splitMoneyLine(text: string): {
  label: string;
  money: string | null;
  rest: string;
  negative: boolean;
} {
  const match = text.match(new RegExp(`^(.*?)(${MONEY_RE.source})(.*)$`));
  if (!match) {
    return { label: text, money: null, rest: '', negative: false };
  }
  return {
    label: match[1].replace(/[:·]\s*$/, '').trim(),
    money: match[2].trim(),
    rest: match[3].replace(/^[·,:;\s]+/, '').replace(/[.)]$/, '').trim(),
    negative: match[2].includes('-'),
  };
}

function highlightMoney(text: string): ReactNode {
  const parts = text.split(MONEY_SPLIT_RE);
  return parts.map((part, index) => {
    if (MONEY_RE.test(part)) {
      const negative = part.includes('-');
      return (
        <strong
          key={index}
          className={`whitespace-nowrap tabular-nums ${
            negative ? 'text-destructive' : 'text-secondary'
          }`}
        >
          {part}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}
