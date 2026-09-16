# ElCruz Finance.AI

Controle financeiro pessoal. Na Vercel sobem o **site** e a **API NestJS** (`/api`).

## O que é cada peça

```
Navegador  →  Firebase Auth (login)
           →  Firestore (gastos, quando gravarmos pelo app)
           →  Vercel site  = apps/web
           →  Vercel /api  = NestJS (token Firebase, Pluggy, Gemini)
```

| Onde | O quê |
|---|---|
| **Vercel** (páginas) | Front: login e telas. |
| **Vercel** (`/api`) | NestJS: valida o token, fala com Firestore Admin, Pluggy e Gemini. |
| **Firebase** | Authentication + Firestore. |

Segredos (`FIREBASE_PRIVATE_KEY`, `PLUGGY_CLIENT_SECRET`, `GEMINI_API_KEY`) ficam nas Environment Variables da Vercel — nunca no JavaScript do browser.

## Rodar local

Na raiz, depois de `npm install`, **dois terminais**:

```powershell
npm run dev:web
```

http://localhost:5173

```powershell
npm run dev:api
```

http://localhost:3001/api/health

Guias: [BRAINSTORM.md](BRAINSTORM.md) · [docs/PASSO-A-PASSO.md](docs/PASSO-A-PASSO.md)
