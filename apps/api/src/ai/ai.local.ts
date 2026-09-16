export type AdvisorSnapshot = {
  hoje: string;
  disponivelSeguro: number;
  caixa: number;
  investimentos?: number;
  faturasAbertas: number;
  parcelasAbertas: number;
  contas?: Array<{
    banco: string;
    nome: string;
    saldo: number;
  }>;
  cartoes: Array<{
    banco?: string;
    nome: string;
    fatura: number;
    venceDia?: number;
  }>;
  emprestimos?: Array<{
    credor: string;
    parcela: number;
    venceDia?: number;
  }>;
  boletos?: Array<{
    nome: string;
    parcela: number;
    vezes?: number;
    venceDia?: number;
  }>;
  vencimentos: Array<{
    tipo: string;
    nome: string;
    valor: number;
    venceEm: string;
    atrasado?: boolean;
  }>;
  extratoRecente: Array<{
    data: string;
    tipo: string;
    valor: number;
    descricao: string;
    origem: string;
  }>;
};

export function localAdvisorReply(
  message: string,
  data: AdvisorSnapshot,
): string | null {
  const asked = message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const target = parseAskedDate(message, data.hoje);

  if (target && /pagar|vence|venc|preciso|precisar/.test(asked)) {
    return replyForDate(target, data);
  }
  if (
    /proximos dias|o que vence|preciso pagar|precisar pagar|o que pagar/.test(
      asked,
    )
  ) {
    return replyUpcoming(data);
  }
  if (/fatura/.test(asked) && /cartao|cartoes/.test(asked)) {
    return replyCards(data);
  }
  if (/banco/.test(asked) && /sai|saida|gast/.test(asked)) {
    return replyBankOutflow(data);
  }
  if (/disponivel|posso gastar|safe/.test(asked)) {
    return `Disponível seguro agora: ${brl(data.disponivelSeguro)}.\n- Caixa: ${brl(data.caixa)}\n- Faturas: ${brl(data.faturasAbertas)}\n- Parcelas: ${brl(data.parcelasAbertas)}`;
  }
  return null;
}

export function fallbackAdvisorReply(data: AdvisorSnapshot): string {
  return replyUpcoming(data);
}

function replyForDate(iso: string, data: AdvisorSnapshot): string {
  const items = data.vencimentos.filter((item) => item.venceEm === iso);
  const day = formatDay(iso);
  if (items.length === 0) {
    return `Nenhum vencimento cadastrado em ${day}.`;
  }
  const total = items.reduce((sum, item) => sum + item.valor, 0);
  const lines = items.map(
    (item) => `- ${labelOf(item.tipo)} ${item.nome}: ${brl(item.valor)}`,
  );
  return `Em ${day} você precisa pagar ${brl(total)}:\n${lines.join('\n')}`;
}

function replyUpcoming(data: AdvisorSnapshot): string {
  if (data.vencimentos.length === 0) {
    return 'Não há faturas nem parcelas com vencimento à vista.';
  }
  const horizon = shiftDays(data.hoje, 14);
  const soon = data.vencimentos.filter(
    (item) => item.atrasado || item.venceEm <= horizon,
  );
  const list = soon.length > 0 ? soon : data.vencimentos.slice(0, 8);
  const late = list.filter((item) => item.atrasado);
  const next = list.filter((item) => !item.atrasado);
  const total = list.reduce((sum, item) => sum + item.valor, 0);
  const blocks: string[] = [`A pagar nos próximos dias: ${brl(total)}.`];
  if (late.length > 0) {
    blocks.push('Atrasados:');
    blocks.push(
      ...late.map(
        (item) => `- ${item.nome}: ${brl(item.valor)} (venceu ${formatDay(item.venceEm)})`,
      ),
    );
  }
  if (next.length > 0) {
    blocks.push('Próximos:');
    blocks.push(
      ...next.map(
        (item) => `- ${formatDay(item.venceEm)} · ${item.nome}: ${brl(item.valor)}`,
      ),
    );
  }
  const contas = data.contas ?? [];
  if (contas.length > 0) {
    blocks.push('Saldo em contas:');
    blocks.push(
      ...contas.map((item) => `- ${item.banco}: ${brl(item.saldo)}`),
    );
    blocks.push(`Total em caixa: ${brl(data.caixa)}`);
  }
  return blocks.join('\n');
}

function shiftDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function replyCards(data: AdvisorSnapshot): string {
  if (data.cartoes.length === 0) {
    return 'Nenhum cartão cadastrado.';
  }
  const lines = data.cartoes.map((item) => {
    const due = item.venceDia ? ` · vence dia ${item.venceDia}` : '';
    return `- ${item.banco || item.nome}: ${brl(item.fatura)}${due}`;
  });
  return `Faturas:\n${lines.join('\n')}\nTotal: ${brl(data.faturasAbertas)}`;
}

function replyBankOutflow(data: AdvisorSnapshot): string {
  const month = data.hoje.slice(0, 7);
  const totals = new Map<string, number>();
  for (const item of data.extratoRecente) {
    if (!item.data.startsWith(month)) {
      continue;
    }
    if (item.tipo === 'income') {
      continue;
    }
    totals.set(item.origem, (totals.get(item.origem) ?? 0) + item.valor);
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) {
    return 'Não achei saídas deste mês no extrato recente.';
  }
  const lines = ranked.map(([bank, amount]) => `- ${bank}: ${brl(amount)}`);
  return `Saídas deste mês:\n${lines.join('\n')}\nQuem mais saiu: ${ranked[0][0]}`;
}

function parseAskedDate(message: string, today: string): string | null {
  const match = message.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (!match) {
    return null;
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const [yearNow] = today.split('-').map(Number);
  const year = match[3]
    ? Number(match[3].length === 2 ? `20${match[3]}` : match[3])
    : yearNow;
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (iso < today && !match[3]) {
    return `${year + 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return iso;
}

function labelOf(tipo: string): string {
  if (tipo === 'fatura') {
    return 'Fatura';
  }
  if (tipo === 'boleto') {
    return 'Boleto';
  }
  return 'Parcela';
}

function formatDay(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

function brl(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
