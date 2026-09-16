# ElCruz Finance.AI

Controle financeiro pessoal. **Na Vercel sobe só o site.** A API NestJS fica no seu PC até a gente ligar Pluggy e Gemini.

## O que é cada peça

```
Navegador  →  Firebase Auth (login)
           →  Firestore (gastos, quando gravarmos pelo app)
           →  Vercel = pasta apps/web (HTML/CSS/JS)

Seu PC     →  NestJS em localhost:3001
              (Pluggy, Gemini, cron — chaves secretas que NÃO podem ir ao browser)
```

| Onde | O quê |
|---|---|
| **Vercel** (`el-cruz-finance-ia.vercel.app`) | Front: login e telas. Fala direto com o Firebase. |
| **Firebase** | Authentication + Firestore. Já é o “backend” de dados e login. |
| **NestJS (local)** | Só quando precisarmos de segredo: Open Finance (Pluggy) e OCR (Gemini). |

Não precisamos da API no ar para o login funcionar. Precisaremos dela depois para Nubank automática e leitura de print — o `client_secret` da Pluggy e a chave do Gemini não podem ficar no JavaScript público.

## Rodar local

Na raiz, depois de `npm install`, **dois terminais**:

```powershell
npm run dev:web
```

http://localhost:5173

```powershell
npm run dev:api
```

http://localhost:3001/api/health — opcional agora; o login não depende disso.

Guias: [BRAINSTORM.md](BRAINSTORM.md) · [docs/PASSO-A-PASSO.md](docs/PASSO-A-PASSO.md)
