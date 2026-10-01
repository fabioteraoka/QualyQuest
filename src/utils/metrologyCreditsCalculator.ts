import { FerramentaCalibracao } from '../types';

/**
 * Interface para os dados detalhados da Conta de Créditos de uma Ferramenta
 */
export interface ContaCreditoFerramenta {
  ferramentaId: string;
  codigoPatrimonio: string;
  modelo: string;
  descricao: string;
  dataUltimaCalibracao: string;
  dataProximaCalibracao: string;
  frequenciaMeses: number;
  
  // Métricas de Crédito Metrológico
  diasTotalCredito: number;          // Total de dias de crédito concedidos na calibração
  diasConsumidos: number;            // Quantidade de dias já utilizados
  saldoDiasCredito: number;          // Saldo de dias restantes de crédito de calibração
  percentualRestante: number;        // % de crédito de validade disponível (0 a 100)
  percentualConsumido: number;       // % de crédito já consumido (0 a 100)
  
  // Status da Conta de Créditos
  statusCredito: 'REGULAR' | 'ATENCAO' | 'CRITICO' | 'ESGOTADO';
  rotuloStatus: string;              // Ex: 'Crédito Regular', 'Crédito Crítico (≤30d)', 'Crédito Esgotado'
  classeCorBadge: string;            // Classes Tailwind para visualização
  classeCorTexto: string;
  classeBarraProgresso: string;
  
  // Certificado
  numeroCertificado: string;
  temCertificadoAnexo: boolean;
  nomeArquivoCertificado?: string;
  urlCertificado?: string;
}

/**
 * Resumo Estatístico da Conta de Créditos Metrológicos da Organização
 */
export interface ResumoContaCreditosMetrologia {
  totalFerramentas: number;
  saldoMedioDiasCredito: number;
  
  // Contagens por faixa de crédito
  creditoRegular: number;      // > 60 dias
  creditoAtencao: number;      // 31 a 60 dias
  creditoCritico: number;      // 1 a 30 dias
  creditoEsgotado: number;     // <= 0 dias (vencidas ou débito metrológico)
  emQuarentena: number;
  
  // Cobertura de Certificados
  totalComCertificadoAnexo: number;
  taxaCoberturaCertificados: number; // 0 a 100%
  
  // Conformidade Metrológica
  taxaConformidadeMetrologica: number; // % com crédito positivo e ativo
}

/**
 * Calcula a Conta de Créditos de uma ferramenta individual
 */
