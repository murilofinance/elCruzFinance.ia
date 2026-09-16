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
