import { BrandBackdrop } from '../components/BrandBackdrop';

export function SessionLoading({ label = 'Carregando sessão…' }: { label?: string }) {
  return (
    <BrandBackdrop scrim="bg-black/70">
      <main className="grid min-h-screen place-items-center px-6">
        <p className="font-display text-sm tracking-[0.2em] text-secondary uppercase">
          {label}
        </p>
      </main>
    </BrandBackdrop>
  );
}
