import React, { useState, useMemo } from 'react';
import {
  Plane,
  ShieldCheck,
  Award,
  GraduationCap,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  MapPin,
  Users,
  Eye,
  FileText,
  BadgeAlert,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import {
  ColaboradorPessoa,
  CompetenciaItem,
  CompetenciaColaborador,
  QualificacaoColaborador,
  RegistroTreinamentoColaborador,
  DocumentoEvidenciaPessoa,
  UserProfile,
  BaseEstacaoOperacao,
} from '../types';
import { calcularDiasParaVencimento } from '../services/competenciesEngine';
import { formatarTituloCursoCompleto } from '../utils/courseFormatters';

interface FleetCompetencyMatrixViewProps {
  organizationId: string;
  userProfile?: UserProfile | null;
  persons: ColaboradorPessoa[];
  competencies: CompetenciaItem[];
  personCompetencies: CompetenciaColaborador[];
  qualifications: QualificacaoColaborador[];
  trainingRecords: RegistroTreinamentoColaborador[];
  documents: DocumentoEvidenciaPessoa[];
  bases?: BaseEstacaoOperacao[];
  onSelectColaborador?: (colaborador: ColaboradorPessoa) => void;
}

export const FROTAS_PADRAO = [
  'Airbus A320',
  'Boeing 737',
  'ATR 42/72',
  'Embraer 190/195',
  'Geral / Aviônica & Sistemas',
];

export const NIVEIS_CURSO_PADRAO = [
  'Familiarização (Nível 1)',
  'Ramp & Transit (Nível 2)',
  'Line & Base Maintenance (Nível 3)',
  'Curso Específico de Motor',
  'Sistemas Específicos / OJT',
];

export const FleetCompetencyMatrixView: React.FC<FleetCompetencyMatrixViewProps> = ({
  organizationId,
  userProfile,
  persons = [],
  competencies = [],
  personCompetencies = [],
  qualifications = [],
  trainingRecords = [],
  documents = [],
  bases = [],
  onSelectColaborador,
}) => {
  const [selectedFrota, setSelectedFrota] = useState<string>('TODAS');
  const [selectedBase, setSelectedBase] = useState<string>('TODAS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterNivel, setFilterNivel] = useState<string>('TODOS');
  const [filterStatusReq, setFilterStatusReq] = useState<string>('TODOS');

  // Detalhes do registro modal
  const [detalhesItem, setDetalhesItem] = useState<{
    colaborador: ColaboradorPessoa;
    frota: string;
    treinamentos: RegistroTreinamentoColaborador[];
    competencias: CompetenciaColaborador[];
    qualificacoes: QualificacaoColaborador[];
  } | null>(null);

  // Lista dinâmica de frotas identificadas no banco
  const frotasDisponiveis = useMemo(() => {
    const setFrotas = new Set<string>(FROTAS_PADRAO);
    trainingRecords.forEach((tr) => {
      if (tr.frotaOuFamilia) setFrotas.add(tr.frotaOuFamilia);
    });
    personCompetencies.forEach((pc) => {
      if (pc.equipamentoOuModelo) setFrotas.add(pc.equipamentoOuModelo);
    });
    return Array.from(setFrotas);
  }, [trainingRecords, personCompetencies]);

  // Estrutura consolidada de funcionários ativos x frotas
  const linhasMatriz = useMemo(() => {
    const ativos = persons.filter((p) => p.status === 'ATIVO');
    const frotasParaProcessar = selectedFrota === 'TODAS' ? frotasDisponiveis : [selectedFrota];

    const linhas: Array<{
      colaborador: ColaboradorPessoa;
      frota: string;
      treinamentos: RegistroTreinamentoColaborador[];
      competencias: CompetenciaColaborador[];
      qualificacoes: QualificacaoColaborador[];
      niveisConcluidos: string[];
      temReciclagemVencida: boolean;
      temReciclagemVencendo: boolean;
      statusGeral: 'QUALIFICADO' | 'EM_DESENVOLVIMENTO' | 'RECICLAGEM_PENDENTE' | 'NAO_QUALIFICADO';
      autorizacaoFormal?: string;
    }> = [];

    ativos.forEach((colab) => {
      // Filtro de base
      if (selectedBase !== 'TODAS') {
        const baseMatch =
          colab.baseOperacional === selectedBase ||
          colab.baseOperacionalId === selectedBase ||
          (colab.baseOperacional &&
            colab.baseOperacional.toLowerCase().includes(selectedBase.split(' - ')[0].toLowerCase()));
        if (!baseMatch) return;
      }

      // Filtro de busca por nome ou matrícula
      if (searchTerm.trim()) {
        const termo = searchTerm.toLowerCase();
        const nomeMatch = colab.nome.toLowerCase().includes(termo);
        const matMatch = colab.matricula.toLowerCase().includes(termo);
        const funcMatch = (colab.funcao || '').toLowerCase().includes(termo);
        if (!nomeMatch && !matMatch && !funcMatch) return;
      }

      frotasParaProcessar.forEach((frota) => {
        // Treinamentos do colaborador nesta frota
        const trs = trainingRecords.filter((t) => {
          if (t.colaboradorId !== colab.id) return false;
          if (t.frotaOuFamilia) {
            return t.frotaOuFamilia.toLowerCase() === frota.toLowerCase();
          }
          // Verificação secundária por título do curso
          const tit = (t.treinamentoTitulo || '').toLowerCase();
          const frotaKey = frota.toLowerCase().replace(/[^a-z0-9]/g, '');
          return tit.includes(frota.toLowerCase()) || (frotaKey.length > 3 && tit.includes(frotaKey));
        });

        // Competências atribuídas nesta frota
        const comps = personCompetencies.filter((pc) => {
          if (pc.colaboradorId !== colab.id) return false;
          if (pc.equipamentoOuModelo) {
            return pc.equipamentoOuModelo.toLowerCase() === frota.toLowerCase();
          }
          const cNome = (pc.competenciaNome || '').toLowerCase();
          return cNome.includes(frota.toLowerCase());
        });

        // Qualificações formais (CHTs, RTS, RII) com escopo nesta frota
        const quals = qualifications.filter((q) => {
          if (q.colaboradorId !== colab.id) return false;
          const esc = (q.escopo || '').toLowerCase();
          const tit = (q.titulo || '').toLowerCase();
          return esc.includes(frota.toLowerCase()) || tit.includes(frota.toLowerCase());
        });

        // Se o filtro de frota é TODAS, apenas exibe a linha se houver ao menos 1 registro (treinamento, competência ou qualificação)
        if (selectedFrota === 'TODAS' && trs.length === 0 && comps.length === 0 && quals.length === 0) {
          return;
        }

        // Mapeamento dos níveis técnicos concluídos
        const niveis: string[] = [];
        trs.forEach((t) => {
          if (t.resultado === 'APROVADO') {
            const nivel = t.nivelOuModulo || t.treinamentoTitulo;
            if (!niveis.includes(nivel)) niveis.push(nivel);
          }
        });

        // Checagem de reciclagens e vencimentos
        let temReciclagemVencida = false;
        let temReciclagemVencendo = false;

        trs.forEach((t) => {
          if (t.dataValidade) {
            const dias = calcularDiasParaVencimento(t.dataValidade);
            if (dias !== null) {
              if (dias < 0) temReciclagemVencida = true;
              else if (dias <= 30) temReciclagemVencendo = true;
            }
          }
        });

        // Status geral da qualificação na frota
        let statusGeral: 'QUALIFICADO' | 'EM_DESENVOLVIMENTO' | 'RECICLAGEM_PENDENTE' | 'NAO_QUALIFICADO' =
          'NAO_QUALIFICADO';

        if (temReciclagemVencida) {
          statusGeral = 'RECICLAGEM_PENDENTE';
        } else if (quals.some((q) => q.status === 'VALIDA') || comps.some((c) => c.nivelAtual >= 3)) {
          statusGeral = 'QUALIFICADO';
        } else if (trs.length > 0 || comps.length > 0) {
          statusGeral = 'EM_DESENVOLVIMENTO';
        }

        // Filtro por status
        if (filterStatusReq !== 'TODOS' && statusGeral !== filterStatusReq) {
          return;
        }

        // Filtro por nível específico
        if (filterNivel !== 'TODOS') {
          const atendeNivel = niveis.some((n) => n.toLowerCase().includes(filterNivel.toLowerCase()));
          if (!atendeNivel) return;
        }

        // Autorização formal
        const autorizacaoFormal =
          comps.find((c) => c.documentoPortariaOS)?.documentoPortariaOS ||
          quals.find((q) => q.numeroRegistro)?.numeroRegistro;

        linhas.push({
          colaborador: colab,
          frota,
          treinamentos: trs,
          competencias: comps,
          qualificacoes: quals,
          niveisConcluidos: niveis,
          temReciclagemVencida,
          temReciclagemVencendo,
          statusGeral,
          autorizacaoFormal,
        });
      });
    });

    return linhas;
  }, [
    persons,
    selectedFrota,
    frotasDisponiveis,
    selectedBase,
    searchTerm,
    trainingRecords,
    personCompetencies,
    qualifications,
    filterStatusReq,
    filterNivel,
  ]);

  return (
    <div className="space-y-5">
      {/* Box Didático de Governança e Distinções Técnicas (IMPACTO SGQ) */}
      <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 border border-sky-800/60 rounded-2xl p-5 text-white shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-800/40 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-sky-600/30 text-sky-300 border border-sky-500/30">
              <Plane className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Matriz de Qualificação Técnica por Frota & Níveis Operacionais
              </h3>
              <p className="text-xs text-sky-200/80">
                Governança estrita da formação dos mecânicos conforme RBAC 145 e critérios oficiais da IMPACTO.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-sky-900/60 border border-sky-700/60 text-sky-200 font-mono">
              Frotas Ativas: {frotasDisponiveis.length}
            </span>
          </div>
        </div>

        {/* Três Pilares da Qualificação Técnica Aeronáutica */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-sky-900/30 border border-sky-700/50 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-sky-300">
              <GraduationCap className="w-4 h-4 text-sky-400" />
              <span>1. Treinamento Realizado</span>
            </div>
            <p className="text-sky-200/90 text-[11px] leading-relaxed">
              Cursos teóricos e práticos (Familiarização, Ramp & Transit, Motor, etc.). A conclusão de um nível não concede automaticamente os demais.
            </p>
          </div>

          <div className="bg-indigo-900/30 border border-indigo-700/50 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-indigo-300">
              <Award className="w-4 h-4 text-indigo-400" />
              <span>2. Competência Avaliada</span>
            </div>
            <p className="text-indigo-200/90 text-[11px] leading-relaxed">
              Proficiência técnica comprovada em serviço (Níveis 1 a 5), validada por instrutor ou supervisor qualificado da organização.
            </p>
          </div>

          <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>3. Autorização Técnica Formal</span>
            </div>
            <p className="text-emerald-200/90 text-[11px] leading-relaxed">
              Portaria interna, credenciamento RTS/CRS ou designação RII emitida formalmente pela Diretoria Técnica da IMPACTO.
            </p>
          </div>
        </div>
      </div>

      {/* Painel de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar mecânico por nome, matrícula ou função..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Seletor de Frota */}
          <div className="flex items-center gap-1">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Plane className="w-3.5 h-3.5 text-blue-600" /> Frota:
            </span>
            <select
              value={selectedFrota}
              onChange={(e) => setSelectedFrota(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-800 font-medium"
            >
              <option value="TODAS">Todas as Frotas ({frotasDisponiveis.length})</option>
              {frotasDisponiveis.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Base Operacional */}
          <div className="flex items-center gap-1">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-600" /> Base:
            </span>
            <select
              value={selectedBase}
              onChange={(e) => setSelectedBase(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-800 font-medium"
            >
              <option value="TODAS">Todas as Bases</option>
              {bases.map((b) => (
                <option key={b.id} value={b.nome}>
                  {b.codigo} - {b.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Nível */}
          <select
            value={filterNivel}
            onChange={(e) => setFilterNivel(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="TODOS">Todos os Níveis Técnicos</option>
            <option value="Familiarização">Familiarização (Nível 1)</option>
            <option value="Ramp">Ramp & Transit (Nível 2)</option>
            <option value="Maintenance">Line & Base Maintenance (Nível 3)</option>
            <option value="Motor">Curso Específico de Motor</option>
          </select>

          {/* Seletor de Situação */}
          <select
            value={filterStatusReq}
            onChange={(e) => setFilterStatusReq(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="TODOS">Todas as Situações</option>
            <option value="QUALIFICADO">Qualificado / Apto</option>
            <option value="EM_DESENVOLVIMENTO">Em Treinamento / Parcial</option>
            <option value="RECICLAGEM_PENDENTE">Reciclagem Pendente / Vencida</option>
          </select>
        </div>
      </div>

      {/* Tabela da Matriz por Funcionário e Frota */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-3 w-56 sticky left-0 bg-slate-50 z-10">Mecânico / Colaborador</th>
              <th className="p-3 w-28">Base</th>
              <th className="p-3 w-36">Frota / Família</th>
              <th className="p-3">Cursos & Níveis Técnicos Concluídos</th>
              <th className="p-3 text-center w-28">Competência</th>
              <th className="p-3 w-36">Reciclagem / Validade</th>
              <th className="p-3 w-40">Autorização Técnica IMPACTO</th>
              <th className="p-3 text-center w-28">Situação</th>
              <th className="p-3 text-right w-16">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {linhasMatriz.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-500 italic">
                  Nenhum registro de formação por frota encontrado para os critérios selecionados.
                </td>
              </tr>
            ) : (
              linhasMatriz.map((item, idx) => {
                const colab = item.colaborador;
                const compNivel = Math.max(0, ...item.competencias.map((c) => c.nivelAtual));

                return (
                  <tr key={`${colab.id}-${item.frota}-${idx}`} className="hover:bg-slate-50/70 transition">
                    {/* Mecânico */}
                    <td className="p-3 font-semibold text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-100">
                      <div>{colab.nome}</div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        {colab.matricula} • {colab.funcao}
                      </div>
                    </td>

                    {/* Base */}
                    <td className="p-3 text-slate-600 whitespace-nowrap">
                      {colab.baseOperacional ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium">
                          <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                          <span>{colab.baseOperacional.split(' - ')[0]}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">—</span>
                      )}
                    </td>

                    {/* Frota */}
                    <td className="p-3 whitespace-nowrap font-semibold text-blue-900">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200">
                        <Plane className="w-3.5 h-3.5 text-blue-600" />
                        <span>{item.frota}</span>
                      </span>
                    </td>

                    {/* Cursos e Níveis Técnicos Concluídos */}
                    <td className="p-3">
                      {item.niveisConcluidos.length === 0 ? (
                        <span className="text-slate-400 italic text-[11px]">Nenhum curso registrado</span>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {item.treinamentos.map((t) => {
                            const isVencido =
                              t.dataValidade &&
                              calcularDiasParaVencimento(t.dataValidade) !== null &&
                              calcularDiasParaVencimento(t.dataValidade)! < 0;

                            const tituloFormatado = formatarTituloCursoCompleto({
                              titulo: t.treinamentoTitulo,
                              frotaOuFamilia: t.frotaOuFamilia,
                              nivelOuModulo: t.nivelOuModulo,
                              variantesAplicabilidade: t.varianteAplicabilidade,
                            });

                            return (
                              <div
                                key={t.id}
                                className={`p-1.5 rounded-lg border text-[11px] flex items-center justify-between gap-2 ${
                                  isVencido
                                    ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                                    : t.ehReciclagem
                                    ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-800'
                                }`}
                                title={`${tituloFormatado} — Realizado: ${t.dataRealizacao}${
                                  t.dataValidade ? ` | Validade: ${t.dataValidade}` : ''
                                }`}
                              >
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs">{t.ehReciclagem ? '🔄' : '✅'}</span>
                                  <span className="font-semibold">{tituloFormatado}</span>
                                  {t.nivelOuModulo && (
                                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-medium">
                                      {t.nivelOuModulo}
                                    </span>
                                  )}
                                  {t.varianteAplicabilidade && (
                                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                                      {t.varianteAplicabilidade}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] font-mono shrink-0 text-slate-500">
                                  {t.dataRealizacao}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* Competência Avaliada */}
                    <td className="p-3 text-center">
                      {compNivel > 0 ? (
                        <span
                          className={`inline-flex items-center justify-center px-2 py-0.5 rounded font-bold text-[11px] ${
                            compNivel >= 3
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          Nível {compNivel}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-mono">—</span>
                      )}
                    </td>

                    {/* Reciclagem / Validade */}
                    <td className="p-3 whitespace-nowrap">
                      {item.treinamentos.some((t) => t.dataValidade) ? (
                        <div className="space-y-0.5">
                          {item.treinamentos
                            .filter((t) => t.dataValidade)
                            .map((t) => {
                              const dias = calcularDiasParaVencimento(t.dataValidade);
                              const isVencido = dias !== null && dias < 0;
                              const isVencendo = dias !== null && dias >= 0 && dias <= 30;

                              return (
                                <div
                                  key={t.id}
                                  className={`text-[11px] font-mono flex items-center gap-1 ${
                                    isVencido
                                      ? 'text-rose-700 font-bold'
                                      : isVencendo
                                      ? 'text-amber-700 font-bold'
                                      : 'text-slate-700'
                                  }`}
                                >
                                  <Clock className="w-3 h-3 shrink-0" />
                                  <span>{t.dataValidade}</span>
                                  <span className="text-[10px] text-slate-400">({dias}d)</span>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">Sem reciclagem</span>
                      )}
                    </td>

                    {/* Autorização Formal Técnica */}
                    <td className="p-3">
                      {item.autorizacaoFormal ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200 font-semibold">
                            <ShieldCheck className="w-3 h-3 text-purple-700 shrink-0" />
                            <span>{item.autorizacaoFormal}</span>
                          </span>
                        </div>
                      ) : item.qualificacoes.length > 0 ? (
                        <span className="font-mono text-[11px] text-slate-700">
                          {item.qualificacoes[0].numeroRegistro || item.qualificacoes[0].titulo}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Não emitida</span>
                      )}
                    </td>

                    {/* Situação do Requisito */}
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                          item.statusGeral === 'QUALIFICADO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.statusGeral === 'RECICLAGEM_PENDENTE'
                            ? 'bg-rose-100 text-rose-800'
                            : item.statusGeral === 'EM_DESENVOLVIMENTO'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.statusGeral === 'QUALIFICADO'
                          ? 'Apto / Qualificado'
                          : item.statusGeral === 'RECICLAGEM_PENDENTE'
                          ? 'Reciclagem Pendente'
                          : item.statusGeral === 'EM_DESENVOLVIMENTO'
                          ? 'Em Formação'
                          : 'Não Qualificado'}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDetalhesItem(item)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Ver dossiê do mecânico nesta frota"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Dossiê de Qualificação na Frota */}
      {detalhesItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">
                    {detalhesItem.frota}
                  </span>
                  <span className="text-xs text-slate-500">Dossiê Técnico de Formação</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{detalhesItem.colaborador.nome}</h3>
                <p className="text-xs text-slate-500">
                  Matrícula: {detalhesItem.colaborador.matricula} • {detalhesItem.colaborador.funcao} • Base:{' '}
                  {detalhesItem.colaborador.baseOperacional || 'Não informada'}
                </p>
              </div>
              <button
                onClick={() => setDetalhesItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto text-xs pr-1">
              {/* Treinamentos */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-sky-600" />
                  Cursos & Treinamentos Registrados ({detalhesItem.treinamentos.length})
                </h4>
                {detalhesItem.treinamentos.length === 0 ? (
                  <p className="text-slate-500 italic">Nenhum treinamento registrado nesta frota.</p>
                ) : (
                  <div className="space-y-1.5">
                    {detalhesItem.treinamentos.map((t) => {
                      const tituloFormatado = formatarTituloCursoCompleto({
                        titulo: t.treinamentoTitulo,
                        frotaOuFamilia: t.frotaOuFamilia,
                        nivelOuModulo: t.nivelOuModulo,
                        variantesAplicabilidade: t.varianteAplicabilidade,
                      });

                      return (
                        <div key={t.id} className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1.5">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <div className="font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                <span>{t.ehReciclagem ? '🔄' : '🎓'}</span>
                                <span>{tituloFormatado}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {t.frotaOuFamilia && (
                                  <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.2 rounded border border-blue-200">
                                    ✈️ {t.frotaOuFamilia}
                                  </span>
                                )}
                                {t.nivelOuModulo && (
                                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-1.5 py-0.2 rounded border border-indigo-200">
                                    🎯 {t.nivelOuModulo}
                                  </span>
                                )}
                                {t.varianteAplicabilidade && (
                                  <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-1.5 py-0.2 rounded border border-slate-200">
                                    ⚙️ {t.varianteAplicabilidade}
                                  </span>
                                )}
                                {t.ehReciclagem && (
                                  <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                                    Reciclagem
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              t.resultado === 'APROVADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {t.resultado}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
                            <span>Realizado em: <strong>{t.dataRealizacao}</strong></span>
                            {t.dataValidade && <span>Validade: <strong>{t.dataValidade}</strong></span>}
                          </div>
                          {t.numeroCertificado && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Certificado: {t.numeroCertificado}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Autorizações Técnicas e Portarias */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  Autorizações Formais & Portarias Técnicas
                </h4>
                {detalhesItem.competencias.length === 0 && detalhesItem.qualificacoes.length === 0 ? (
                  <p className="text-slate-500 italic">Nenhuma autorização formal registrada.</p>
                ) : (
                  <div className="space-y-1.5">
                    {detalhesItem.competencias.map((c) => (
                      <div key={c.id} className="p-2 bg-white rounded-lg border border-slate-200">
                        <div className="font-semibold text-slate-800">{c.competenciaNome}</div>
                        <div className="text-[11px] text-slate-500 flex justify-between mt-0.5">
                          <span>Nível: {c.nivelAtual}</span>
                          {c.documentoPortariaOS && (
                            <span className="font-mono text-purple-700">{c.documentoPortariaOS}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {detalhesItem.qualificacoes.map((q) => (
                      <div key={q.id} className="p-2 bg-white rounded-lg border border-slate-200">
                        <div className="font-semibold text-slate-800">{q.titulo}</div>
                        <div className="text-[11px] text-slate-500 flex justify-between mt-0.5">
                          <span>Registro: {q.numeroRegistro}</span>
                          <span className="text-emerald-700 font-bold">{q.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setDetalhesItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Fechar Dossiê
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
