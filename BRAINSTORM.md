# Brainstorm — Sistema web de controle financeiro pessoal

Arquitetura e escopo de negócio.

**Configuração (contas, Firebase, Pluggy, ambiente):** [docs/PASSO-A-PASSO.md](docs/PASSO-A-PASSO.md)

Front mínimo de login já está em `apps/web`. O restante da UI vem depois do livro (contas, cartão, dívida).

**Stack:** Vercel (web) + NestJS (API) + Firebase (Auth, Firestore, Storage) + Meu Pluggy (Open Finance) + Gemini (OCR e recap).

**Veredito Nubank:** não existe API pública gratuita da Nubank para um app qualquer. Para uso pessoal no seu CPF, o caminho gratuito e regulado é o **Meu Pluggy** (conector 200): você autoriza no app da Nubank e o NestJS lê saldo, extrato e cartão pela API da Pluggy. Conectar contas de outras pessoas exige plano comercial.

---

## 1. Problema

Hoje o dinheiro está espalhado: fatura de cartão, parcelas de empréstimo, saldo na Nubank, entradas de salário e gastos avulsos. O produto precisa responder, todo dia, três perguntas:

1. Quanto eu tenho de fato?
2. Quanto já está comprometido?
3. Onde estou estourando?

### Três pilares

| Pilar | O que entrega |
|---|---|
| **Posição consolidada** | Saldo em contas, fatura aberta, limite disponível e saldo devedor de empréstimos em um único quadro. |
| **Controle de gasto** | Categoria, concentração (Pareto), recorrências e alerta quando um grupo come o mês. IA aponta o que mudou, não só lista transações. |
| **Compromissos** | Empréstimo e cartão como passivos, não como “gasto do dia”. Pagamento de fatura e parcela abatem dívida e caixa ao mesmo tempo. |

### Princípio de produto

O número mais importante não é o extrato, é o **disponível seguro**: caixa líquido menos faturas que fecham, parcelas do mês e contas fixas.

- PocketGuard chama isso de *safe to spend*.
- Organizze/Mobills tratam a fatura brasileira.
- Monarch usa IA para recap semanal e split de nota fiscal.

| Pergunta do usuário | Objeto de negócio | Fonte da verdade |
|---|---|---|
| Quanto tem na Nubank agora? | `Account.currentBalance` | Open Finance (Pluggy) > manual |
| Quanto vai cair de fatura? | `CreditCard.currentInvoice` | OF do cartão, ou lançamentos do ciclo |
| Quanto ainda devo no empréstimo? | `Debt.remainingBalance` | Cadastro + parcelas pagas |
| Posso gastar hoje? | `SafeToSpend` | Derivado: caixa − compromissos do mês |
| Onde estou vazando dinheiro? | `Insight.concentration` | Transações categorizadas + IA |

---

## 2. O que o mercado valida (2026)

Fontes: Forbes Advisor, PCMag/Monarch, comparativos BR (Mobills, Organizze, Graniq, Pomar, Pluma) e Open Finance Brasil.

| Ideia | Quem usa | Levar para o nosso sistema? | Fase |
|---|---|---|---|
| Disponível seguro (caixa − contas do mês) | PocketGuard, Simplifi | Sim, KPI principal do dashboard | MVP |
| Fatura brasileira (fechamento + vencimento) | Organizze, Mobills, Nubank | Sim, cartão não é conta corrente | MVP |
| Parcelas e empréstimo como passivo | Apps BR de dívida | Sim, objeto `Debt` separado | MVP |
| Foto/print vira rascunho de transação | Monarch, SenticMoney, Graniq WhatsApp | Sim, OCR com confirmação humana | v1 |
| Split por item da nota | Monarch receipt scan | Depois; no início extrair só total + loja | v2 |
| Categorização automática + regras do usuário | Monarch, Pluma, YNAB rules | Sim: IA sugere, regra fixa vence | v1 |
| Recap semanal: o que mudou | Monarch Weekly Recap | Sim, job de insight, não chat solto | v1 |
| Detecção de assinatura / gasto recorrente | Simplifi, Origin | Sim, após 2–3 meses de histórico | v2 |
| Orçamento por envelope (todo real tem destino) | YNAB | Opcional; começar com teto por categoria | v2 |
| Open Finance nativo | Pomar/Pluggy, Graniq, Pluma | Sim, só via agregador autorizado | v1 pessoal |
| Lançamento por WhatsApp | Graniq, FinFlux | Fora do núcleo web agora | Depois |

