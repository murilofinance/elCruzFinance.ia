export function SetupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-secondary uppercase">
        Configuração
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">
        Falta o Firebase no site
      </h1>
      <p className="mt-4 text-muted-fg">
        Copie <code className="font-mono text-foreground">apps/web/.env.example</code>{' '}
        para <code className="font-mono text-foreground">apps/web/.env.local</code> e
        cole o <code className="font-mono text-foreground">firebaseConfig</code> do
        console. O passo a passo está em{' '}
        <code className="font-mono text-foreground">docs/PASSO-A-PASSO.md</code>,
        seção 2.1.
      </p>
      <p className="mt-4 text-sm text-muted-fg">
        Depois reinicie o <code className="font-mono">npm run dev:web</code>.
      </p>
    </main>
  );
}
