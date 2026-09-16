# Login Page Overrides

> **PROJECT:** ElCruz Finance
> **Page Type:** Authentication

Rules here override `MASTER.md`.

---

## Layout

- Full-viewport brand image (`/brand/login-hero.jpg`) as the immersive layer.
- Desktop (`lg+`): image occupies the left; glass form on the right (max 420px).
- Mobile: same image as background with a **55–65% black scrim** so the form meets 4.5:1 contrast. Do not rely on the photo text for the heading.
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