**O que não copiar agora:** assessor humano, planejamento sucessório, negociação de boletos e FIRE completo. O diferencial é consolidar Nubank + cartão + empréstimo + print, com IA que explica o mês — não virar banco.

---

## 3. Open Finance — o que é grátis de verdade

O Open Finance Brasil é gratuito para o consumidor. **Não é gratuito montar um participante:** só instituição autorizada pelo Banco Central (ITP, com FAPI, mTLS, certificados) fala com a Nubank. Um NestJS na Vercel **não** se cadastra no diretório.

| Caminho | Custo real | Nubank de verdade? | Recomendação |
|---|---|---|---|
| API Open Finance direto (Bacen) | Licença ITP + compliance | Sim, se você for instituição | Descartar |
| **Meu Pluggy + app de desenvolvimento** | **Grátis no seu CPF (conector 200)** | Sim, consentimento no app Nubank | **Usar** |
| Pluggy comercial (clientes de terceiros) | Trial ~15 dias, depois plano alto | Sim, mas pausa após o trial | Não, app pessoal |
| Belvo produção | Sandbox grátis; produção via vendas | Sim, se contratar | Não para MVP |
| CSV / OFX / planilha da Nubank | Grátis | Sim, manual e atrasado | Fallback |
| Print da tela + OCR | Gemini free tier | Parcial (transações por foto) | Complemento |
| Scraping / senha do banco | Zero, mas viola ToS e é frágil | Instável | Proibido no produto |

### Fluxo Meu Pluggy (uso pessoal)

