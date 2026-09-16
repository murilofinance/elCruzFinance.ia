# Dashboard Page Overrides

> **PROJECT:** ElCruz Finance
> **Page Type:** Overview

Rules here override `MASTER.md`.

---

## Layout (Pluggy)

- First screen is **only** the dashboard. No form wall.
- Top bar: logo + Overview + **Adicionar** + Sair.
- Body: title Overview, 3 KPI cards (Contas | Cartões | Empréstimos), full-width evolution chart.
- Add flows (conta, cartão, empréstimo, lançamento) live in a **modal** opened by Adicionar.
- Chart: line + ~30% neon fill `#00E68A`. Empty ledger: `R$ 0,00` + dashed example + badge “Exemplo”.
- Values always visible as text. Empty cards show a muted line, not extra CTAs.

## Motion

- Hover 150–300ms. Honor `prefers-reduced-motion`.
- Modal: ESC / overlay / X to close. Focus first field.
