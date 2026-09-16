import { FormEvent, useId, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { CircleNotch, GoogleLogo } from '@phosphor-icons/react';
import { useAuth } from '../auth/AuthProvider';
import { BrandBackdrop } from '../components/BrandBackdrop';

function mapAuthError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'E-mail ou senha incorretos.';
      case 'auth/email-already-in-use':
        return 'Este e-mail já está cadastrado. Entre com a senha.';
      case 'auth/weak-password':
        return 'A senha precisa ter pelo menos 6 caracteres.';
      case 'auth/invalid-email':
        return 'E-mail inválido.';
      case 'auth/popup-closed-by-user':
        return 'Login com Google cancelado.';
      case 'auth/unauthorized-domain':
        return 'Este domínio ainda não está autorizado no Firebase Authentication.';
      default:
        return error.message;
    }
  }
  return 'Não foi possível entrar. Tente de novo.';
}

const fieldClass =
  'h-12 rounded-md border border-border bg-black/40 px-3 text-foreground outline-none ring-ring transition-colors duration-200 focus-visible:ring-2';

export function LoginPage() {
  const { signInEmail, signUpEmail, signInGoogle } = useAuth();
  const errorId = useId();
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus('loading');
    setMessage(null);
    try {
      if (mode === 'criar') {
        await signUpEmail(email, password);
      } else {
        await signInEmail(email, password);
      }
    } catch (error) {
      setStatus('error');
      setMessage(mapAuthError(error));
    }
  }

  async function onGoogle() {
    setStatus('loading');
    setMessage(null);
    try {
      await signInGoogle();
    } catch (error) {
      setStatus('error');
      setMessage(mapAuthError(error));
    }
  }

  const busy = status === 'loading';

  return (
    <BrandBackdrop
      scrim="bg-black/50 lg:bg-gradient-to-r lg:from-black/25 lg:via-black/40 lg:to-black/70"
      imagePosition="object-[18%_center] lg:object-[12%_center]"
    >
      <div className="flex min-h-dvh flex-col">
        <main className="flex flex-1 items-center px-5 py-10 sm:px-8 lg:justify-start lg:pl-[max(1.25rem,6vw)] lg:pr-[42%]">
          <div className="w-full max-w-md rounded-xl border border-border bg-black/75 p-6 backdrop-blur-md sm:p-8">
            <p className="font-display text-[11px] font-bold tracking-[0.28em] text-secondary uppercase">
              Acesso seguro
            </p>
            <h1 className="font-display mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              ElCruz
              <span className="block text-primary">Finance.AI</span>
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-fg">
              Entre para ver saldo, cartões e dívidas no mesmo lugar.
            </p>

            <form
              onSubmit={onSubmit}
              className="mt-8 flex flex-col gap-5"
              noValidate
              aria-busy={busy}
            >
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-medium">
                  E-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  aria-invalid={status === 'error'}
                  aria-describedby={message ? errorId : undefined}
                  onChange={(event) => setEmail(event.target.value)}
                  className={fieldClass}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={
                    mode === 'criar' ? 'new-password' : 'current-password'
                  }
                  required
                  minLength={6}
                  value={password}
                  aria-invalid={status === 'error'}
                  onChange={(event) => setPassword(event.target.value)}
                  className={fieldClass}
                />
              </div>

              {message ? (
                <p id={errorId} role="alert" className="text-sm text-destructive">
                  {message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="flex h-12 min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary font-display text-sm font-bold tracking-wide text-on-primary uppercase transition-colors duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <CircleNotch
                      className="h-5 w-5 animate-spin"
                      weight="bold"
                      aria-hidden
                    />
                    Aguarde
                  </>
                ) : mode === 'criar' ? (
                  'Criar conta'
                ) : (
                  'Entrar'
                )}
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => void onGoogle()}
                className="flex h-12 min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-black/30 font-medium transition-colors duration-200 hover:border-secondary hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleLogo className="h-5 w-5" weight="bold" aria-hidden />
                Continuar com Google
              </button>
            </form>

            <p className="mt-6 text-sm text-muted-fg">
              {mode === 'criar' ? 'Já tem conta?' : 'Primeiro acesso?'}{' '}
              <button
                type="button"
                className="min-h-11 cursor-pointer font-medium text-secondary underline-offset-4 transition-colors duration-200 hover:text-primary hover:underline"
                onClick={() => {
                  setMode(mode === 'criar' ? 'entrar' : 'criar');
                  setMessage(null);
                  setStatus('idle');
                }}
              >
                {mode === 'criar' ? 'Entrar' : 'Criar conta'}
              </button>
            </p>
          </div>
        </main>

        <footer className="px-5 pb-5 pt-2 sm:px-8 lg:pl-[max(1.25rem,6vw)]">
          <p className="max-w-md text-xs leading-5 text-[#c5ddd2]">
            Desenvolvido por Murilo Cruz Leite Machado
            <span className="mt-1 block text-[#c5ddd2]/80">
              © 2026 ElCruz Finance.AI · Todos os direitos reservados
            </span>
          </p>
        </footer>
      </div>
    </BrandBackdrop>
  );
}

