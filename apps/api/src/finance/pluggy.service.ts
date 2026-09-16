import { BadRequestException, Injectable } from '@nestjs/common';

const PLUGGY_API = 'https://api.pluggy.ai';

export type PluggyAccount = {
  id: string;
  type: 'BANK' | 'CREDIT';
  subtype?: string | null;
  name?: string | null;
  marketingName?: string | null;
  balance?: number | null;
  creditData?: {
    creditLimit?: number | null;
    availableCreditLimit?: number | null;
    balanceCloseDate?: string | null;
    balanceDueDate?: string | null;
  } | null;
};

export type PluggyTransaction = {
  id: string;
  accountId: string;
  description?: string | null;
  descriptionRaw?: string | null;
  amount: number;
  date: string;
  type?: 'DEBIT' | 'CREDIT' | string;
  status?: string | null;
};

type AuthResponse = { apiKey?: string };
type AccountsResponse = { results?: PluggyAccount[] };
type TransactionsResponse = {
  results?: PluggyTransaction[];
  next?: string | null;
};
type ItemResponse = {
  id?: string;
  status?: string;
  connector?: { name?: string | null } | null;
};

export type PluggySnapshot = {
  connectorName: string;
  itemStatus: string;
  accounts: PluggyAccount[];
  transactions: PluggyTransaction[];
};

@Injectable()
export class PluggyService {
  async fetchSnapshot(input: {
    clientId: string;
    clientSecret: string;
    itemId: string;
  }): Promise<PluggySnapshot> {
    const apiKey = await this.authenticate(input.clientId, input.clientSecret);
    const [item, accounts] = await Promise.all([
      this.request<ItemResponse>(`/items/${input.itemId}`, apiKey),
      this.request<AccountsResponse>(
        `/accounts?itemId=${encodeURIComponent(input.itemId)}`,
        apiKey,
      ),
    ]);

    const remoteAccounts = accounts.results ?? [];
    const dateFrom = daysAgo(90);
    const transactions: PluggyTransaction[] = [];
    for (const account of remoteAccounts) {
      const page = await this.fetchAccountTransactions(apiKey, account.id, dateFrom);
      transactions.push(...page);
    }

    return {
      connectorName: item.connector?.name?.trim() || 'Open Finance',
      itemStatus: item.status ?? 'UNKNOWN',
      accounts: remoteAccounts,
      transactions,
    };
  }

  private async fetchAccountTransactions(
    apiKey: string,
    accountId: string,
    dateFrom: string,
  ): Promise<PluggyTransaction[]> {
    const collected: PluggyTransaction[] = [];
    let path = `/v2/transactions?accountId=${encodeURIComponent(accountId)}&dateFrom=${dateFrom}`;
    for (let page = 0; page < 3; page += 1) {
      const payload = await this.request<TransactionsResponse>(path, apiKey);
      collected.push(...(payload.results ?? []));
      if (!payload.next) {
        break;
      }
      path = payload.next.startsWith('/v2')
        ? payload.next
        : `/v2/transactions${payload.next}`;
    }
    return collected;
  }

  private async authenticate(clientId: string, clientSecret: string): Promise<string> {
    const payload = await this.request<AuthResponse>('/auth', undefined, {
      method: 'POST',
      body: { clientId, clientSecret },
    });
    if (!payload.apiKey) {
      throw new BadRequestException('A Pluggy não devolveu a apiKey.');
    }
    return payload.apiKey;
  }

  private async request<T>(
    path: string,
    apiKey?: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (init.body) {
      headers['Content-Type'] = 'application/json';
    }
    if (apiKey) {
      headers['X-API-KEY'] = apiKey;
    }

    let response: Response;
    try {
      response = await fetch(`${PLUGGY_API}${path}`, {
        method: init.method ?? 'GET',
        headers,
        body: init.body ? JSON.stringify(init.body) : undefined,
        signal: AbortSignal.timeout(18_000),
      });
    } catch {
      throw new BadRequestException(
        'Não foi possível falar com a Pluggy. Tente de novo em instantes.',
      );
    }

    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      codeDescription?: string;
    } | null;

    if (!response.ok) {
      throw new BadRequestException(mapPluggyError(response.status, payload));
    }

    return payload as T;
  }
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function mapPluggyError(
  status: number,
  payload: { message?: string; codeDescription?: string } | null,
): string {
  if (status === 401) {
    return 'Credenciais Pluggy inválidas. Confira client_id e client_secret.';
  }
  if (status === 404) {
    return 'itemId não encontrado. Confira o ID da conexão no Meu Pluggy.';
  }
  if (status === 403) {
    return 'A Pluggy recusou o acesso a esse item. Use o conector Meu Pluggy (200).';
  }
  const detail = payload?.codeDescription || payload?.message;
  if (detail && !/secret|apiKey|token/i.test(detail)) {
    return `Pluggy: ${detail}`;
  }
  return `A Pluggy recusou a conexão (${status}).`;
}
