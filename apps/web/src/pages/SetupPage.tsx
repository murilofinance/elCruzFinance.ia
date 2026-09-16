import { BrandBackdrop } from '../components/BrandBackdrop';

export function SetupPage() {
  return (
    <BrandBackdrop scrim="bg-black/70">
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
        <div className="rounded-xl border border-border bg-black/70 p-8 backdrop-blur-md">
          <p className="font-display text-[11px] font-bold tracking-[0.28em] text-secondary uppercase">
            Configuração
          </p>
          <h1 className="font-display mt-3 text-3xl font-black tracking-tight">
            Falta o Firebase no site
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-fg">
            Em local, copie{' '}
            <code className="text-foreground">apps/web/.env.example</code> para{' '}
            <code className="text-foreground">apps/web/.env.local</code>. Na
            Vercel o build usa{' '}
            <code className="text-foreground">apps/web/.env.production</code>.
          </p>
        </div>
      </main>
    </BrandBackdrop>
  );
}
