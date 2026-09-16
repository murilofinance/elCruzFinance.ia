import type { Account, CreditCard, LedgerTransaction } from './api';

export function historySourceTag(
  item: LedgerTransaction,
  accounts: Account[],
  cards: CreditCard[],
): string {
  if (item.cardId) {
    const card = cards.find((row) => row.id === item.cardId);
    if (card) {
      return shortBankLabel(card.institution, card.name);
    }
  }
  if (item.accountId) {
    const account = accounts.find((row) => row.id === item.accountId);
    if (account) {
      const bank = shortBankLabel(account.institution, account.name);
      return account.kind === 'savings' ? `${bank} Poupança` : bank;
    }
  }
  return item.source === 'open_finance' ? 'Open Finance' : 'Manual';
}

export function shortBankLabel(
  institution?: string | null,
  name?: string | null,
): string {
  const blob = `${name ?? ''} ${institution ?? ''}`.toLowerCase();
  if (blob.includes('nubank') || blob.includes('nu pagamentos')) {
    return 'Nubank';
  }
  if (blob.includes('picpay') || blob.includes('pic pay')) {
    return 'PicPay';
  }
  if (blob.includes('mercado pago') || blob.includes('mercadopago')) {
    return 'Mercado Pago';
  }
  if (blob.includes('itau') || blob.includes('itaú')) {
    return 'Itaú';
  }
  if (blob.includes('bradesco')) {
    return 'Bradesco';
  }
  if (blob.includes('santander')) {
    return 'Santander';
  }
  if (blob.includes('caixa')) {
    return 'Caixa';
  }
  if (/\bxp\b/.test(blob) || blob.includes('xp investimento')) {
    return 'XP';
  }
  if (blob.includes('banco inter') || /\binter\b/.test(blob)) {
    return 'Inter';
  }
  if (blob.includes('c6')) {
    return 'C6';
  }
  const raw = (name || institution || 'Conta').replace(/\s+/g, ' ').trim();
  if (/^meu\s*pluggy$/i.test(raw)) {
    return 'Open Finance';
  }
  return raw.length > 16 ? `${raw.slice(0, 14)}…` : raw;
}

const TAG_BASE =
  'inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] tracking-wide uppercase';

export function bankTagClass(label: string): string {
  const key = label.toLowerCase();
  if (key.includes('nubank')) {
    return `${TAG_BASE} border-[#820AD1]/45 bg-[#820AD1]/20 text-[#E0B3FF]`;
  }
  if (key.includes('itaú') || key.includes('itau')) {
    return `${TAG_BASE} border-[#EC7000]/50 bg-[#EC7000]/20 text-[#FFB060]`;
  }
  if (key.includes('picpay')) {
    return `${TAG_BASE} border-[#9EFFC9]/40 bg-[#21C25E]/20 text-[#B8FFD4]`;
  }
  if (key.includes('mercado')) {
    return `${TAG_BASE} border-[#00A650]/40 bg-[#006B3F]/45 text-[#8FE8B8]`;
  }
  if (key.includes('caixa')) {
    return `${TAG_BASE} border-[#3B9BFF]/40 bg-[#005CA9]/30 text-[#9DCCFF]`;
  }
  if (key === 'xp' || key.startsWith('xp ')) {
    return `${TAG_BASE} border-white/25 bg-black text-white`;
  }
  if (key.includes('bradesco')) {
    return `${TAG_BASE} border-[#CC092F]/45 bg-[#CC092F]/20 text-[#FF9AAD]`;
  }
  if (key.includes('santander')) {
    return `${TAG_BASE} border-[#EC0000]/45 bg-[#EC0000]/20 text-[#FF8A8A]`;
  }
  if (key.includes('inter')) {
    return `${TAG_BASE} border-[#FF7A00]/45 bg-[#FF7A00]/15 text-[#FFC48A]`;
  }
  if (key.includes('c6')) {
    return `${TAG_BASE} border-white/20 bg-[#111111] text-[#F3F3F3]`;
  }
  return `${TAG_BASE} border-white/15 bg-white/8 text-muted-fg`;
}
