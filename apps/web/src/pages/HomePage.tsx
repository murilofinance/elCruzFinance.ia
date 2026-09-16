import { useEffect, useState } from 'react';
import { SignOut } from '@phosphor-icons/react';
import { useAuth } from '../auth/AuthProvider';
import { BrandBackdrop } from '../components/BrandBackdrop';
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
          setError(
            err instanceof Error ? err.message : 'Falha ao falar com a API',
          );
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
    <BrandBackdrop scrim="bg-black/75">
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16">
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
              Sessão
            </p>
            <h1 className="font-display mt-2 text-3xl font-black tracking-tight">
              Você está dentro
            </h1>
            <p className="mt-2 text-sm text-muted-fg">
              O Firebase autenticou. A API NestJS na Vercel valida o token e
              grava seu perfil no Firestore.
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

        <section className="rounded-xl border border-border bg-black/70 p-6 backdrop-blur-md">
          <h2 className="text-sm font-medium text-muted-fg">Conta Firebase</h2>
          <dl className="mt-4 grid gap-3 text-sm">
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

        <section className="rounded-xl border border-border bg-black/70 p-6 backdrop-blur-md">
          <h2 className="text-sm font-medium text-muted-fg">GET /api/me</h2>
          {loading ? (
            <p className="mt-4 text-sm text-muted-fg">Falando com a API…</p>
          ) : error ? (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          ) : me ? (
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-muted-fg">Perfil no Firestore</dt>
                <dd>users/{me.uid}</dd>
              </div>
              <div>
                <dt className="text-muted-fg">Criado em</dt>
                <dd>{me.createdAt}</dd>
              </div>
            </dl>
          ) : null}
        </section>
      </main>
    </BrandBackdrop>
  );
}
