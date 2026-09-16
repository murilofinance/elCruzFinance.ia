import type { ReactNode } from 'react';

type BrandBackdropProps = {
  children: ReactNode;
  scrim?: string;
  imagePosition?: string;
};

export function BrandBackdrop({
  children,
  scrim = 'bg-black/60',
  imagePosition = 'object-left',
}: BrandBackdropProps) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <img
        src="/brand/login-hero.jpg"
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-cover ${imagePosition}`}
      />
      <div className={`absolute inset-0 ${scrim}`} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