1. Conta em [meu.pluggy.ai](https://meu.pluggy.ai) e autorização Open Finance no app da Nubank.
2. Conta em [dashboard.pluggy.ai](https://dashboard.pluggy.ai) (portal **separado**) e aplicação de desenvolvimento.
3. Vincular o Meu Pluggy na demo da aplicação — um vínculo por instituição.
4. NestJS guarda `client_id`, `client_secret` e o `itemId`.
5. Cron diário puxa contas, transações e cartões; webhook atualiza quando a Pluggy refresca.

### Limites que entram na regra de negócio

- Consentimento costuma durar **12 meses** e pode ser revogado no app da Nubank.
- Histórico típico via OF é de até **12 meses**.
- Trial da Pluggy impede editar conectores depois; o Meu Pluggy já ligado continua.
- Não criar item duplicado no mesmo CPF/instituição — o diretório Open Finance compartilha teto de consentimentos.

### O que sincronizar da Nubank

| Dado | Efeito no sistema | Frequência |
|---|---|---|
| Saldo da conta | Atualiza `Account.currentBalance` | Diária + webhook |
| Transações da conta | Upsert por `externalId`; alimenta categorias | Diária |
| Fatura / cartão | Atualiza invoice e limite; lançamentos do ciclo | Diária |
| Iniciar Pix ou pagamento pelo nosso app | — | Fora de escopo |

---

## 4. Arquitetura

O browser **nunca** fala com Firestore Admin, Pluggy ou Gemini. Só o NestJS toca dinheiro.

```
[Web / Vercel] ──┐
                 ├──► [NestJS API] ──► Firestore
[Cron diário]  ──┘         │
                           ├──► Storage (prints)
                           ├──► Meu Pluggy (Nubank)
                           └──► Gemini Flash-Lite
```

### Vercel + NestJS

- Function única com rewrite `/* → api`.
- Auth via Firebase ID token no guard NestJS.
- Cron `/jobs/sync-open-finance` uma vez ao dia.
- Hobby: timeout ~10s. OCR de print precisa ser rápido (Flash-Lite) ou responder `202` e gravar rascunho. Se estourar, sobe o plano ou move só o worker de IA.

### Firebase

- Auth (Google / e-mail).
- Firestore como livro-razão.
- Storage para prints.
- Regras: usuário só lê/escreve `users/{uid}/**`.
- Admin SDK só no NestJS.
- Spark costuma bastar para uso pessoal.
- Sem Cloud Functions — a lógica fica no Nest para não duplicar.

### Módulos NestJS

| Módulo | Responsabilidade | Integra |
|---|---|---|
| `AuthModule` | Validar JWT Firebase, `uid` no request | Firebase Auth |
| `AccountsModule` | Contas, saldo cache, conciliação | Firestore |
| `CardsModule` | Limite, ciclo, fatura, vencimento | Firestore |
| `DebtsModule` | Empréstimos e amortização | Firestore |
| `TransactionsModule` | Lançamentos, split, categorias, regras | Firestore |
| `IngestionModule` | Pluggy sync, CSV/OFX, upload de print | Pluggy, Storage |
| `AiModule` | OCR estruturado, categoria, insights | Gemini, Storage |
| `InsightsModule` | Disponível seguro, Pareto, recap | Firestore (leitura) |

### Coleções Firestore

| Caminho | Conteúdo |
|---|---|
| `users/{uid}` | Preferências, competência atual, flags de sync |
| `users/{uid}/accounts/{id}` | Contas e saldo |
| `users/{uid}/cards/{id}` | Cartões e ciclo de fatura |
| `users/{uid}/debts/{id}` | Empréstimos |
| `users/{uid}/transactions/{id}` | Livro: toda movimentação |
| `users/{uid}/categories/{id}` | Plano de contas pessoal |
| `users/{uid}/budgets/{id}` | Teto mensal por categoria |
| `users/{uid}/receipts/{id}` | Metadado do print + JSON do OCR |
| `users/{uid}/connections/{id}` | `itemId` Pluggy, status, expiry |
| `users/{uid}/insights/{id}` | Recaps e alertas gerados |

### Segurança mínima

- Secrets só em env da Vercel.
- Prints em bucket privado.
- Gemini recebe a **imagem do recibo**, não o ledger inteiro.
- Job de insight usa resumo agregado (totais por categoria), nunca CPF nem credenciais.
- Dados do free tier do Gemini podem ser usados para treino — se isso incomodar, o insight fica 100% determinístico no NestJS.

---

## 5. Modelo de domínio

Um único livro de transações. Conta, cartão e empréstimo são origens/destinos, não ledgers paralelos. Isso evita o erro clássico de “paguei a fatura e o gasto apareceu duas vezes”.

### Entidades

**Account** — conta corrente, poupança, carteira ou Nubank. Campos: instituição, nome, moeda BRL, saldo, origem (`manual` | `open_finance`), `externalId`.

**CreditCard** — limite, dia de fechamento, dia de vencimento, fatura do ciclo, limite disponível. Compra no cartão **não** baixa a conta; sobe a fatura.

**Debt** — credor, principal, saldo devedor, taxa, valor da parcela, N de parcelas, dia de vencimento. Parcela paga reduz `remainingBalance`.

**Transaction** — `income` | `expense` | `transfer` | `card_payment` | `debt_payment`. Fonte: `manual` | `open_finance` | `ocr` | `import`. Status: `draft` | `confirmed` | `ignored`. `externalId` para dedupe.

### Tipos de transação e efeito

| Tipo | Caixa | Fatura cartão | Saldo empréstimo |
|---|---|---|---|
| Entrada (salário, Pix in) | Sobe | — | — |
| Saída na conta / Pix out | Desce | — | — |
| Compra no cartão | — | Sobe | — |
| Pagamento de fatura | Desce | Desce | — |
| Parcela de empréstimo | Desce | — | Desce |
| Transferência entre contas | Zero líquido | — | — |

### Estados de um lançamento

- **draft** — OCR ou sugestão OF ainda não aceita.
- **confirmed** — entra no saldo e nos insights.
- **ignored** — duplicata ou lixo (ex.: “pagamento recebido” interno).

Edição de categoria pelo usuário **nunca** é sobrescrita pelo próximo sync, salvo se ele marcar “sempre categorizar assim”.

---

## 6. Regras de negócio

### Livro e conciliação

| ID | Regra |
|---|---|
| R1 | Toda mudança de dinheiro vira `Transaction`. Não existe ajuste oculto de saldo. |
| R2 | Saldo da conta = saldo inicial + soma de transações confirmadas daquela conta. OF pode sobrescrever o cache de saldo da instituição; o sistema registra divergência se o livro não bater. |
| R3 | Dedupe: mesmo `externalId`; ou mesma tripla valor + data ±1d + merchant normalizado. OCR que casa com OF vira anexo, não segunda despesa. |
| R4 | Competência mensal segue a data da transação; fatura usa o ciclo (fechamento), não o calendário civil. |

### Cartão

| ID | Regra |
|---|---|
| R5 | Compra no cartão é `expense` com `cardId`, sem `accountId` de caixa. |
| R6 | Fatura aberta = soma das compras do ciclo atual − estornos. Pagamento é `card_payment` ligado a um `accountId`. |
| R7 | Parcela de compra (3/12) gera N lançamentos previstos no ciclo correspondente. Não misturar com um único lançamento + metadata. |
| R8 | Limite disponível = limite − fatura aberta − parcelas futuras já comprometidas no cartão (se rastreadas). |

### Empréstimo

| ID | Regra |
|---|---|
| R9 | Cadastro informa saldo atual, parcela, vencimento e opcionalmente taxa. Não é obrigatório reconstituir CET no MVP. |
| R10 | `debt_payment` confirma: baixa caixa e `remainingBalance` pelo valor amortizado. Se o usuário informar só o valor pago, o MVP assume que o total da parcela abate o saldo (juros vs amortização fica para v2). |
| R11 | Atraso: se `dueDay` passou e não há payment no mês, insight de risco e o compromisso entra 100% no disponível seguro. |

### Disponível seguro (fórmula do MVP)

```
SafeToSpend =
  soma dos saldos de contas líquidas
  − fatura(s) com vencimento neste mês ainda não pagas
  − parcelas de empréstimo deste mês ainda não pagas
  − contas fixas recorrentes deste mês ainda não pagas
```

Não desconta orçamento discricionário: o teto de categoria é alerta, não reserva automática.

### Ingestão e IA

| ID | Regra |
|---|---|
| R12 | OF é fonte de verdade para contas conectadas. Lançamento manual na mesma conta é permitido, mas entra em fila de conciliação se o valor já veio no extrato. |
| R13 | OCR sempre cria `draft`. Usuário confirma, edita ou descarta. Nunca posta sozinho no livro. |
| R14 | Categoria: 1) regra do usuário (merchant contém X), 2) categoria já usada nesse merchant, 3) sugestão Gemini, 4) “Sem categoria”. |
| R15 | Insight não altera saldo. Só leitura + escrita em `/insights`. |
| R16 | Alerta de concentração: categoria > 35% das saídas do mês ou merchant > 20%, excluindo moradia e parcela de empréstimo se marcados como fixos. |
| R17 | Sync OF falho não apaga histórico. Marca `connection.status = error` e mantém último saldo conhecido com timestamp. |

