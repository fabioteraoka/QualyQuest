import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  Edit2,
  Filter,
  Info,
  Layers,
  MapPin,
  Palette,
  Plane,
  Printer,
  Save,
  Shield,
  Sliders,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  AeronaveDesignacao,
  Base,
  DesignacaoPessoa,
  FuncaoDesignacao,
  ItemStatus,
  Licenca,
  Pessoa,
  SimNaoVazio,
} from '../types';
import {
  calcularDiasParaVencer,
  calcularStatusLicenca,
  formatarDataBr,
  getStatusColor,
} from '../utils/businessRules';
import { repository } from '../services/storage';

export const ListaDesignacaoView: React.FC = () => {
  const {
    db,
    filtroBase,
    setFiltroBase,
    dataReferencia,
    faixas,
    triggerPrint,
    currentUser,
    showToast,
    setActiveTab,
  } = useApp();

  const [destacarVencimentos, setDestacarVencimentos] = useState<boolean>(true);
  const [imprimirTodasAsBases, setImprimirTodasAsBases] = useState<boolean>(false);
  const [exibirGuiaOperacional, setExibirGuiaOperacional] = useState<boolean>(true);

  // Estado do Modal de Edição de Designação & Frota
  const [mecanicoParaEditar, setMecanicoParaEditar] = useState<Pessoa | null>(null);
  const [editImp, setEditImp] = useState('');
  const [editEasaType, setEditEasaType] = useState('N/A');
  const [editIncluirNaLista, setEditIncluirNaLista] = useState(true);
  const [editBases, setEditBases] = useState<string[]>([]);
  const [editFuncoes, setEditFuncoes] = useState<Record<FuncaoDesignacao, SimNaoVazio>>({
    Executante: 'SIM',
    Supervisor: 'NÃO',
    IIO: 'NÃO',
    Inspetor: 'NÃO',
    APRS: 'NÃO',
  });
  const [editAeronaves, setEditAeronaves] = useState<Record<AeronaveDesignacao, SimNaoVazio>>({
    B737: '',
    E190E2: '',
    A320FAM: '',
    A330: '',
    B767: '',
    B777: '',
  });
  const [isSavingModal, setIsSavingModal] = useState(false);

  // Available bases for filter
  const baseOptions = [{ id: 'TOTAL', nome: 'Todas as Bases (TOTAL)' }, ...db.bases];

  const funcoesLista: Array<{
    id: FuncaoDesignacao;
    label: string;
    finalidade: string;
    destaque?: boolean;
  }> = [
    {
      id: 'Executante',
      label: 'Executante',
      finalidade: 'Apto a EXECUTAR tarefas físicas de manutenção nas frotas designadas',
    },
    {
      id: 'APRS',
      label: 'APRS (CRS / RTS)',
      finalidade: 'Apto a ASSINAR e emitir Liberação de Manutenção (Release to Service)',
      destaque: true,
    },
    {
      id: 'Supervisor',
      label: 'Supervisor',
      finalidade: 'Supervisão técnica de equipe e coordenação operacional de turno',
    },
    {
      id: 'IIO',
      label: 'IIO (RII)',
      finalidade: 'Inspeção de Itens Obrigatórios / Críticos para Segurança de Voo',
    },
    {
      id: 'Inspetor',
      label: 'Inspetor',
      finalidade: 'Inspeção de conformidade técnica e garantia da qualidade',
    },
  ];

  const aeronavesLista: AeronaveDesignacao[] = ['B737', 'E190E2', 'A320FAM', 'A330', 'B767', 'B777'];

  // Helper to extract designation row for a mechanic (sem CCT)
  const getDesignacaoData = (pessoa: Pessoa) => {
    const desigPessoa = db.designacoesPessoa.find((dp) => dp.pessoa_id === pessoa.id);
    const basesPessoa = db.designacoesBase
      .filter((dbItem) => dbItem.pessoa_id === pessoa.id)
      .map((b) => b.base_id);
    const baseTexto = basesPessoa.length > 0 ? basesPessoa.join('/') : pessoa.base_principal_id;

    const licencasPessoa = db.licencas.filter((l) => l.pessoa_id === pessoa.id);

    // CHT (Expiration dates)
    const chtLic = licencasPessoa.find((l) => l.orgao === 'ANAC' && l.tipo === 'CHT');
    const licencaNumero = chtLic?.numero || '';

    const chtAvi = licencasPessoa.find((l) => l.orgao === 'ANAC' && l.tipo === 'CHT' && l.habilitacao === 'AVI');
    const chtCel = licencasPessoa.find((l) => l.orgao === 'ANAC' && l.tipo === 'CHT' && l.habilitacao === 'CEL');
    const chtGmp = licencasPessoa.find((l) => l.orgao === 'ANAC' && l.tipo === 'CHT' && l.habilitacao === 'GMP');

    // FAA AMP
    const faaAmp = licencasPessoa.find((l) => l.orgao === 'FAA' && l.tipo === 'AMP');

    // Funções
    const getFunc = (funcao: string) => {
      const f = db.designacoesFuncao.find((df) => df.pessoa_id === pessoa.id && df.funcao === funcao);
      return f?.valor || '';
    };

    // Aeronaves
    const getAero = (aero: string) => {
      const a = db.designacoesAeronave.find((da) => da.pessoa_id === pessoa.id && da.aeronave === aero);
      return a?.valor || '';
    };

    return {
      pessoa,
      imp: desigPessoa?.imp || '',
      easaType: desigPessoa?.easa_type || 'N/A',
      baseTexto,
      basesList: basesPessoa,
      licencaNumero,
      chtAvi,
      chtCel,
      chtGmp,
      faaNumero: faaAmp?.numero || '',
      faaExpedicao: faaAmp?.data_expedicao || '',
      // Funções
      executante: getFunc('Executante'),
      supervisor: getFunc('Supervisor'),
      iio: getFunc('IIO'),
      inspetor: getFunc('Inspetor'),
      aprs: getFunc('APRS'),
      // Aeronaves
      b737: getAero('B737'),
      e190: getAero('E190E2'),
      a320: getAero('A320FAM'),
      a330: getAero('A330'),
      b767: getAero('B767'),
      b777: getAero('B777'),
    };
  };

  // Filter persons to display
  const rows = useMemo(() => {
    return db.pessoas
      .filter((p) => {
        // Only active mechanics who have incluir_na_lista !== false
        if (p.categoria !== 'Mecânico') return false;
        const desig = db.designacoesPessoa.find((dp) => dp.pessoa_id === p.id);
        if (desig && !desig.incluir_na_lista) return false;

        // Base filter
        if (filtroBase !== 'TOTAL') {
          const basesPessoa = db.designacoesBase
            .filter((dbItem) => dbItem.pessoa_id === p.id)
            .map((b) => b.base_id);

          // Must be in designacoesBase for that base, or have base_principal_id if none defined
          const hasBaseInDesignacao = basesPessoa.includes(filtroBase);
          const hasBaseInPrincipal = basesPessoa.length === 0 && p.base_principal_id === filtroBase;
          if (!hasBaseInDesignacao && !hasBaseInPrincipal) return false;
        }

        return true;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map(getDesignacaoData);
  }, [
    db.pessoas,
    db.designacoesPessoa,
    db.designacoesBase,
    db.licencas,
    db.designacoesFuncao,
    db.designacoesAeronave,
    filtroBase,
  ]);

  // Abrir Modal de Edição Completa para um Mecânico
  const handleAbrirModal = (pessoa: Pessoa) => {
    const desigPessoa = db.designacoesPessoa.find((dp) => dp.pessoa_id === pessoa.id);
    const basesPessoa = db.designacoesBase
      .filter((dbItem) => dbItem.pessoa_id === pessoa.id)
      .map((b) => b.base_id);

    setEditImp(desigPessoa?.imp || '');
    setEditEasaType(desigPessoa?.easa_type || 'N/A');
    setEditIncluirNaLista(desigPessoa?.incluir_na_lista ?? true);
    setEditBases(basesPessoa.length > 0 ? basesPessoa : [pessoa.base_principal_id]);

    const funcs: Record<FuncaoDesignacao, SimNaoVazio> = {
      Executante: 'SIM',
      Supervisor: 'NÃO',
      IIO: 'NÃO',
      Inspetor: 'NÃO',
      APRS: 'NÃO',
    };
    (['Executante', 'Supervisor', 'IIO', 'Inspetor', 'APRS'] as FuncaoDesignacao[]).forEach((f) => {
      const registro = db.designacoesFuncao.find((df) => df.pessoa_id === pessoa.id && df.funcao === f);
      if (registro) funcs[f] = registro.valor;
    });
    setEditFuncoes(funcs);

    const aeros: Record<AeronaveDesignacao, SimNaoVazio> = {
      B737: '',
      E190E2: '',
      A320FAM: '',
      A330: '',
      B767: '',
      B777: '',
    };
    aeronavesLista.forEach((a) => {
      const registro = db.designacoesAeronave.find((da) => da.pessoa_id === pessoa.id && da.aeronave === a);
      if (registro) aeros[a] = registro.valor;
    });
    setEditAeronaves(aeros);

    setMecanicoParaEditar(pessoa);
  };

  // Salvar edições do Modal no Firestore/Storage
  const handleSalvarModal = async () => {
    if (!mecanicoParaEditar) return;
    setIsSavingModal(true);
    try {
      const nomeUsuario = currentUser.nome || 'Admin';

      // 1. Dados gerais da designação
      await repository.saveDesignacaoPessoa(
        {
          pessoa_id: mecanicoParaEditar.id,
          imp: editImp.trim(),
          easa_type: editEasaType.trim() || 'N/A',
          incluir_na_lista: editIncluirNaLista,
        },
        nomeUsuario
      );

      // 2. Bases designadas
      await repository.setDesignacaoBasesForPessoa(mecanicoParaEditar.id, editBases, nomeUsuario);

      // 3. Funções designadas (Executante, APRS, Supervisor, etc.)
      for (const func of ['Executante', 'Supervisor', 'IIO', 'Inspetor', 'APRS'] as FuncaoDesignacao[]) {
        await repository.setDesignacaoFuncao(mecanicoParaEditar.id, func, editFuncoes[func] || '', nomeUsuario);
      }

      // 4. Aeronaves / Frotas designadas
      for (const aero of aeronavesLista) {
        await repository.setDesignacaoAeronave(mecanicoParaEditar.id, aero, editAeronaves[aero] || '', nomeUsuario);
      }

      showToast(`Designações e autorizações de frota de ${mecanicoParaEditar.nome} atualizadas com sucesso!`);
      setMecanicoParaEditar(null);
    } catch (err: any) {
      showToast(`Erro ao salvar designações: ${err?.message || err}`);
    } finally {
      setIsSavingModal(false);
    }
  };

  // Quick In-Place Toggle para Funções
  const handleQuickToggleFuncao = async (pessoaId: string, funcao: FuncaoDesignacao, atual: string) => {
    if (currentUser.perfil === 'Leitor') return;
    const proximo: SimNaoVazio = atual === 'SIM' ? 'NÃO' : atual === 'NÃO' ? '' : 'SIM';
    try {
      await repository.setDesignacaoFuncao(pessoaId, funcao, proximo, currentUser.nome);
    } catch (err: any) {
      showToast(`Erro ao atualizar função: ${err?.message || err}`);
    }
  };

  // Quick In-Place Toggle para Aeronaves
  const handleQuickToggleAero = async (pessoaId: string, aero: AeronaveDesignacao, atual: string) => {
    if (currentUser.perfil === 'Leitor') return;
    const proximo: SimNaoVazio = atual === 'SIM' ? 'NÃO' : atual === 'NÃO' ? '' : 'SIM';
    try {
      await repository.setDesignacaoAeronave(pessoaId, aero, proximo, currentUser.nome);
    } catch (err: any) {
      showToast(`Erro ao atualizar aeronave: ${err?.message || err}`);
    }
  };

  // Color helper for CHT dates
  const renderChtDateCell = (lic: Licenca | undefined) => {
    if (!lic || !lic.data_vencimento) {
      return <td className="p-1 text-center font-mono text-[10px] text-slate-400 border border-slate-300">N/A</td>;
    }

    const dataFormatada = formatarDataBr(lic.data_vencimento);

    if (!destacarVencimentos) {
      return (
        <td className="p-1 text-center font-mono text-[10px] text-slate-800 border border-slate-300">
          {dataFormatada}
        </td>
      );
    }

    const status = calcularStatusLicenca(lic, dataReferencia, db.configuracao);
    const colors = getStatusColor(status);

    const isExpired = status === 'Vencido';
    const isWarning = status.startsWith('Vence ≤');

    return (
      <td
        style={
          isExpired || isWarning
            ? { backgroundColor: colors.bg, color: colors.text, fontWeight: isExpired ? 'bold' : '600' }
            : {}
        }
        className="p-1 text-center font-mono text-[10px] border border-slate-300"
      >
        {dataFormatada}
      </td>
    );
  };

  const renderSimNaoCell = (
    valor: string,
    bgGray = false,
    onClick?: () => void,
    title?: string
  ) => {
    const isSim = valor === 'SIM';
    const isNao = valor === 'NÃO';
    return (
      <td
        onClick={onClick}
        title={title}
        className={`p-1 text-center font-bold text-[10px] border border-slate-300 select-none transition-colors ${
          bgGray ? 'bg-[#EDEDED]' : ''
        } ${isSim ? 'text-slate-900 font-black' : isNao ? 'text-slate-400' : 'text-transparent'} ${
          onClick ? 'cursor-pointer hover:bg-sky-100 hover:text-sky-950 print:cursor-default' : ''
        }`}
      >
        {valor || '-'}
      </td>
    );
  };

  return (
    <div className="p-6 max-w-[1550px] mx-auto space-y-4">
      {/* Top Screen Controls (Hidden during print) */}
      <div className="no-print bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Lista Oficial de Designação e Habilitações</span>
            <span className="text-xs bg-pink-100 text-pink-900 font-semibold px-2 py-0.5 rounded border border-pink-200">
              Formulário Oficial A4 Paisagem
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Documento de conformidade técnica para atendimento aos requisitos ANAC e EASA 145.1003.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Base selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <MapPin className="w-4 h-4 text-sky-800" />
            <span className="font-semibold text-slate-700">Filtrar Base:</span>
            <select
              value={filtroBase}
              onChange={(e) => setFiltroBase(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-sky-600 cursor-pointer"
            >
              {baseOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id === 'TOTAL' ? 'TOTAL (Todas as Bases)' : `${b.id} - ${b.nome}`}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Destacar Vencimentos */}
          <div className="flex items-center gap-2 text-xs">
            <Palette className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-slate-700">Destacar Vencimentos:</span>
            <div className="inline-flex rounded border border-slate-300 bg-slate-50 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setDestacarVencimentos(true)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  destacarVencimentos ? 'bg-sky-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                SIM
              </button>
              <button
                onClick={() => setDestacarVencimentos(false)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  !destacarVencimentos ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                NÃO (Formal)
              </button>
            </div>
          </div>

          {/* Botão de Atalho para Matriz Completa de Designações */}
          <button
            onClick={() => setActiveTab('designacoes_crud')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-semibold transition-colors cursor-pointer border border-slate-300"
            title="Abrir tabela matriz com visão geral de todas as designações e frotas"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-600" />
            <span>Matriz Geral de Designações</span>
          </button>

          {/* Print Button */}
          <button
            onClick={triggerPrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-900 text-white rounded-md text-xs font-semibold hover:bg-sky-800 transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-sky-300" />
            <span>Imprimir Lista (A4 Paisagem)</span>
          </button>
        </div>
      </div>

      {/* Painel Informativo de Regras de Execução e Assinatura por Frota (RBAC 145) */}
      {exibirGuiaOperacional && (
        <div className="no-print bg-sky-50/80 border border-sky-200 rounded-lg p-3 text-xs text-sky-950 flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold flex items-center gap-2">
                <span>Como designar mecânicos para executar e assinar a manutenção por frota:</span>
                <span className="text-[10px] bg-sky-200 text-sky-900 px-1.5 py-0.2 rounded font-semibold">
                  RBAC 145 / EASA
                </span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                • <strong>Apto a Executar:</strong> Marque a frota correspondente como <strong>SIM</strong> e a função{' '}
                <strong className="text-slate-900">Executante = SIM</strong>.<br />
                • <strong>Apto a Assinar (Liberação de Manutenção / CRS / RTS):</strong> Marque a frota como{' '}
                <strong>SIM</strong> e a função <strong className="text-pink-900">APRS = SIM</strong> (Autorização de Pessoal para Retorno ao Serviço).<br />
                • Você pode clicar diretamente no botão <strong>"Editar"</strong> na linha de cada mecânico para alterar bases, funções e frotas, ou clicar diretamente nas células da tabela para alternar SIM/NÃO.
              </p>
            </div>
          </div>
          <button
            onClick={() => setExibirGuiaOperacional(false)}
            className="text-slate-400 hover:text-slate-600 p-1 shrink-0 cursor-pointer"
            title="Dispensar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Screen Warning when rows > 40 */}
      {rows.length > db.configuracao.limite_linhas_pagina && (
        <div className="no-print bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2 rounded-md text-xs flex items-center justify-between">
          <span>
            Atenção: A lista atual possui <strong>{rows.length}</strong> mecânicos. Para caber perfeitamente em 1 página impressa, o limite recomendado é de até 40 linhas (ou utilize o filtro por Base).
          </span>
          <button
            onClick={() => setFiltroBase('REC')}
            className="text-amber-950 font-bold underline hover:text-amber-800 cursor-pointer ml-2"
          >
            Filtrar base REC (7 mecânicos)
          </button>
        </div>
      )}

      {/* Printable Sheet Container */}
      <div className="print-container bg-white p-6 rounded-lg border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none">
        {/* Official Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900 mb-2">
          {/* Company Brand & Logo */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-sky-950 text-white flex flex-col items-center justify-center font-black rounded border border-slate-900">
              <span className="text-sm tracking-tighter leading-none">IMPACTO</span>
              <span className="text-[8px] font-sans tracking-widest text-sky-300">AVIATION</span>
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900 leading-none">
                IMPACTO AVIATION SERVIÇOS AERONÁUTICOS
              </h2>
              <p className="text-[10px] font-bold text-slate-700 tracking-wide mt-0.5">
                ORGANIZAÇÃO DE MANUTENÇÃO AERONÁUTICA — ANAC / EASA PART 145.1003
              </p>
              <p className="text-[9px] text-slate-500 font-medium">
                LISTA OFICIAL DE DESIGNAÇÃO TÉCNICA E HABILITAÇÃO DE PESSOAL CERTIFICADOR
              </p>
            </div>
          </div>

          {/* Reference and Scope Metadata */}
          <div className="text-right text-[11px] leading-tight space-y-0.5">
            <div className="font-bold text-slate-900">
              BASE:{' '}
              <span className="font-mono text-sky-900 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                {filtroBase}
              </span>
            </div>
            <div className="text-slate-600 font-medium">
              DATA DE EMISSÃO / REF:{' '}
              <span className="font-mono font-bold text-slate-900">
                {formatarDataBr(dataReferencia)}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              TOTAL DE MECÂNICOS LISTADOS: <span className="font-bold text-slate-800">{rows.length}</span>
            </div>
          </div>
        </div>

        {/* 4-Tier Complex Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-300 text-[10px]">
            {/* Multi-tier Merged Header */}
            <thead>
              {/* Row 1 of Header */}
              <tr className="bg-slate-200 text-slate-900 text-center font-bold">
                <th rowSpan={3} className="border border-slate-300 px-2 py-1 text-center w-16">
                  BASE
                </th>
                <th rowSpan={3} className="border border-slate-300 px-2 py-1 text-left min-w-[190px]">
                  NOMES
                </th>
                <th rowSpan={3} className="border border-slate-300 px-1 py-1 text-center w-14">
                  IMP
                </th>
                {/* LICENSE: CANAC (1) + CHT (4) + FAA (2) = 7 columns */}
                <th colSpan={7} className="border border-slate-300 px-2 py-1 bg-slate-300 text-slate-950 font-black">
                  LICENSE (COM 200607-05 / ANAC)
                </th>
                <th rowSpan={3} className="border border-slate-300 px-1 py-1 text-center w-14">
                  EASA<br />Type
                </th>
                <th
                  colSpan={5}
                  style={{ backgroundColor: '#FF99FF' }}
                  className="border border-slate-400 px-2 py-1 text-slate-950 font-black text-xs"
                >
                  DESIGNAÇÃO
                </th>
                <th
                  colSpan={6}
                  style={{ backgroundColor: '#FF99FF' }}
                  className="border border-slate-400 px-2 py-1 text-slate-950 font-black text-xs"
                >
                  AERONAVES
                </th>
                <th
                  rowSpan={3}
                  className="no-print border border-slate-300 px-2 py-1 text-center bg-slate-200 text-slate-900 font-bold min-w-[65px]"
                >
                  AÇÕES
                </th>
              </tr>

              {/* Row 2 of Header: License Sub-blocks */}
              <tr className="bg-slate-100 text-slate-900 text-center font-bold text-[9px]">
                <th rowSpan={2} className="border border-slate-300 px-1 py-0.5 w-14">
                  CANAC
                </th>
                <th colSpan={4} className="border border-slate-300 px-1 py-0.5 bg-slate-200">
                  CHT License and expiration
                </th>
                <th colSpan={2} className="border border-slate-300 px-1 py-0.5 bg-slate-200">
                  FAA AMP
                </th>
                {/* Designation Functions */}
                <th className="border border-slate-300 px-1 py-0.5 bg-[#EDEDED] font-bold text-[9px]">Executante</th>
                <th className="border border-slate-300 px-1 py-0.5 bg-[#EDEDED] font-bold text-[9px]">Supervisor</th>
                <th className="border border-slate-300 px-1 py-0.5 bg-[#EDEDED] font-bold text-[9px]">IIO</th>
                <th className="border border-slate-300 px-1 py-0.5 bg-[#EDEDED] font-bold text-[9px]">Inspetor</th>
                <th className="border border-slate-300 px-1 py-0.5 bg-[#EDEDED] font-bold text-[9px]">APRS</th>
                {/* Aircraft Models */}
                <th className="border border-slate-300 px-1 py-0.5 font-bold text-[9px]">B737</th>
                <th className="border border-slate-300 px-1 py-0.5 font-bold text-[9px]">E190E2</th>
                <th className="border border-slate-300 px-1 py-0.5 font-bold text-[9px]">A320FAM</th>
                <th className="border border-slate-300 px-1 py-0.5 font-bold text-[9px]">A330</th>
                <th className="border border-slate-300 px-1 py-0.5 font-bold text-[9px]">B767</th>
                <th className="border border-slate-300 px-1 py-0.5 font-bold text-[9px]">B777</th>
              </tr>

              {/* Row 3 of Header: Lowest level column names */}
              <tr className="bg-slate-50 text-slate-700 text-center font-semibold text-[8px]">
                {/* CHT */}
                <th className="border border-slate-300 px-1 py-0.5 min-w-[55px]">Licença Nº</th>
                <th className="border border-slate-300 px-1 py-0.5 min-w-[62px]">AVI</th>
                <th className="border border-slate-300 px-1 py-0.5 min-w-[62px]">CEL</th>
                <th className="border border-slate-300 px-1 py-0.5 min-w-[62px]">GMP</th>
                {/* FAA */}
                <th className="border border-slate-300 px-1 py-0.5 min-w-[55px]">License Nº</th>
                <th className="border border-slate-300 px-1 py-0.5 min-w-[58px]">Expedition</th>
                {/* Designation repeat headers */}
                <th className="border border-slate-300 px-1 py-0.5 bg-[#EDEDED]"></th>
                <th className="border border-slate-300 px-1 py-0.5 bg-[#EDEDED]"></th>
                <th className="border border-slate-300 px-1 py-0.5 bg-[#EDEDED]"></th>
                <th className="border border-slate-300 px-1 py-0.5 bg-[#EDEDED]"></th>
                <th className="border border-slate-300 px-1 py-0.5 bg-[#EDEDED]"></th>
                {/* Aircraft repeat headers */}
                <th className="border border-slate-300 px-1 py-0.5"></th>
                <th className="border border-slate-300 px-1 py-0.5"></th>
                <th className="border border-slate-300 px-1 py-0.5"></th>
                <th className="border border-slate-300 px-1 py-0.5"></th>
                <th className="border border-slate-300 px-1 py-0.5"></th>
                <th className="border border-slate-300 px-1 py-0.5"></th>
              </tr>
            </thead>

            {/* Table Rows */}
            <tbody className="divide-y divide-slate-200">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={22} className="p-8 text-center text-slate-500 text-xs">
                    Nenhum mecânico designado para a base selecionada ({filtroBase}).
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.pessoa.id} className="hover:bg-sky-50/40 print:hover:bg-transparent">
                    {/* BASE */}
                    <td className="p-1 text-center font-mono font-bold text-[9px] text-slate-700 border border-slate-300 whitespace-nowrap">
                      {r.baseTexto}
                    </td>

                    {/* NOMES */}
                    <td className="p-1 px-2 font-semibold text-slate-900 border border-slate-300 whitespace-nowrap text-[10px]">
                      {r.pessoa.nome}
                    </td>

                    {/* IMP */}
                    <td className="p-1 text-center font-mono font-medium text-slate-600 border border-slate-300 text-[9px]">
                      {r.imp || '-'}
                    </td>

                    {/* CANAC */}
                    <td className="p-1 text-center font-mono text-slate-800 border border-slate-300 text-[10px]">
                      {r.pessoa.canac || '-'}
                    </td>

                    {/* CHT Licença Nº */}
                    <td className="p-1 text-center font-mono font-semibold text-[9px] text-slate-800 border border-slate-300">
                      {r.licencaNumero || '-'}
                    </td>

                    {/* CHT Dates with Color Highlighting */}
                    {renderChtDateCell(r.chtAvi)}
                    {renderChtDateCell(r.chtCel)}
                    {renderChtDateCell(r.chtGmp)}

                    {/* FAA AMP License Nº & Expedition */}
                    <td className="p-1 text-center font-mono text-[9px] text-slate-700 border border-slate-300">
                      {r.faaNumero || 'N/A'}
                    </td>
                    <td className="p-1 text-center font-mono text-[9px] text-slate-700 border border-slate-300">
                      {r.faaExpedicao ? formatarDataBr(r.faaExpedicao) : 'N/A'}
                    </td>

                    {/* EASA Type */}
                    <td className="p-1 text-center font-bold text-[9px] border border-slate-300 text-slate-800">
                      {r.easaType}
                    </td>

                    {/* Funções de Designação (#EDEDED background) - Com suporte a clique rápido */}
                    {renderSimNaoCell(
                      r.executante,
                      true,
                      currentUser.perfil !== 'Leitor'
                        ? () => handleQuickToggleFuncao(r.pessoa.id, 'Executante', r.executante)
                        : undefined,
                      'Executante (Apto a executar manutenção). Clique para alternar SIM/NÃO/Vazio'
                    )}
                    {renderSimNaoCell(
                      r.supervisor,
                      true,
                      currentUser.perfil !== 'Leitor'
                        ? () => handleQuickToggleFuncao(r.pessoa.id, 'Supervisor', r.supervisor)
                        : undefined,
                      'Supervisor. Clique para alternar SIM/NÃO/Vazio'
                    )}
                    {renderSimNaoCell(
                      r.iio,
                      true,
                      currentUser.perfil !== 'Leitor'
                        ? () => handleQuickToggleFuncao(r.pessoa.id, 'IIO', r.iio)
                        : undefined,
                      'IIO (Inspeção de Itens Obrigatórios / RII). Clique para alternar'
                    )}
                    {renderSimNaoCell(
                      r.inspetor,
                      true,
                      currentUser.perfil !== 'Leitor'
                        ? () => handleQuickToggleFuncao(r.pessoa.id, 'Inspetor', r.inspetor)
                        : undefined,
                      'Inspetor de Qualidade. Clique para alternar SIM/NÃO/Vazio'
                    )}
                    {renderSimNaoCell(
                      r.aprs,
                      true,
                      currentUser.perfil !== 'Leitor'
                        ? () => handleQuickToggleFuncao(r.pessoa.id, 'APRS', r.aprs)
                        : undefined,
                      'APRS (Apto a ASSINAR e liberar manutenção - CRS/RTS). Clique para alternar'
                    )}

                    {/* Frotas de Designação - Com suporte a clique rápido */}
                    {renderSimNaoCell(
                      r.b737,
                      false,
                      currentUser.perfil !== 'Leitor'
                        ? () => handleQuickToggleAero(r.pessoa.id, 'B737', r.b737)
                        : undefined,
                      'Frota B737. Clique para alternar SIM/NÃO/Vazio'
                    )}
                    {renderSimNaoCell(
                      r.e190,
                      false,
                      currentUser.perfil !== 'Leitor'
                        ? () => handleQuickToggleAero(r.pessoa.id, 'E190E2', r.e190)
                        : undefined,
                      'Frota E190E2. Clique para alternar SIM/NÃO/Vazio'
                    )}
                    {renderSimNaoCell(
                      r.a320,
                      false,
                      currentUser.perfil !== 'Leitor'
                        ? () => handleQuickToggleAero(r.pessoa.id, 'A320FAM', r.a320)
                        : undefined,
                      'Frota A320FAM. Clique para alternar SIM/NÃO/Vazio'
                    )}
                    {renderSimNaoCell(
                      r.a330,
                      false,
                      currentUser.perfil !== 'Leitor'
                        ? () => handleQuickToggleAero(r.pessoa.id, 'A330', r.a330)
                        : undefined,
                      'Frota A330. Clique para alternar SIM/NÃO/Vazio'
                    )}
                    {renderSimNaoCell(
                      r.b767,
                      false,
                      currentUser.perfil !== 'Leitor'
                        ? () => handleQuickToggleAero(r.pessoa.id, 'B767', r.b767)
                        : undefined,
                      'Frota B767. Clique para alternar SIM/NÃO/Vazio'
                    )}
                    {renderSimNaoCell(
                      r.b777,
                      false,
                      currentUser.perfil !== 'Leitor'
                        ? () => handleQuickToggleAero(r.pessoa.id, 'B777', r.b777)
                        : undefined,
                      'Frota B777. Clique para alternar SIM/NÃO/Vazio'
                    )}

                    {/* Coluna AÇÕES */}
                    <td className="no-print p-1 text-center border border-slate-300 whitespace-nowrap">
                      <button
                        onClick={() => handleAbrirModal(r.pessoa)}
                        className="px-2 py-0.5 bg-sky-900 hover:bg-sky-800 text-white font-bold rounded text-[9px] transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                        title={`Editar designações, bases e autorizações de frota de ${r.pessoa.nome}`}
                      >
                        <Edit2 className="w-2.5 h-2.5 text-sky-300" />
                        <span>Editar</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Printable Footer with Official Signature */}
        <div className="mt-6 pt-4 border-t border-slate-300 flex items-end justify-between text-xs">
          <div className="text-[10px] text-slate-500 space-y-1">
            <p>
              <strong>Legenda de Validade:</strong> CHTs vencidas ou a vencer em até 90 dias aparecem destacadas para controle operacional prévio.
            </p>
            <p>
              Documento emitido pelo Sistema Informatizado de Treinamentos e Designação Técnica da Impacto Aviation.
            </p>
          </div>

          {/* Technical Responsible Signature Block */}
          <div className="text-center w-72">
            <div className="h-10 flex items-center justify-center">
              {db.configuracao.assinatura_url ? (
                <img
                  src={db.configuracao.assinatura_url}
                  alt="Assinatura"
                  className="max-h-10 object-contain mx-auto"
                />
              ) : (
                <div className="font-serif italic text-slate-700 text-sm tracking-wider">
                  Alysson Rabelo
                </div>
              )}
            </div>
            <div className="border-t border-slate-800 pt-1">
              <div className="font-bold text-[11px] text-slate-900 leading-tight">
                {db.configuracao.responsavel_tecnico || 'Alysson Rabelo - Technical Responsible'}
              </div>
              <div className="text-[9px] text-slate-600 font-medium">
                Responsável Técnico — COM 200607-05
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE EDIÇÃO DE DESIGNAÇÃO & AUTORIZAÇÃO DE FROTA                      */}
      {/* ========================================================================= */}
      {mecanicoParaEditar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-slate-200 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-100 text-sky-800 rounded-lg">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Designação Técnica &amp; Autorizações de Frota
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mecânico: <strong className="text-slate-800">{mecanicoParaEditar.nome}</strong> (CANAC:{' '}
                    <span className="font-mono">{mecanicoParaEditar.canac || 'N/A'}</span>)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMecanicoParaEditar(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Seção 1: Bases Operacionais Designadas */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-700" />
                <span>Bases Operacionais Autorizadas (Estações Designadas)</span>
              </label>
              <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                {db.bases.map((base) => {
                  const isChecked = editBases.includes(base.id);
                  return (
                    <button
                      key={base.id}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setEditBases(editBases.filter((b) => b !== base.id));
                        } else {
                          setEditBases([...editBases, base.id]);
                        }
                      }}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md border transition cursor-pointer flex items-center gap-1.5 ${
                        isChecked
                          ? 'bg-sky-900 text-white border-sky-900 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span>{base.id}</span>
                      <span className="text-[10px] font-normal opacity-80">({base.nome})</span>
                      {isChecked && <Check className="w-3 h-3 text-sky-300" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seção 2: Dados de Registro da Designação */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Matrícula IMP (Designação)
                </label>
                <input
                  type="text"
                  value={editImp}
                  onChange={(e) => setEditImp(e.target.value)}
                  placeholder="Ex: IMP-015"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono uppercase bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  EASA Type Rating
                </label>
                <input
                  type="text"
                  value={editEasaType}
                  onChange={(e) => setEditEasaType(e.target.value)}
                  placeholder="Ex: B1, B2 ou N/A"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Lista Oficial F 001-29
                </label>
                <div className="flex items-center gap-2 pt-1">
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-slate-800">
                    <input
                      type="checkbox"
                      checked={editIncluirNaLista}
                      onChange={(e) => setEditIncluirNaLista(e.target.checked)}
                      className="rounded text-sky-900 focus:ring-sky-600 w-4 h-4 cursor-pointer"
                    />
                    <span>Exibir na Lista Oficial</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Seção 3: Funções Designadas (Executar vs Assinar/APRS) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-pink-700" />
                  <span>Funções Designadas pela Organização</span>
                </label>
                <span className="text-[10px] text-slate-500">
                  Clique nos botões para alternar (SIM / NÃO / Vazio)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                {funcoesLista.map((f) => {
                  const val = editFuncoes[f.id] || '';
                  const isSim = val === 'SIM';
                  const isNao = val === 'NÃO';

                  return (
                    <div
                      key={f.id}
                      className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 ${
                        f.destaque ? 'bg-pink-50/60 border-pink-200' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{f.label}</span>
                          {f.destaque && (
                            <span className="text-[9px] bg-pink-200 text-pink-900 font-bold px-1.5 py-0.2 rounded">
                              Assina Manutenção
                            </span>
                          )}
                          {f.id === 'Executante' && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                              Executa Manutenção
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{f.finalidade}</p>
                      </div>

                      <div className="inline-flex rounded border border-slate-300 bg-slate-100 p-0.5 text-xs font-bold shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditFuncoes({ ...editFuncoes, [f.id]: 'SIM' })}
                          className={`px-2 py-0.5 rounded transition cursor-pointer text-[10px] ${
                            isSim ? 'bg-emerald-700 text-white shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          SIM
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditFuncoes({ ...editFuncoes, [f.id]: 'NÃO' })}
                          className={`px-2 py-0.5 rounded transition cursor-pointer text-[10px] ${
                            isNao ? 'bg-slate-700 text-white shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          NÃO
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditFuncoes({ ...editFuncoes, [f.id]: '' })}
                          className={`px-1.5 py-0.5 rounded transition cursor-pointer text-[10px] ${
                            !val ? 'bg-amber-500 text-slate-950 shadow-2xs font-bold' : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title="Sem decisão / Pendente"
                        >
                          -
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Seção 4: Frotas e Aeronaves Autorizadas (Aptidão de Frota) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5 text-sky-700" />
                  <span>Frotas / Aeronaves Designadas (Aptidão Operacional por Modelo)</span>
                </label>
                <span className="text-[10px] text-slate-500">
                  Indique quais frotas este mecânico está apto
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                {aeronavesLista.map((aero) => {
                  const val = editAeronaves[aero] || '';
                  const isSim = val === 'SIM';
                  const isNao = val === 'NÃO';

                  const aptoExecutar = isSim && editFuncoes.Executante === 'SIM';
                  const aptoAssinar = isSim && editFuncoes.APRS === 'SIM';

                  return (
                    <div
                      key={aero}
                      className={`p-2.5 rounded-lg border transition ${
                        isSim
                          ? 'bg-sky-50/70 border-sky-300'
                          : isNao
                          ? 'bg-slate-100 border-slate-200'
                          : 'bg-white border-amber-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-slate-900 font-mono">{aero}</span>
                        <div className="inline-flex rounded border border-slate-300 bg-white p-0.5 text-[9px] font-bold">
                          <button
                            type="button"
                            onClick={() => setEditAeronaves({ ...editAeronaves, [aero]: 'SIM' })}
                            className={`px-1.5 py-0.5 rounded cursor-pointer ${
                              isSim ? 'bg-sky-900 text-white font-black' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            SIM
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditAeronaves({ ...editAeronaves, [aero]: 'NÃO' })}
                            className={`px-1.5 py-0.5 rounded cursor-pointer ${
                              isNao ? 'bg-slate-700 text-white font-black' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            NÃO
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditAeronaves({ ...editAeronaves, [aero]: '' })}
                            className={`px-1 py-0.5 rounded cursor-pointer ${
                              !val ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400'
                            }`}
                            title="Pendente"
                          >
                            ?
                          </button>
                        </div>
                      </div>

                      {/* Resumo da Aptidão na Frota */}
                      <div className="pt-1 border-t border-slate-200/60 flex flex-wrap gap-1 text-[9px]">
                        {aptoExecutar && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 font-bold">
                            ✓ Executar
                          </span>
                        )}
                        {aptoAssinar && (
                          <span className="px-1.5 py-0.2 rounded bg-pink-100 text-pink-900 font-bold">
                            ✓ Assinar (CRS)
                          </span>
                        )}
                        {isSim && !aptoExecutar && !aptoAssinar && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                            Sem função ativa
                          </span>
                        )}
                        {isNao && (
                          <span className="text-slate-400 italic">Não autorizado</span>
                        )}
                        {!val && (
                          <span className="text-amber-800 italic">Pendente decisão</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMecanicoParaEditar(null)}
                disabled={isSavingModal}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarModal}
                disabled={isSavingModal}
                className="px-5 py-2.5 bg-sky-900 hover:bg-sky-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingModal ? (
                  <span>Salvando no Firestore...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-sky-300" />
                    <span>Salvar Designações &amp; Frotas</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
