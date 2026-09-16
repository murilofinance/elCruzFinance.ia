import { FormEvent, useState } from 'react';
import { PaperPlaneTilt, Sparkle } from '@phosphor-icons/react';
import { apiFetch, type AiChatResponse } from '../lib/api';

const SUGGESTIONS = [
  'O que eu preciso pagar nos próximos dias?',
  'Quanto está a fatura de cada cartão?',
  'Qual banco teve mais saída este mês?',
];

type ChatTurn = { role: 'user' | 'assistant'; content: string };

export function FinanceChat() {
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      role: 'assistant',
      content:
        'Pergunte sobre faturas, cartões, bancos ou o que vence. Eu leio só os seus dados da Overview.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const next = err instanceof Error ? err.message : 'Não foi possível falar com a IA.';
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
    <section className="flex min-h-[320px] flex-col rounded-2xl border border-white/10 bg-[#0b100e] p-5 sm:p-6">
      <p className="flex items-center gap-2 text-[11px] tracking-[0.14em] text-muted-fg uppercase">
        <Sparkle className="h-4 w-4" weight="bold" aria-hidden />
        Assistente
      </p>
      <p className="mt-1 text-sm text-muted-fg">
        Gemini lê o dashboard, extrato e vencimentos. A chave fica só na API.
      </p>
      <ul className="mt-4 flex max-h-56 flex-1 flex-col gap-3 overflow-y-auto text-sm">
        {turns.map((turn, index) => (
          <li
            key={`${turn.role}-${index}`}
            className={
              turn.role === 'user'
                ? 'ml-8 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2'
                : 'mr-8 rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-muted-fg'
            }
          >
            {turn.content}
          </li>
        ))}
        {busy ? (
          <li className="mr-8 animate-pulse rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-muted-fg">
            Consultando seus dados…
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
            className="h-9 cursor-pointer rounded-full border border-white/10 px-3 text-[11px] text-muted-fg transition-colors duration-200 hover:border-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
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
          className="inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-md bg-primary text-on-primary transition-colors duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PaperPlaneTilt className="h-5 w-5" weight="bold" aria-hidden />
        </button>
      </form>
    </section>
  );
}
