import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  Building2,
  ShieldCheck,
  Info,
  ExternalLink,
  Search,
  XCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { DiagnosticoRequisitosSGQ } from '../../services/requirementsDataLoadService';

interface RequirementsDiagnosticTabProps {
  diagnostico: DiagnosticoRequisitosSGQ;
  onSelectRequirement?: (reqId: string) => void;
  onFilterSource?: (source: string) => void;
  onFilterApplicability?: (app: string) => void;
}

export const RequirementsDiagnosticTab: React.FC<RequirementsDiagnosticTabProps> = ({
  diagnostico,
  onSelectRequirement,
  onFilterSource,
  onFilterApplicability,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 1. Header Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium block">Total Geral no Acervo</span>
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 block">
            {diagnostico.totalRequisitos}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Requisitos mestre</span>
        </div>

        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-3.5 shadow-xs">
          <span className="text-emerald-700 dark:text-emerald-300 font-medium block flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Conteúdo Validado
          </span>
          <span className="text-xl font-bold text-emerald-900 dark:text-emerald-200 mt-1 block">
            {diagnostico.porStatusValidacao.validado}
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 block">Fontes comprovadas</span>
        </div>

        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3.5 shadow-xs">
          <span className="text-amber-700 dark:text-amber-300 font-medium block flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Pendente Validação
          </span>
          <span className="text-xl font-bold text-amber-900 dark:text-amber-200 mt-1 block">
            {diagnostico.porStatusValidacao.pendenteValidacao + diagnostico.porStatusValidacao.aguardandoProtocolo}
          </span>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 block">Aguardando protocolo</span>
        </div>

        <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-xl p-3.5 shadow-xs">
          <span className="text-blue-700 dark:text-blue-300 font-medium block flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            Com Controle Central
          </span>
          <span className="text-xl font-bold text-blue-900 dark:text-blue-200 mt-1 block">
            {diagnostico.comControleCentralCount}
          </span>
          <span className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 block">
            {diagnostico.totalRequisitos > 0
              ? `${Math.round((diagnostico.comControleCentralCount / diagnostico.totalRequisitos) * 100)}% de cobertura`
              : '0%'}
          </span>
        </div>

        <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3.5 shadow-xs">
          <span className="text-rose-700 dark:text-rose-300 font-medium block flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Lacunas de Controle
          </span>
          <span className="text-xl font-bold text-rose-900 dark:text-rose-200 mt-1 block">
            {diagnostico.semControleCentralCount}
          </span>
          <span className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 block">Sem controle SGQ</span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
          <span className="text-slate-600 dark:text-slate-400 font-medium block flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-purple-500" />
            Duplicidades / Revisão
          </span>
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 block">
            {diagnostico.duplicidadesIdentificadas.length + diagnostico.requisitosPrecisamRevisao.length}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Apontamentos técnicos</span>
        </div>
      </div>

      {/* 2. SWISS Integrity Protocol Callout Banner */}
      <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3 text-xs">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-900 dark:text-blue-200">
            Protocolo de Integridade SGQ — SWISS International Air Lines:
          </p>
          <p className="text-blue-800 dark:text-blue-300 leading-relaxed">
            A estrutura técnica da SWISS está homologada e ativa na organização. Conforme as regras mandatárias de integridade
            do QualyQuest (Seções 1.2 e 4), nenhum requisito fictício ou presumido foi inserido. Os requisitos oficiais serão
            carregados assim que o checklist formal de estação for protocolado pela operadora suíça.
          </p>
        </div>
      </div>

      {/* 3. Seções em Grid: Inventário por Fonte & Distribuição por Cliente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventário por Fonte Normativa */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Inventário por Fonte Normativa
            </h3>
            <span className="text-[11px] text-slate-400">Classificação SSoT</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
              <div>
                <span className="font-semibold text-blue-900 dark:text-blue-200">ANAC — RBAC 145 & IS</span>
                <p className="text-[11px] text-blue-700 dark:text-blue-400">Regulação Primária Brasileira (Emenda 09 / IS 145)</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-blue-900 dark:text-blue-200">
                  {diagnostico.porFonte.REGULATORIO_ANAC}
                </span>
                {onFilterSource && (
                  <button
                    onClick={() => onFilterSource('REGULATORIO_ANAC')}
                    className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 cursor-pointer"
                    title="Filtrar por ANAC"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-sky-50/50 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-900/40">
              <div>
                <span className="font-semibold text-sky-900 dark:text-sky-200">EASA — Part-145 & Supplement MNT-004</span>
                <p className="text-[11px] text-sky-700 dark:text-sky-400">Regulamentação Europeia para MRO Estrangeiro</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-sky-900 dark:text-sky-200">
                  {diagnostico.porFonte.REGULATORIO_EASA}
                </span>
                {onFilterSource && (
                  <button
                    onClick={() => onFilterSource('REGULATORIO_EASA')}
                    className="p-1 text-sky-600 hover:text-sky-800 dark:text-sky-400 cursor-pointer"
                    title="Filtrar por EASA"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40">
              <div>
                <span className="font-semibold text-purple-900 dark:text-purple-200">IOSA — Standards Manual (ISM MNT/ORG)</span>
                <p className="text-[11px] text-purple-700 dark:text-purple-400">Padrão Setorial IATA (Vinculação Contratual)</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-purple-900 dark:text-purple-200">
                  {diagnostico.porFonte.PADRAO_SETORIAL_IOSA}
                </span>
                {onFilterSource && (
                  <button
                    onClick={() => onFilterSource('PADRAO_SETORIAL_IOSA')}
                    className="p-1 text-purple-600 hover:text-purple-800 dark:text-purple-400 cursor-pointer"
                    title="Filtrar por IOSA"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
              <div>
                <span className="font-semibold text-amber-900 dark:text-amber-200">Contratuais de Clientes Operadores</span>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">Kalitta Air, Atlas Air, Avion Express, Placar, Swiss</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-amber-900 dark:text-amber-200">
                  {diagnostico.porFonte.CONTRATUAL_CLIENTE}
                </span>
                {onFilterSource && (
                  <button
                    onClick={() => onFilterSource('CONTRATUAL_CLIENTE')}
                    className="p-1 text-amber-600 hover:text-amber-800 dark:text-amber-400 cursor-pointer"
                    title="Filtrar por Clientes"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
              <div>
                <span className="font-semibold text-emerald-900 dark:text-emerald-200">Internos IMPACTO (MOMQ / PTM)</span>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Manual da Qualidade, Treinamento e Formulários F 001</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-emerald-900 dark:text-emerald-200">
                  {diagnostico.porFonte.INTERNO_IMPACTO}
                </span>
                {onFilterSource && (
                  <button
                    onClick={() => onFilterSource('INTERNO_IMPACTO')}
                    className="p-1 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 cursor-pointer"
                    title="Filtrar por IMPACTO"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {diagnostico.porFonte.SEM_CLASSIFICACAO > 0 && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900/60">
                <div>
                  <span className="font-semibold text-rose-900 dark:text-rose-200">Sem Classificação de Fonte</span>
                  <p className="text-[11px] text-rose-700 dark:text-rose-400">Requisitos que necessitam de enquadramento imediato</p>
                </div>
                <span className="font-mono font-bold text-sm text-rose-900 dark:text-rose-200">
                  {diagnostico.porFonte.SEM_CLASSIFICACAO}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Distribuição por Cliente */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              Requisitos por Cliente Operador
            </h3>
            <span className="text-[11px] text-slate-400">Auditorias & SLAs</span>
          </div>

          <div className="space-y-2 text-xs">
            {Object.entries(diagnostico.porCliente).map(([clienteNome, qtd]) => (
              <div
                key={clienteNome}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800"
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{clienteNome}</span>
                  {clienteNome.includes('SWISS') && (
                    <span className="ml-2 text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded font-medium">
                      Pendente Protocolo
                    </span>
                  )}
                  {clienteNome.includes('Kalitta') && (
                    <span className="ml-2 text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded font-medium">
                      Form QA-14 Rev. 4
                    </span>
                  )}
                  {clienteNome.includes('Atlas') && (
                    <span className="ml-2 text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-1.5 py-0.2 rounded font-medium">
                      Checklist Q2059
                    </span>
                  )}
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{qtd}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Duplicidades e Conflitos Identificados */}
      {diagnostico.duplicidadesIdentificadas.length > 0 && (
        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Duplicidades ou Redações Idênticas Identificadas ({diagnostico.duplicidadesIdentificadas.length})</span>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Foram identificados registros com códigos iguais ou textos originais concorrentes que exigem atenção para não inflar a contagem:
          </p>

          <div className="space-y-2 text-xs">
            {diagnostico.duplicidadesIdentificadas.map((dup, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-amber-200 dark:border-amber-800/80 flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                      {dup.tipo}
                    </span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {dup.codigoA} ↔ {dup.codigoB}
                    </strong>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">{dup.detalhes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Registros que Precisam de Revisão */}
      {diagnostico.requisitosPrecisamRevisao.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              Registros que Demandam Revisão Normativa ({diagnostico.requisitosPrecisamRevisao.length})
            </h3>
            <span className="text-[11px] text-slate-400">Integridade de Metadados</span>
          </div>

          <div className="space-y-2 text-xs">
            {diagnostico.requisitosPrecisamRevisao.slice(0, 8).map((rev, idx) => (
              <div
                key={`${rev.id}-${idx}`}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
              >
                <div>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 mr-2">{rev.numeroItem}</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{rev.titulo}</span>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">{rev.motivo}</p>
                </div>
                {onSelectRequirement && (
                  <button
                    onClick={() => onSelectRequirement(rev.id)}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    Revisar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Lacunas de Controles Centrais */}
      {diagnostico.lacunasControlesCentrais.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-500" />
              Requisitos sem Vínculo com Controle Central SGQ ({diagnostico.lacunasControlesCentrais.length})
            </h3>
            <span className="text-[11px] text-slate-400">Análise de Lacunas</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Requisitos que ainda não foram associados ao princípio "Um Controle Central, Vários Requisitos". A vinculação a
            um controle (ex: CTRL-DOCS-01, CTRL-FERRAM-01) permite demonstrar conformidade contínua a múltiplos auditores.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {diagnostico.lacunasControlesCentrais.slice(0, 6).map((lac) => (
              <div
                key={lac.requisitoId}
                className="p-3 rounded-lg bg-purple-50/30 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-purple-900 dark:text-purple-200">{lac.numeroItem}</span>
                  <span className="text-[10px] text-slate-400">{lac.fonte}</span>
                </div>
                <h4 className="font-medium text-slate-800 dark:text-slate-200 truncate">{lac.titulo}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">{lac.recomendacao}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
