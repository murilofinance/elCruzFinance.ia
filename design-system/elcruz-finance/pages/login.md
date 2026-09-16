# Login Page Overrides

> **PROJECT:** ElCruz Finance
> **Page Type:** Authentication

Rules here override `MASTER.md`.

---

## Layout

- Full-viewport brand image (`/brand/login-hero.jpg`), cropped **to the left** (`object-[12%_center]`) so mansion/cars stay in frame.
- Desktop: glass form aligned **left** (`~6vw`), not pinned to the right edge. Leave the right side of the photo open.
- Footer credit under the form: “Desenvolvido por Murilo Cruz Leite Machado” + © 2026. Contrast ≥4.5:1 (`#c5ddd2` on near-black).
- Mobile: stacked form + footer; 55% scrim. Labels stay on inputs (never placeholder-only).
- Skip “product tour” / glitch / scanline gimmicks on this page — impatient users need the form immediately.

## Color

- Neon green CTA on near-black glass (`bg-black/70` + `backdrop-blur`).
- Focus ring `#00E68A`, 2px. Never placeholder-only fields.
- Error text `#FF5A5A` plus `role="alert"`.

## Motion

- Hover/focus 150–300ms. Honor `prefers-reduced-motion`.
- Submit shows loading label + `aria-busy` before success/error.

## Copy

- Brand: **ElCruz Finance.AI**
- CTA: Entrar / Criar conta / Continuar com Google
