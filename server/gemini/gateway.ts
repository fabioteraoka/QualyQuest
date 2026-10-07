import { GoogleGenAI } from '@google/genai';
import { getGeminiClient } from './client';
import { geminiCache, CacheKeyOptions } from './cache';
import { geminiDedup } from './dedup';
import { geminiMetrics } from './metrics';

export interface ExecuteGeminiOptions {
  operation: string;
  contents: any;
  config?: any;
  models?: string[];
  ttlMs?: number;
  organizationId?: string;
  skipCache?: boolean;
  promptVersion?: string;
  schemaVersion?: string;
}

export interface ExecuteGeminiResult<T = any> {
  text: string;
  parsed?: T;
  fromCache: boolean;
  modelUsed: string;
  latencyMs: number;
}

/**
 * Gateway Central para a API Gemini:
 * 1. Cache determinístico normalizado
 * 2. Deduplicação de requisições idênticas em andamento (in-flight)
 * 3. Fallback inteligente com backoff exponencial e proteção contra tempestade de 429/503
 * 4. Métricas de observabilidade de latência, tokens e custos
 */
export async function executeGeminiRequest<T = any>(
  options: ExecuteGeminiOptions
): Promise<ExecuteGeminiResult<T>> {
  const {
    operation,
    contents,
    config,
    models = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'],
    ttlMs,
    organizationId = 'public',
    skipCache = false,
    promptVersion = 'v1',
    schemaVersion = 'v1',
  } = options;

  geminiMetrics.recordRequest(operation);

  // 1. Chave determinística de cache e dedup
  const cacheKeyOptions: CacheKeyOptions = {
    operation,
    input: contents,
    promptVersion,
    schemaVersion,
    model: models[0],
    organizationId,
  };
  const requestKey = geminiCache.generateKey(cacheKeyOptions);

  // 2. Consulta de Cache
  if (!skipCache) {
    const cached = geminiCache.get<ExecuteGeminiResult<T>>(requestKey, operation);
    if (cached) {
      return {
        ...cached,
        fromCache: true,
      };
    }
  }

  // 3. Deduplicação In-Flight
  return await geminiDedup.execute(requestKey, operation, async () => {
    // Dupla checagem de cache pós-espera de dedup
    if (!skipCache) {
      const cached = geminiCache.get<ExecuteGeminiResult<T>>(requestKey, operation);
      if (cached) {
        return {
          ...cached,
          fromCache: true,
        };
      }
    }

    const ai = getGeminiClient();
    if (!ai) {
      throw new Error('GEMINI_API_KEY_NOT_CONFIGURED: O cliente Gemini não está configurado no servidor.');
    }

    const startTime = Date.now();
    let lastError: any = null;
    let successfulResult: { text: string; model: string } | null = null;

    // 4. Execução resiliente com fallback ordenado
    for (const model of models) {
      try {
        let attempt = 1;
        const maxAttemptsForModel = 2;

        while (attempt <= maxAttemptsForModel) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents,
              config,
            });

            const textOutput = response.text || '';
            successfulResult = {
              text: textOutput,
              model,
            };
            break;
          } catch (err: any) {
            lastError = err;
            const status = err?.status;
            const msg = String(err?.message || '');

            const is429 = status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
            const is503 = status === 503 || msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand');
            const isNetwork = msg.includes('fetch failed') || msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT');

            if (is429) {
              geminiMetrics.record429();
              // Backoff com jitter para não causar tempestade
              const jitter = Math.floor(Math.random() * 500);
              const backoffMs = attempt * 1200 + jitter;
              console.warn(`[Gemini Gateway] 429 Rate Limit detectado no modelo ${model}. Backoff de ${backoffMs}ms...`);
              await new Promise((r) => setTimeout(r, backoffMs));
              geminiMetrics.recordRetry();
              attempt++;
              continue;
            }

            if ((is503 || isNetwork) && attempt < maxAttemptsForModel) {
              if (is503) geminiMetrics.record503();
              const backoffMs = attempt * 800 + Math.floor(Math.random() * 300);
              console.warn(`[Gemini Gateway] 503/Indisponibilidade temporária no modelo ${model}. Backoff de ${backoffMs}ms...`);
              await new Promise((r) => setTimeout(r, backoffMs));
              geminiMetrics.recordRetry();
              attempt++;
              continue;
            }

            // Se for erro de requisição malformada (400), não adianta tentar outros modelos
            if (status === 400 && !is429) {
              throw err;
            }

            // Passa para o próximo modelo com registro de fallback
            geminiMetrics.recordFallback();
            console.warn(`[Gemini Gateway] Tentando modelo alternativo após falha em ${model}:`, msg.slice(0, 120));
            break;
          }
        }

        if (successfulResult) {
          break;
        }
      } catch (modelErr: any) {
        lastError = modelErr;
      }
    }

    if (!successfulResult) {
      geminiMetrics.recordError(operation);
      throw lastError || new Error(`Falha ao obter resposta do Gemini para a operação ${operation}.`);
    }

    const latencyMs = Date.now() - startTime;
    geminiMetrics.recordLatency(latencyMs);

    // Estimativa simples de tokens para observabilidade
    const estimatedInput = typeof contents === 'string' ? Math.round(contents.length / 4) : 500;
    const estimatedOutput = Math.round(successfulResult.text.length / 4);
    geminiMetrics.recordTokens(estimatedInput, estimatedOutput);

    let parsedData: T | undefined = undefined;
    if (config?.responseMimeType === 'application/json' && successfulResult.text) {
      try {
        parsedData = JSON.parse(successfulResult.text.trim()) as T;
      } catch (parseErr) {
        console.warn(`[Gemini Gateway] Aviso ao fazer parse de JSON nativo para ${operation}:`, parseErr);
      }
    }

    const finalResult: ExecuteGeminiResult<T> = {
      text: successfulResult.text,
      parsed: parsedData,
      fromCache: false,
      modelUsed: successfulResult.model,
      latencyMs,
    };

    // 5. Armazena no cache se o resultado for válido
    if (!skipCache && (parsedData !== undefined || successfulResult.text.length > 0)) {
      geminiCache.set(requestKey, finalResult, operation, ttlMs, organizationId);
    }

    return finalResult;
  });
}
