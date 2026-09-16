import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { FinanceService } from '../finance/finance.service';
import type { AiChatDto } from './ai.dto';

const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest',
];

const SYSTEM_PROMPT = `Você é o assistente financeiro do ElCruz Finance.
Responda sempre em português do Brasil, curto e direto.
Use SOMENTE os dados JSON do usuário. Não invente saldo, fatura, banco ou data.
Se o dado não estiver no JSON, diga que não encontrou.
Valores em reais. Datas em dd/mm.
Quando fizer sentido, cite o banco (Nubank, Itaú, PicPay) e o dia de vencimento.
Pode projetar o que vence nos próximos dias com base em vencimentos.
Não oriente crime, golpe ou burlar banco.`;

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
};

@Injectable()
export class AiService {
  constructor(private readonly finance: FinanceService) {}

  projections(uid: string) {
    return this.finance.listProjections(uid);
  }

  async chat(uid: string, dto: AiChatDto) {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) {
      throw new BadRequestException(
        'IA ainda não configurada. Coloque GEMINI_API_KEY na API (Vercel).',
      );
    }

    const snapshot = await this.finance.advisorContext(uid);
    const contents = [
      ...(dto.history ?? []).map((turn) => ({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.content }],
      })),
      {
        role: 'user',
        parts: [
          {
            text: `DADOS DO USUÁRIO:\n${JSON.stringify(snapshot)}\n\nPERGUNTA:\n${dto.message.trim()}`,
          },
        ],
      },
    ];

    let lastError = 'Gemini indisponível.';
    for (const model of MODELS) {
      try {
        const reply = await generateContent(key, model, contents);
        if (reply) {
          return { reply, model };
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : lastError;
      }
    }
    throw new ServiceUnavailableException(lastError);
  }
}

async function generateContent(
  key: string,
  model: string,
  contents: unknown,
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 512,
        },
      }),
      signal: AbortSignal.timeout(18000),
    },
  );
  const payload = (await response.json()) as GeminiResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Gemini ${response.status}`);
  }
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim();
  return text ?? '';
}