---

## 7. Inteligência artificial

Gemini no AI Studio tem faixa gratuita, mas a cota varia por projeto (Flash-Lite costuma ter mais requests/dia que Flash). Usar visão **só no OCR**; insights de gasto podem ser código puro no NestJS para não queimar cota nem enviar extrato completo.

| Capacidade | Modelo | Input | Output de negócio |
|---|---|---|---|
| Ler print/nota | `gemini-flash-lite` (visão) | Imagem no Storage | JSON: merchant, data, total, meio (pix/cartão), confiança |
| Sugerir categoria | Flash-Lite ou regra local | Merchant + valor + histórico curto | `categoryId` + confidence |
| Pontos de maior gasto | Determinístico | Transações do mês | Ranking categoria/merchant, MoM, alerta R16 |
| Recap semanal | Flash texto, opcional | Agregados (sem extrato linha a linha) | 3 frases: o que subiu, o que caiu, 1 ação |

### Contrato do OCR

- O modelo devolve JSON schema fixo.
- Se confiança < 0,7, o draft abre com campos vazios e a imagem ao lado.
- Se o print for da Nubank (lista de transações), o parser tenta N linhas e cria N drafts — todos passam por confirmação em lote.

---

## 8. Fases de entrega

Front só depois de o livro e as regras existirem na API.

| Fase | Status | Escopo |
|---|---|---|
| 0 | Em andamento | Este escopo: domínio, regras, stack, veredito Open Finance |
| 1 | Pendente | **MVP API** — Auth Firebase, contas, cartões, dívidas, transações manuais, fórmula SafeToSpend, seed de categorias BR |
| 2 | Pendente | Ingestão — upload print, Gemini OCR → draft, CSV/OFX, dedupe R3 |
| 3 | Pendente | Open Finance pessoal — Meu Pluggy, cron, webhook, conciliar saldo Nubank e fatura |
| 4 | Pendente | Inteligência — Pareto, alertas, recap, regras de categoria; Gemini só no texto agregado |
| 5 | Pendente | Front — dashboard, lançamento rápido, câmera/print, conciliação de drafts |

### Fora do MVP

Multiusuário, WhatsApp, iniciar Pix, investimentos, split de item de nota, CET completo do empréstimo, app nativo.

O sistema é pessoal: um `uid`, um CPF no Meu Pluggy.

### Próximo passo

Implementar a **Fase 1 da API NestJS** (módulos de contas, cartão, dívida e transação) no Firebase, ainda sem tela. Open Finance e OCR entram só com o livro já gravando certo — senão o sync duplica lixo.