export function calcularContaCreditoFerramenta(ferramenta: FerramentaCalibracao): ContaCreditoFerramenta {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const freq = Number(ferramenta.frequenciaMeses) || 12;
  const dataUltimaStr = ferramenta.dataUltimaCalibracao;
  const dataProxStr = ferramenta.dataProximaCalibracao;

  let dtUltima = new Date(dataUltimaStr);
  let dtProx = new Date(dataProxStr);

  // Fallbacks defensivos para datas inválidas
  if (isNaN(dtProx.getTime())) {
    dtProx = new Date(hoje.getTime() + freq * 30 * 24 * 60 * 60 * 1000);
  }
  if (isNaN(dtUltima.getTime())) {
    dtUltima = new Date(dtProx.getTime() - freq * 30 * 24 * 60 * 60 * 1000);
  }

  dtProx.setHours(0, 0, 0, 0);
  dtUltima.setHours(0, 0, 0, 0);

  // Dias totais de crédito concedidos na calibração
  let diasTotal = Math.round((dtProx.getTime() - dtUltima.getTime()) / (1000 * 60 * 60 * 24));
  if (diasTotal <= 0) diasTotal = freq * 30 || 365;

  // Saldo de dias restantes de crédito
  const saldoDias = Math.round((dtProx.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  // Dias consumidos
  const diasConsumidos = Math.max(0, diasTotal - Math.max(0, saldoDias));

  // Percentuais
  const percentualRestante = Math.max(0, Math.min(100, Math.round((saldoDias / diasTotal) * 100)));
  const percentualConsumido = 100 - percentualRestante;

  // Status da Conta de Créditos
  let statusCredito: 'REGULAR' | 'ATENCAO' | 'CRITICO' | 'ESGOTADO' = 'REGULAR';
  let rotuloStatus = 'Crédito Regular';
  let classeCorBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let classeCorTexto = 'text-emerald-700';
  let classeBarraProgresso = 'bg-emerald-500';

  if (ferramenta.status === 'QUARANTENA') {
    statusCredito = 'ESGOTADO';
    rotuloStatus = 'Quarentena (Uso Bloqueado)';
    classeCorBadge = 'bg-purple-50 text-purple-700 border-purple-200';
    classeCorTexto = 'text-purple-700';
    classeBarraProgresso = 'bg-purple-500';
  } else if (saldoDias <= 0 || ferramenta.status === 'VENCIDA') {
    statusCredito = 'ESGOTADO';
    rotuloStatus = saldoDias < 0 ? `Crédito Esgotado (${Math.abs(saldoDias)}d em Débito)` : 'Crédito Esgotado (Hoje)';
    classeCorBadge = 'bg-red-50 text-red-700 border-red-200';
    classeCorTexto = 'text-red-700';
    classeBarraProgresso = 'bg-red-500';
  } else if (saldoDias <= 30 || ferramenta.status === 'PROXIMA_VENCIMENTO') {
    statusCredito = 'CRITICO';
    rotuloStatus = `Crédito Crítico (${saldoDias}d restantes)`;
    classeCorBadge = 'bg-amber-50 text-amber-700 border-amber-200';
    classeCorTexto = 'text-amber-700';
    classeBarraProgresso = 'bg-amber-500';
  } else if (saldoDias <= 60) {
    statusCredito = 'ATENCAO';
    rotuloStatus = `Atenção (${saldoDias}d restantes)`;
    classeCorBadge = 'bg-yellow-50 text-yellow-700 border-yellow-200';
    classeCorTexto = 'text-yellow-700';
    classeBarraProgresso = 'bg-yellow-500';
  } else {
    statusCredito = 'REGULAR';
    rotuloStatus = `Crédito Regular (${saldoDias}d disponíveis)`;
    classeCorBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    classeCorTexto = 'text-emerald-700';
    classeBarraProgresso = 'bg-emerald-500';
  }

  // Certificado
  const temAnexo = Boolean(
    ferramenta.certificadoAnexo?.urlOuBase64 ||
    ferramenta.certificadoAnexo?.nomeArquivo ||
    ferramenta.evidenciaCertificadoUrl
  );

  return {
    ferramentaId: ferramenta.id,
    codigoPatrimonio: ferramenta.codigoPatrimonio,
    modelo: ferramenta.modelo || '—',
    descricao: ferramenta.descricao,
    dataUltimaCalibracao: dataUltimaStr,
    dataProximaCalibracao: dataProxStr,
    frequenciaMeses: freq,
    diasTotalCredito: diasTotal,
    diasConsumidos,
    saldoDiasCredito: saldoDias,
    percentualRestante,
    percentualConsumido,
    statusCredito,
    rotuloStatus,
    classeCorBadge,
    classeCorTexto,
    classeBarraProgresso,
    numeroCertificado: ferramenta.numeroCertificado || '—',
    temCertificadoAnexo: temAnexo,
    nomeArquivoCertificado: ferramenta.certificadoAnexo?.nomeArquivo,
    urlCertificado: ferramenta.certificadoAnexo?.urlOuBase64 || ferramenta.evidenciaCertificadoUrl,
  };
}

/**
 * Calcula o balanço consolidado de créditos metrológicos de uma lista de ferramentas
 */
export function calcularResumoCreditosMetrologia(ferramentas: FerramentaCalibracao[]): ResumoContaCreditosMetrologia {
  if (!ferramentas || ferramentas.length === 0) {
    return {
      totalFerramentas: 0,
      saldoMedioDiasCredito: 0,
      creditoRegular: 0,
      creditoAtencao: 0,
      creditoCritico: 0,
      creditoEsgotado: 0,
      emQuarentena: 0,
      totalComCertificadoAnexo: 0,
      taxaCoberturaCertificados: 0,
      taxaConformidadeMetrologica: 0,
    };
  }

  let somaSaldoPositivo = 0;
  let contagemAtivas = 0;
  let creditoRegular = 0;
  let creditoAtencao = 0;
  let creditoCritico = 0;
  let creditoEsgotado = 0;
  let emQuarentena = 0;
  let totalComCertificadoAnexo = 0;

  ferramentas.forEach((f) => {
    if (f.ativo === false) return; // ignora inativas no balanço ativo

    const conta = calcularContaCreditoFerramenta(f);
    contagemAtivas++;

    if (f.status === 'QUARANTENA') {
      emQuarentena++;
    } else if (conta.statusCredito === 'ESGOTADO') {
      creditoEsgotado++;
    } else if (conta.statusCredito === 'CRITICO') {
      creditoCritico++;
      somaSaldoPositivo += conta.saldoDiasCredito;
    } else if (conta.statusCredito === 'ATENCAO') {
      creditoAtencao++;
      somaSaldoPositivo += conta.saldoDiasCredito;
    } else {
      creditoRegular++;
      somaSaldoPositivo += conta.saldoDiasCredito;
    }

    if (conta.temCertificadoAnexo) {
      totalComCertificadoAnexo++;
    }
  });

  const totalAtivasValidas = contagemAtivas > 0 ? contagemAtivas : 1;
  const ferramentasComCreditoPositivo = creditoRegular + creditoAtencao + creditoCritico;
  const saldoMedio = ferramentasComCreditoPositivo > 0 ? Math.round(somaSaldoPositivo / ferramentasComCreditoPositivo) : 0;
  const taxaCobertura = Math.round((totalComCertificadoAnexo / totalAtivasValidas) * 100);
  const taxaConformidade = Math.round((ferramentasComCreditoPositivo / totalAtivasValidas) * 100);

  return {
    totalFerramentas: ferramentas.length,
    saldoMedioDiasCredito: saldoMedio,
    creditoRegular,
    creditoAtencao,
    creditoCritico,
    creditoEsgotado,
    emQuarentena,
    totalComCertificadoAnexo,
    taxaCoberturaCertificados: Math.min(100, taxaCobertura),
    taxaConformidadeMetrologica: Math.min(100, taxaConformidade),
  };
}
