# Passo a passo — contas, configuração e ambiente

Este guia traduz as regras do [BRAINSTORM.md](../BRAINSTORM.md) em ações concretas: o que clicar, o que copiar e o que ainda falta criar.

Use o Gmail **novo** em todas as plataformas (Firebase, Pluggy, Vercel, Gemini). Assim o projeto fica isolado da sua conta pessoal.

---

## 0. Mapa rápido

| Conta | Status | Quando precisa |
|---|---|---|
| Gmail novo | Você já criou | Já |
| Firebase | Você já criou | Já (Auth + Firestore nesta fase) |
| Meu Pluggy (`meu.pluggy.ai`) | Você já criou | Fase 3 (Nubank) |
| **Pluggy Dashboard** (`dashboard.pluggy.ai`) | **Falta criar** | Fase 3 — é outra conta, não é a do Meu Pluggy |
| **Vercel** | **Falta criar** | Quando for publicar na internet |
| **Google AI Studio** (Gemini) | **Falta criar** | Fase 2 (OCR de print) |
| Node.js 20+ | Já está na máquina (`v24`) | Já |

Não precisa de: Belvo, conta de banco extra, cartão de crédito (plano Spark do Firebase e Hobby da Vercel são grátis).

---

## 1. O que cada plataforma faz (em português claro)

| Ferramenta | Analogia | O que você configura |
|---|---|---|
| **Firebase Authentication** | O porteiro. Guarda e-mail/senha e emite um crachá (token). | Login Google e/ou e-mail. |
| **Firestore** | O caderno. Contas, cartões, dívidas e gastos. | Banco + regras de segurança. |
| **Firebase Storage** | O armário de fotos. Prints de despesa. | Só na fase do OCR. |
| **Conta de serviço (service account)** | Uma chave de funcionário. O NestJS usa para ler/escrever no caderno **sem** passar pelas regras do browser. | Arquivo JSON que **nunca** vai para o Git. |
| **Regras do Firestore** | Tranca da gaveta. Mesmo que alguém tente no browser, só vê `users/{seuUid}`. | Arquivo `firebase/firestore.rules`. |
| **Meu Pluggy** | Você autoriza a Nubank (Open Finance). | Consentimento no app da Nubank. |
| **Pluggy Dashboard** | Credenciais de API (`client_id` / `client_secret`) para o NestJS puxar esses dados. | Aplicação de desenvolvimento. |
| **Vercel** | O servidor na internet. Sobe o site e a API NestJS em `/api`. | Projeto ligado ao Git + variáveis de ambiente. |
| **Gemini (AI Studio)** | Lê o print e devolve JSON (loja, valor, data). | Chave de API. |

O **browser nunca** usa a conta de serviço. O site só faz login no Firebase e manda o crachá (`Authorization: Bearer ...`) para o NestJS. O NestJS valida o crachá e só então toca no Firestore.

---

## 2. Firebase — o que fazer agora

