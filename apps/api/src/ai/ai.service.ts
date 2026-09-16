import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { FinanceService } from '../finance/finance.service';
import type { AiChatDto } from './ai.dto';
import { localAdvisorReply, type AdvisorSnapshot } from './ai.local';

const MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
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
  error?: { message?: string; status?: string };
};

@Injectable()
export class AiService {
  constructor(private readonly finance: FinanceService) {}

  projections(uid: string) {
    return this.finance.listProjections(uid);
  }

  async chat(uid: string, dto: AiChatDto) {
    const snapshot = (await this.finance.advisorContext(
      uid,
    )) as AdvisorSnapshot;
    const local = localAdvisorReply(dto.message.trim(), snapshot);
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) {
      if (local) {
        return { reply: local, model: 'local' };
      }
      throw new BadRequestException(
        'IA ainda não configurada. Coloque GEMINI_API_KEY na API (Vercel).',
      );
    }

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

    for (const model of MODELS) {
      const reply = await generateContent(key, model, contents);
      if (reply) {
        return { reply, model };
      }
    }

    if (local) {
      return { reply: local, model: 'local' };
    }
    return {
      reply:
        'O Gemini está ocupado agora. Olhe Próximos pagamentos ao lado, ou tente de novo em instantes.',
      model: 'local',
    };
  }
}

async function generateContent(
  key: string,
  model: string,
  contents: unknown,
): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
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
          signal: AbortSignal.timeout(12000),
        },
      );
      const payload = (await response.json()) as GeminiResponse;
      if (response.status === 429 || response.status === 503) {
        await wait(400 * (attempt + 1));
        continue;
      }
      if (!response.ok) {
        return null;
      }
      const text = payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('')
        .trim();
      return text || null;
    } catch {
      await wait(400 * (attempt + 1));
    }
  }
  return null;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
