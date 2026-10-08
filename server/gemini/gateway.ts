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
  allowPublicTenant?: boolean;
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
 * 1. Isolamento multi-tenant obrigatório por organizationId
 * 2. Cache determinístico normalizado (SHA-256)
 * 3. Deduplicação de requisições idênticas em andamento (in-flight)
 * 4. Fallback inteligente com backoff exponencial e proteção contra 429/503
 * 5. Métricas de observabilidade: latência real, tokens reais e estimados
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
    organizationId,
    allowPublicTenant = false,
    skipCache = false,
    promptVersion = 'v1',
    schemaVersion = 'v1',
  } = options;

  // Validação estrita de Tenant: impede o uso acidental de 'public' em dados operacionais
  let finalOrgId = (organizationId || '').trim();
  if (!finalOrgId) {
    if (allowPublicTenant) {
      finalOrgId = 'public';
    } else {
      throw new Error(`TENANT_REQUIRED: A operação Gemini '${operation}' requer um organizationId válido para isolamento de dados.`);
    }
  }

  geminiMetrics.recordRequest(operation);

  // 1. Chave determinística de cache e dedup vinculada estritamente ao tenant
  const cacheKeyOptions: CacheKeyOptions = {
    operation,
    input: contents,
    promptVersion,
    schemaVersion,
    model: models[0],
    organizationId: finalOrgId,
  };
  const requestKey = geminiCache.generateKey(cacheKeyOptions);

  // 2. Consulta de Cache
  if (!skipCache) {
    const cached = geminiCache.get<ExecuteGeminiResult<T>>(requestKey, operation);
    if (cached) {
      return {
        ...cached,
        fromCache: true,
        latencyMs: 0,
      };
    }
  }

  // 3. Deduplicação In-Flight (isolada pela chave com tenant)
  return await geminiDedup.execute(requestKey, operation, async () => {
    // Dupla checagem de cache pós-espera de dedup
    if (!skipCache) {
      const cached = geminiCache.get<ExecuteGeminiResult<T>>(requestKey, operation);
      if (cached) {
        return {
          ...cached,
          fromCache: true,
          latencyMs: 0,
        };
      }
    }

    const ai = getGeminiClient();
    if (!ai) {
      throw new Error('GEMINI_API_KEY_NOT_CONFIGURED: O cliente Gemini não está configurado no servidor.');
    }

    const startTime = Date.now();
    let lastError: any = null;
    let successfulResult: { text: string; model: string; usageMetadata?: any } | null = null;

    // 4. Execução resiliente com fallback ordenado
    for (const model of models) {
      try {
        let attempt = 1;
        const maxAttemptsForModel = 2;

        while (attempt <= maxAttemptsForModel) {
          try {
            geminiMetrics.recordActualGeminiRequest();
            const response = await ai.models.generateContent({
              model,
              contents,
              config,
            });

            const textOutput = response.text || '';
            successfulResult = {
              text: textOutput,
              model,
              usageMetadata: (response as any).usageMetadata,
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

    // Contabilização de tokens: Reais se disponíveis via usageMetadata, senão estimados
    if (successfulResult.usageMetadata) {
      const u = successfulResult.usageMetadata;
      geminiMetrics.recordRealTokens(u.promptTokenCount, u.candidatesTokenCount, u.totalTokenCount);
    } else {
      const estimatedInput = typeof contents === 'string' ? Math.round(contents.length / 4) : 500;
      const estimatedOutput = Math.round(successfulResult.text.length / 4);
      geminiMetrics.recordTokens(estimatedInput, estimatedOutput);
    }

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

    // 5. Armazena no cache se o resultado for válido (vinculado estritamente a finalOrgId)
    if (!skipCache && (parsedData !== undefined || successfulResult.text.length > 0)) {
      geminiCache.set(requestKey, finalResult, operation, ttlMs, finalOrgId);
    }

    return finalResult;
  });
}
