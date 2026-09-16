import type { ReactNode } from 'react';

type BrandBackdropProps = {
  children: ReactNode;
  scrim?: string;
};

export function BrandBackdrop({
  children,
  scrim = 'bg-black/60',
}: BrandBackdropProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <img
        src="/brand/login-hero.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className={`absolute inset-0 ${scrim}`} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
