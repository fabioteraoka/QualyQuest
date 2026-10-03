/**
 * Cliente de Integração: Impacto Aviation MRO ↔ QualyQuest
 * 
 * Regra Arquitetural:
 * - Somente leitura: Consome a API do Impacto Aviation MRO como fonte externa oficial dos dados de manutenção.
 * - Segurança: As requisições passam pela rota proxy server-side (/api/impacto/*) para proteger a chave de API (IMPACTO_MRO_API_KEY)
 *   e evitar bloqueios de CORS no navegador.
 * - Resiliência: Se a API externa estiver temporariamente offline ou não configurada, o QualyQuest continua funcionando
 *   perfeitamente com dados locais sem interrupção de operações.
 * - Zero duplicação: Este serviço não grava dados no banco do QualyQuest de forma automática.
 */

import {
  ImpactoBase,
  ImpactoTecnico,
  ImpactoQualificacao,
  ImpactoTreinamento,
  ImpactoFerramenta,
  ImpactoOrdemServico,
  ImpactoContextoQualidadeOS,
  ImpactoApiHealth,
} from '../types/impactoMro';

export interface ImpactoApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  origem: 'Impacto Aviation MRO';
  statusConexao: 'ONLINE' | 'OFFLINE_SIMULADO' | 'ERRO';
  tempoRespostaMs?: number;
}

export interface FiltrosTecnicosImpacto {
  baseId?: string;
  ativo?: boolean;
  busca?: string;
}

export interface FiltrosFerramentasImpacto {
  baseId?: string;
  statusCalibracao?: string;
  busca?: string;
}

export interface FiltrosOrdensServicoImpacto {
  status?: string;
  baseId?: string;
  prefixoAeronave?: string;
  busca?: string;
}

class ImpactoMroApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl = '/api/impacto') {
    this.baseUrl = baseUrl;
  }

  /**
   * Helper genérico para chamadas seguras à API proxy
   */
  private async fetchApi<T>(endpoint: string, params?: Record<string, string | undefined>): Promise<ImpactoApiResponse<T>> {
    const inicio = Date.now();
    try {
      const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
      if (params) {
        Object.entries(params).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            url.searchParams.append(key, val);
          }
        });
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'QualyQuest-SGQ',
        },
      });

      const tempoRespostaMs = Date.now() - inicio;

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        return {
          success: false,
          error: errorJson?.error || `Falha HTTP ${response.status}: ${response.statusText}`,
          origem: 'Impacto Aviation MRO',
          statusConexao: 'ERRO',
          tempoRespostaMs,
        };
      }

      const json = await response.json();
      return {
        success: true,
        data: json.data !== undefined ? json.data : json,
        origem: 'Impacto Aviation MRO',
        statusConexao: json.statusConexao || 'ONLINE',
        tempoRespostaMs,
      };
    } catch (err: any) {
      const tempoRespostaMs = Date.now() - inicio;
      console.warn(`[Impacto MRO API Client] Erro ao consultar endpoint ${endpoint}:`, err);
      return {
        success: false,
        error: err?.message || 'Serviço de integração do Impacto Aviation MRO indisponível no momento.',
        origem: 'Impacto Aviation MRO',
        statusConexao: 'ERRO',
        tempoRespostaMs,
      };
    }
  }

  /**
   * Verifica o status de saúde e conectividade da API do Impacto Aviation MRO
   */
  async checkHealth(): Promise<ImpactoApiResponse<ImpactoApiHealth>> {
    return this.fetchApi<ImpactoApiHealth>('/status');
  }

  /**
   * Lista as bases operacionais do Impacto Aviation MRO
   */
  async getBases(): Promise<ImpactoApiResponse<ImpactoBase[]>> {
    return this.fetchApi<ImpactoBase[]>('/bases');
  }

  /**
   * Consulta os técnicos cadastrados no Impacto Aviation MRO
   */
  async getTecnicos(filtros?: FiltrosTecnicosImpacto): Promise<ImpactoApiResponse<ImpactoTecnico[]>> {
    const params: Record<string, string | undefined> = {
      baseId: filtros?.baseId,
      ativo: filtros?.ativo !== undefined ? String(filtros.ativo) : undefined,
      busca: filtros?.busca,
    };
    return this.fetchApi<ImpactoTecnico[]>('/tecnicos', params);
  }

  /**
   * Obtém detalhes de um técnico específico pelo ID estável
   */
  async getTecnicoById(id: string): Promise<ImpactoApiResponse<ImpactoTecnico>> {
    if (!id) return { success: false, error: 'ID do técnico obrigatório', origem: 'Impacto Aviation MRO', statusConexao: 'ERRO' };
    return this.fetchApi<ImpactoTecnico>(`/tecnicos/${encodeURIComponent(id)}`);
  }

  /**
   * Consulta as qualificações técnicas (habilitações de tipo, avionics, motores)
   */
  async getQualificacoes(params?: { tecnicoId?: string; status?: string }): Promise<ImpactoApiResponse<ImpactoQualificacao[]>> {
    return this.fetchApi<ImpactoQualificacao[]>('/qualificacoes', params);
  }

  /**
   * Consulta os treinamentos mandatórios e operacionais de manutenção
   */
  async getTreinamentos(params?: { tecnicoId?: string; curso?: string }): Promise<ImpactoApiResponse<ImpactoTreinamento[]>> {
    return this.fetchApi<ImpactoTreinamento[]>('/treinamentos', params);
  }

  /**
   * Consulta as ferramentas calibráveis utilizadas no Impacto Aviation MRO
   */
  async getFerramentas(filtros?: FiltrosFerramentasImpacto): Promise<ImpactoApiResponse<ImpactoFerramenta[]>> {
    const params: Record<string, string | undefined> = {
      baseId: filtros?.baseId,
      statusCalibracao: filtros?.statusCalibracao,
      busca: filtros?.busca,
    };
    return this.fetchApi<ImpactoFerramenta[]>('/ferramentas', params);
  }

  /**
   * Obtém detalhes de uma ferramenta específica pelo ID estável
   */
  async getFerramentaById(id: string): Promise<ImpactoApiResponse<ImpactoFerramenta>> {
    if (!id) return { success: false, error: 'ID da ferramenta obrigatório', origem: 'Impacto Aviation MRO', statusConexao: 'ERRO' };
    return this.fetchApi<ImpactoFerramenta>(`/ferramentas/${encodeURIComponent(id)}`);
  }

  /**
   * Consulta as Ordens de Serviço (OS) do Impacto Aviation MRO
   */
  async getOrdensServico(filtros?: FiltrosOrdensServicoImpacto): Promise<ImpactoApiResponse<ImpactoOrdemServico[]>> {
    const params: Record<string, string | undefined> = {
      status: filtros?.status,
      baseId: filtros?.baseId,
      prefixoAeronave: filtros?.prefixoAeronave,
      busca: filtros?.busca,
    };
    return this.fetchApi<ImpactoOrdemServico[]>('/ordens-servico', params);
  }

  /**
   * Obtém detalhes de uma Ordem de Serviço específica pelo ID estável
   */
  async getOrdemServicoById(id: string): Promise<ImpactoApiResponse<ImpactoOrdemServico>> {
    if (!id) return { success: false, error: 'ID da OS obrigatório', origem: 'Impacto Aviation MRO', statusConexao: 'ERRO' };
    return this.fetchApi<ImpactoOrdemServico>(`/ordens-servico/${encodeURIComponent(id)}`);
  }

  /**
   * Obtém o CONTEXTO COMPLETO DE QUALIDADE de uma Ordem de Serviço
   * Inclui: OS, base, técnico responsável, qualificações, treinamentos, ferramentas calibradas
   * utilizadas, etapas executadas, peças substituídas e alertas automáticos de desvio.
   */
  async getContextoQualidadeOS(ordemServicoId: string): Promise<ImpactoApiResponse<ImpactoContextoQualidadeOS>> {
    if (!ordemServicoId) {
      return { success: false, error: 'ID da Ordem de Serviço obrigatório', origem: 'Impacto Aviation MRO', statusConexao: 'ERRO' };
    }
    return this.fetchApi<ImpactoContextoQualidadeOS>(`/ordens-servico/${encodeURIComponent(ordemServicoId)}/contexto-qualidade`);
  }
}

// Instância singleton exportada para uso no QualyQuest
export const impactoMroApi = new ImpactoMroApiClient();