Abra [console.firebase.google.com](https://console.firebase.google.com) com o Gmail novo e entre no projeto.

### 2.1 Criar o app Web (se ainda não criou)

1. Ícone de engrenagem → **Configurações do projeto**.
2. Em **Seus apps**, clique em `</>` (Web).
3. Apelido: `minhas-financas-web`.
4. **Não** marque Hosting do Firebase (vamos usar Vercel).
5. Copie o objeto `firebaseConfig`. Você vai colar no arquivo `apps/web/.env.local` (modelo em `apps/web/.env.example`).

Campos que você precisa:

```
apiKey
authDomain
projectId
storageBucket
messagingSenderId
appId
```

### 2.2 Ligar o Authentication

1. Menu **Build** → **Authentication** → **Começar**.
2. Aba **Sign-in method**.
3. Ative **E-mail/senha** (o primeiro interruptor; *não* precisa de “E-mail link”).
4. Ative **Google**:
   - E-mail de suporte: o Gmail novo.
   - Salve.
5. Aba **Settings** → **Authorized domains**:
   - `localhost` já vem.
   - Depois do deploy, adicione o domínio da Vercel (`seu-projeto.vercel.app`).

### 2.3 Criar o Firestore

1. Menu **Build** → **Firestore Database** → **Criar banco**.
2. Modo: **Começar no modo de produção** (vamos mandar as regras pelo arquivo do projeto).
3. Local: escolha **`southamerica-east1` (São Paulo)** — mais perto e em conformidade com dado financeiro.
4. Confirme.

Ainda não precisa criar coleções na mão. O NestJS cria `users/{uid}` no primeiro login.

### 2.4 Conta de serviço (para o NestJS)

1. Configurações do projeto → aba **Contas de serviço**.
2. **Gerar nova chave privada** → confirma → baixa um `.json`.
3. Guarde **fora do Git** (ex.: pasta Downloads, depois copia os valores para `apps/api/.env`).
4. No JSON, use estes campos no `apps/api/.env`:

| Campo no JSON | Variável no `.env` |
|---|---|
| `project_id` | `FIREBASE_PROJECT_ID` |
| `client_email` | `FIREBASE_CLIENT_EMAIL` |
| `private_key` | `FIREBASE_PRIVATE_KEY` (entre aspas, com `\n` nas quebras) |

Exemplo:

```env
FIREBASE_PROJECT_ID=seu-projeto-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@seu-projeto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nABC...\n-----END PRIVATE KEY-----\n"
```

Se o login da API falhar com erro de chave, o problema mais comum é a `private_key` sem aspas ou sem `\n`.

### 2.5 Publicar as regras de segurança

As regras do repositório estão em `firebase/firestore.rules`. Elas dizem:

- sem login → nada
- com login → só `users/{seuUid}/**`

**Pelo console (mais simples agora):**

1. Firestore → aba **Regras**.
2. Apague o conteúdo e cole o de `firebase/firestore.rules`.
3. **Publicar**.

**Pela CLI (opcional, depois):**

```bash
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

O arquivo `firebase.json` na raiz já aponta para essas regras.

### 2.6 Storage (só quando formos ler print)

Pode pular hoje. Quando chegar a fase OCR:

1. **Build** → **Storage** → começar.
2. Cole `firebase/storage.rules` e publique.

---

## 3. Pluggy — duas contas diferentes

Você já tem o **Meu Pluggy**. Isso autoriza o banco. Ainda falta o **Dashboard**, que entrega a chave da API.

Não faça o passo 3.2 até a Fase 3. Só crie a conta do Dashboard para não perder o trial de 15 dias antes da hora: o trial começa quando a aplicação de desenvolvimento é criada. **Crie a conta agora; crie a Application só quando formos ligar a Nubank.**

### 3.1 Criar o Dashboard (fazer agora)

1. Abra [dashboard.pluggy.ai](https://dashboard.pluggy.ai) com o **mesmo Gmail**.
2. Cadastre-se (é outro portal, mesmo e-mail).
3. Pronto. Não clique em “Ir para produção”. Não crie Application ainda.

### 3.2 Quando formos ligar a Nubank (Fase 3)

Faça nesta ordem, no mesmo dia:

1. No [Meu Pluggy](https://meu.pluggy.ai): conectar **Nubank** (fluxo oficial no app do banco).
2. No Dashboard: criar **Application** de **Development**.
3. Ativar o conector **MeuPluggy** (conector 200) na lista — **não** escolha “Nubank” direto (esse é o plano pago e para no trial).
4. Abrir a **Demo** da application e autorizar o Meu Pluggy (uma vez por banco).
5. Copiar `client_id`, `client_secret` e o `itemId` para `apps/api/.env`.

```env
PLUGGY_CLIENT_ID=
PLUGGY_CLIENT_SECRET=
PLUGGY_ITEM_ID=
```

Consentimento no app da Nubank dura cerca de 12 meses; você pode revogar em Configurações → Open Finance.

---

## 4. Vercel

Na Vercel sobem o **site** (`apps/web/dist`) e a **API NestJS** em `/api`. A home é arquivo estático; só caminhos `/api/...` chamam o Nest. Root Directory deve ser a **raiz do repositório**, não `apps/api`.

1. Vercel → Project → Settings → General
   - Root Directory: vazio (raiz do repositório)
   - Framework Preset: Other
2. Settings → Environment Variables (Production), a partir de `apps/api/.env`:

```
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
WEB_ORIGIN=https://el-cruz-finance-ia.vercel.app
PLUGGY_CLIENT_ID
PLUGGY_CLIENT_SECRET
PLUGGY_ITEM_ID
GEMINI_API_KEY
```

`FIREBASE_PRIVATE_KEY` vai entre aspas, com `\n` nas quebras, igual ao `.env` local.

3. Firebase Authentication → Settings → Authorized domains → adicionar `el-cruz-finance-ia.vercel.app`.
4. Depois do deploy, abra `https://el-cruz-finance-ia.vercel.app/api/health`. Deve devolver `ok: true` e `firebase` / `pluggy` conforme as variáveis.

---

## 5. Google AI Studio / Gemini (Fase 2)

1. Abra [aistudio.google.com](https://aistudio.google.com) com o Gmail novo.
2. **Get API key** → criar chave no mesmo projeto Google Cloud do Firebase, se pedir.
3. Cole em `apps/api/.env`:

```env
GEMINI_API_KEY=
```

A cota grátis muda por conta. Use **Flash-Lite** para OCR. Não envie o extrato inteiro para o modelo.

---

## 6. Ambiente local (dependências)

### 6.1 Já precisa estar instalado

| Software | Para quê | Como conferir |
|---|---|---|
| Node.js 20 ou 22 (você tem 24) | Rodar API e site | `node -v` |
| npm (você tem 11) | Instalar pacotes | `npm -v` |
| Git | Versionar | `git -v` |

Não precisa de Python, Docker, banco Postgres nem Redis.

### 6.2 Pacotes que o projeto instala (`npm install`)

**API (`apps/api`)**

| Pacote | Para quê |
|---|---|
| `@nestjs/common` `@nestjs/core` `@nestjs/platform-express` | Servidor NestJS |
| `firebase-admin` | Validar login e gravar no Firestore |
| `class-validator` `class-transformer` | Validar o que chega na API |
| `reflect-metadata` `rxjs` | Exigidos pelo Nest |

**Site (`apps/web`)**

| Pacote | Para quê |
|---|---|
| `react` `react-dom` `react-router-dom` | Telas e rotas |
| `firebase` | Login no browser |
| `vite` `typescript` `tailwindcss` | Build, tipos e estilo |

### 6.3 Subir na sua máquina

Na raiz do projeto:

```bash
npm install
```

Copie os exemplos de ambiente:

```bash
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env.local
```

Preencha com os valores da seção 2.

Dois terminais:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

- API: [http://localhost:3001](http://localhost:3001)
- Site: [http://localhost:5173](http://localhost:5173)

Abra o site, crie a conta com o Gmail novo (ou Google), e você deve ver a tela logada com o seu `uid`. A API responde em `/api/me` só com o token válido.

---

## 7. Checklist desta fase (login)

Faça nesta ordem:

1. [ ] App Web no Firebase e `firebaseConfig` no `.env.local`
2. [ ] Authentication: e-mail/senha + Google
3. [ ] Firestore em `southamerica-east1`, regras publicadas
4. [ ] JSON da conta de serviço → `apps/api/.env`
5. [ ] Conta no [dashboard.pluggy.ai](https://dashboard.pluggy.ai) (sem criar Application ainda)
6. [ ] `npm install` + `npm run dev:api` + `npm run dev:web`
7. [ ] Login no localhost e `/api/me` retorna o seu usuário
8. [ ] No Firestore, aparece `users/{seuUid}`

Vercel e Gemini podem esperar.

---

## 8. Onde estão os arquivos deste guia no código

| Arquivo | Função |
|---|---|
| `apps/web/.env.example` | Config pública do Firebase (site) |
| `apps/api/.env.example` | Conta de serviço + Pluggy + Gemini |
| `firebase/firestore.rules` | Tranca dos dados |
| `firebase/storage.rules` | Tranca dos prints (depois) |
| `apps/api/src/auth` | Guard que valida o token |
| `apps/web/src/auth` | Tela de login |
