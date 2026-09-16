import { FormEvent, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { useAuth } from '../auth/AuthProvider';

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
      default:
        return error.message;
    }
  }
  return 'Não foi possível entrar. Tente de novo.';
}

export function LoginPage() {
  const { signInEmail, signUpEmail, signInGoogle } = useAuth();
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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-secondary uppercase">
        Controle pessoal
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground">
        Minhas finanças
      </h1>
      <p className="mt-3 text-muted-fg">
        Entre para ver saldo, cartões e dívidas no mesmo lugar.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-10 flex flex-col gap-5 rounded-lg border border-border bg-muted p-6"
        noValidate
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
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 rounded-md border border-border bg-background px-3 text-foreground outline-none ring-ring focus-visible:ring-2"
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
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 rounded-md border border-border bg-background px-3 text-foreground outline-none ring-ring focus-visible:ring-2"
          />
        </div>

        {message ? (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="h-11 cursor-pointer rounded-md bg-primary font-medium text-on-primary transition-colors duration-200 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy
            ? 'Aguarde…'
            : mode === 'criar'
              ? 'Criar conta'
              : 'Entrar'}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => void onGoogle()}
          className="h-11 cursor-pointer rounded-md border border-border bg-background font-medium transition-colors duration-200 hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continuar com Google
        </button>
      </form>

      <p className="mt-6 text-sm text-muted-fg">
        {mode === 'criar' ? 'Já tem conta?' : 'Primeiro acesso?'}{' '}
        <button
          type="button"
          className="cursor-pointer font-medium text-secondary underline-offset-4 hover:underline"
          onClick={() => {
            setMode(mode === 'criar' ? 'entrar' : 'criar');
            setMessage(null);
            setStatus('idle');
          }}
        >
          {mode === 'criar' ? 'Entrar' : 'Criar conta'}
        </button>
      </p>
    </main>
  );
}
