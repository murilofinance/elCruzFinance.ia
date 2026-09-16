import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { apiFetch, type MeResponse } from '../lib/api';

export function HomePage() {
  const { user, logout } = useAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<MeResponse>('/me')
      .then((data) => {
        if (!cancelled) {
          setMe(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao falar com a API');
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
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-secondary uppercase">
            Sessão
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Você está dentro
          </h1>
          <p className="mt-2 text-muted-fg">
            O Firebase autenticou. A API NestJS validou o token e gravou seu
            perfil no Firestore.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="h-10 cursor-pointer rounded-md border border-border px-4 text-sm font-medium transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Sair
        </button>
      </header>

      <section className="rounded-lg border border-border bg-muted p-6">
        <h2 className="text-sm font-medium text-muted-fg">Conta Firebase</h2>
        <dl className="mt-4 grid gap-3 font-mono text-sm">
          <div>
            <dt className="text-muted-fg">E-mail</dt>
            <dd>{user?.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-fg">uid</dt>
            <dd className="break-all">{user?.uid}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-muted p-6">
        <h2 className="text-sm font-medium text-muted-fg">GET /api/me</h2>
        {loading ? (
          <p className="mt-4 text-sm text-muted-fg">Falando com a API…</p>
        ) : error ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}. Confira se a API está rodando (npm run dev:api) e se o arquivo apps/api/.env tem a conta de serviço.
          </p>
        ) : me ? (
          <dl className="mt-4 grid gap-3 font-mono text-sm">
            <div>
              <dt className="text-muted-fg">Perfil no Firestore</dt>
              <dd>
                users/{me.uid}
              </dd>
            </div>
            <div>
              <dt className="text-muted-fg">Criado em</dt>
              <dd>{me.createdAt}</dd>
            </div>
          </dl>
        ) : null}
      </section>
    </main>
  );
}
