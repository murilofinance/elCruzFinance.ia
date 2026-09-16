# Minhas finanças

Sistema web pessoal de controle financeiro (NestJS + Firebase + Vercel).

## Comece por aqui

1. **O que construir e as regras de negócio:** [BRAINSTORM.md](BRAINSTORM.md)
2. **O que você precisa clicar e configurar:** [docs/PASSO-A-PASSO.md](docs/PASSO-A-PASSO.md)

## Rodar local

```bash
npm install
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env.local
```

Preencha os `.env` com o Firebase (passo 2 do guia). Depois, em dois terminais:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

Site: http://localhost:5173  
API: http://localhost:3001/api/health
