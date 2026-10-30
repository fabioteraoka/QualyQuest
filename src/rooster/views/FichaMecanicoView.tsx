import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Edit2,
  FileCheck2,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  User,
  Wrench,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { repository } from '../services/storage';
import {
  AeronaveDesignacao,
  CategoriaPessoa,
  CursoCatalogo,
  EasaType,
  ItemStatus,
  Licenca,
  Pessoa,
  SituacaoPessoa,
  Treinamento,
} from '../types';
import {
  AERONAVE_PARA_FROTAS,
  calcularDiasParaVencer,
  calcularStatusLicenca,
  calcularStatusTreinamento,
  conferirDesignacao,
  formatarDataBr,
  getStatusColor,
  piorStatus,
} from '../utils/businessRules';

export const FichaMecanicoView: React.FC = () => {
  const {
    db,
    selectedPessoaId,
    setSelectedPessoaId,
    dataReferencia,
    faixas,
    currentUser,
    showToast,
    triggerPrint,
  } = useApp();

  const [buscaNome, setBuscaNome] = useState('');
  const [modalNovoTreinamento, setModalNovoTreinamento] = useState(false);
  const [modalNovaLicenca, setModalNovaLicenca] = useState(false);
  const [modalRenovar, setModalRenovar] = useState<{ id: string; cursoNome: string } | null>(null);

  // Form states
  const [novoTrnCursoId, setNovoTrnCursoId] = useState('');
  const [novoTrnDataExec, setNovoTrnDataExec] = useState(dataReferencia);
  const [novoTrnMotores, setNovoTrnMotores] = useState<string[]>([]);
  const [novoTrnObs, setNovoTrnObs] = useState('');

  const [novaLicOrgao, setNovaLicOrgao] = useState<'ANAC' | 'FAA'>('ANAC');
  const [novaLicTipo, setNovaLicTipo] = useState<'CHT' | 'CCT' | 'AMP'>('CHT');
  const [novaLicHab, setNovaLicHab] = useState<'AVI' | 'CEL' | 'GMP' | ''>('CEL');
  const [novaLicNumero, setNovaLicNumero] = useState('');
  const [novaLicVencimento, setNovaLicVencimento] = useState('');
  const [novaLicExpedicao, setNovaLicExpedicao] = useState('');

  const [renovacaoData, setRenovacaoData] = useState(dataReferencia);

  // State for editing mechanic / person data (placed at top level to satisfy Rules of Hooks)
  const [modalEditarPessoa, setModalEditarPessoa] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editCanac, setEditCanac] = useState('');
  const [editCategoria, setEditCategoria] = useState<CategoriaPessoa>('Mecânico');
  const [editSituacao, setEditSituacao] = useState<SituacaoPessoa>('Ativo');
  const [editBasePrincipal, setEditBasePrincipal] = useState('REC');
  const [editClienteOuArea, setEditClienteOuArea] = useState('');
  const [editImp, setEditImp] = useState('');
  const [editEasaType, setEditEasaType] = useState<EasaType>('N/A');
  const [editBasesDesignadas, setEditBasesDesignadas] = useState<string[]>([]);

  const pessoa = useMemo(() => {
    return db.pessoas.find((p) => p.id === selectedPessoaId) || db.pessoas[0];
  }, [db.pessoas, selectedPessoaId]);

  const cursosMap = useMemo(() => {
    const map = new Map<string, CursoCatalogo>();
    db.cursosCatalogo.forEach((c) => map.set(c.id, c));
    return map;
  }, [db.cursosCatalogo]);

  const licencasPessoa = useMemo(() => {
    if (!pessoa) return [];
    return db.licencas.filter((l) => l.pessoa_id === pessoa.id);
  }, [db.licencas, pessoa]);

  const treinamentosPessoa = useMemo(() => {
    if (!pessoa) return [];
    return db.treinamentos.filter((t) => t.pessoa_id === pessoa.id);
  }, [db.treinamentos, pessoa]);

  const desigPessoa = useMemo(() => {
    if (!pessoa) return null;
    return db.designacoesPessoa.find((dp) => dp.pessoa_id === pessoa.id);
  }, [db.designacoesPessoa, pessoa]);

  const basesPessoa = useMemo(() => {
    if (!pessoa) return [];
    return db.designacoesBase
      .filter((dbItem) => dbItem.pessoa_id === pessoa.id)
      .map((b) => b.base_id);
  }, [db.designacoesBase, pessoa]);

  // Engines Vigente vs Vencido
  const motoresStatus = useMemo(() => {
    if (!pessoa) return [];
    const resultados: Array<{
      motorId: string;
      fabricante: string;
      modelo: string;
      status: 'Vigente' | 'Vencido' | 'Sem registro';
    }> = [];

    db.motoresCatalogo.forEach((motor) => {
      // Find all trainings for this person with this motor
      const trnIds = db.treinamentosMotor
        .filter((tm) => tm.motor_id === motor.id)
        .map((tm) => tm.treinamento_id);

      const trnsComMotor = treinamentosPessoa.filter(
        (t) => trnIds.includes(t.id) && !t.substituido_por
      );

      if (trnsComMotor.length === 0) return;

      const hasVigente = trnsComMotor.some((t) => {
        const c = cursosMap.get(t.curso_id);
        const { status } = calcularStatusTreinamento(t, c, dataReferencia, db.configuracao);
        return status === 'Em dia' || status === 'Sem vencimento' || status.startsWith('Vence ≤');
      });

      resultados.push({
        motorId: motor.id,
        fabricante: motor.fabricante,
        modelo: motor.modelo || 'Padrão Fabricante',
        status: hasVigente ? 'Vigente' : 'Vencido',
      });
    });

    return resultados;
  }, [db.motoresCatalogo, db.treinamentosMotor, treinamentosPessoa, cursosMap, dataReferencia, db.configuracao, pessoa]);

  // Designation functions & aircraft
  const funcoesDesignadas = useMemo(() => {
    if (!pessoa) return [];
    const lista = ['Executante', 'Supervisor', 'IIO', 'Inspetor', 'APRS'] as const;
    return lista.map((f) => {
      const valor = db.designacoesFuncao.find((df) => df.pessoa_id === pessoa.id && df.funcao === f)?.valor || '';
      return { funcao: f, valor };
    });
  }, [db.designacoesFuncao, pessoa]);

  const aeronavesDesignadas = useMemo(() => {
    if (!pessoa) return [];
    const lista: AeronaveDesignacao[] = ['B737', 'E190E2', 'A320FAM', 'A330', 'B767', 'B777'];
    return lista.map((aero) => {
      const valor = db.designacoesAeronave.find((da) => da.pessoa_id === pessoa.id && da.aeronave === aero)?.valor || '';
      const conformidade = conferirDesignacao(
        pessoa.id,
        aero,
        valor,
        db.treinamentos,
        cursosMap,
        dataReferencia,
        db.configuracao
      );
      return { aeronave: aero, valor, conformidade };
    });
  }, [db.designacoesAeronave, db.treinamentos, cursosMap, dataReferencia, db.configuracao, pessoa]);

  // Handle Save New Training
  const handleSaveTreinamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pessoa || !novoTrnCursoId || !novoTrnDataExec) return;

    const trnId = `TRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const novo: Treinamento = {
      id: trnId,
      pessoa_id: pessoa.id,
      curso_id: novoTrnCursoId,
      data_execucao: novoTrnDataExec,
      motor_original: '',
      observacao: novoTrnObs,
      substituido_por: null,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
      atualizado_por: currentUser.nome,
    };

    try {
      await repository.saveTreinamento(novo, novoTrnMotores, currentUser.nome);
      setModalNovoTreinamento(false);
      setNovoTrnCursoId('');
      setNovoTrnMotores([]);
      setNovoTrnObs('');
      showToast(`Treinamento cadastrado e persistido no Firestore para ${pessoa.nome}!`);
    } catch (err: any) {
      showToast(`Erro ao salvar treinamento: ${err?.message || err}`);
    }
  };

  // Handle Save New License
  const handleSaveLicenca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pessoa || !novaLicNumero) return;

    const licId = `LIC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nova: Licenca = {
      id: licId,
      pessoa_id: pessoa.id,
      orgao: novaLicOrgao,
      tipo: novaLicTipo,
      habilitacao: novaLicHab,
      numero: novaLicNumero,
      data_vencimento: novaLicTipo === 'CHT' ? novaLicVencimento : null,
      data_expedicao: novaLicTipo === 'AMP' ? novaLicExpedicao : null,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
      atualizado_por: currentUser.nome,
    };

    try {
      await repository.saveLicenca(nova, currentUser.nome);
      setModalNovaLicenca(false);
      setNovaLicNumero('');
      setNovaLicVencimento('');
      setNovaLicExpedicao('');
      showToast(`Licença ${novaLicOrgao} ${novaLicTipo} persistida no Firestore com sucesso!`);
    } catch (err: any) {
      showToast(`Erro ao salvar licença: ${err?.message || err}`);
    }
  };

  // Handle Quick Renewal
  const handleRenovacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalRenovar || !renovacaoData) return;

    try {
      await repository.renovarTreinamento(modalRenovar.id, renovacaoData, currentUser.nome);
      setModalRenovar(null);
      showToast(`Treinamento renovado com sucesso no Firestore!`);
    } catch (err: any) {
      showToast(`Erro ao renovar treinamento: ${err?.message || err}`);
    }
  };

  const handleExcluirLicenca = async (licId: string) => {
    if (confirm('Deseja realmente remover esta licença?')) {
      try {
        await repository.deleteLicenca(licId, currentUser.nome);
        showToast('Licença excluída do Firestore.');
      } catch (err: any) {
        showToast(`Erro ao excluir licença: ${err?.message || err}`);
      }
    }
  };

  const handleExcluirTreinamento = async (trnId: string) => {
    if (confirm('Deseja realmente remover este treinamento?')) {
      try {
        await repository.deleteTreinamento(trnId, currentUser.nome);
        showToast('Treinamento excluído do Firestore.');
      } catch (err: any) {
        showToast(`Erro ao excluir treinamento: ${err?.message || err}`);
      }
    }
  };

  // Handlers for editing mechanic / person data
  const handleOpenEditarPessoa = () => {
    if (!pessoa) return;
    setEditNome(pessoa.nome);
    setEditCanac(pessoa.canac || '');
    setEditCategoria(pessoa.categoria);
    setEditSituacao(pessoa.situacao);
    setEditBasePrincipal(pessoa.base_principal_id);
    setEditClienteOuArea(pessoa.cliente_ou_area || '');
    setEditImp(desigPessoa?.imp || '');
    setEditEasaType((desigPessoa?.easa_type as EasaType) || 'N/A');
    setEditBasesDesignadas(basesPessoa);
    setModalEditarPessoa(true);
  };

  const handleSavePessoaEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pessoa || !editNome.trim()) return;

    try {
      const updatedPessoa: Pessoa = {
        ...pessoa,
        nome: editNome.trim(),
        canac: editCanac.trim(),
        categoria: editCategoria,
        situacao: editSituacao,
        base_principal_id: editBasePrincipal,
        cliente_ou_area: editClienteOuArea.trim(),
        atualizado_em: new Date().toISOString(),
        atualizado_por: currentUser.nome,
      };

      await repository.savePessoa(updatedPessoa, currentUser.nome);

      await repository.saveDesignacaoPessoa(
        {
          pessoa_id: pessoa.id,
          imp: editImp.trim() || desigPessoa?.imp || '',
          easa_type: editEasaType,
          incluir_na_lista: desigPessoa ? desigPessoa.incluir_na_lista : true,
          nome_na_lista: editNome.trim(),
        },
        currentUser.nome
      );

      if (editBasesDesignadas.length > 0) {
        await repository.setDesignacaoBasesForPessoa(pessoa.id, editBasesDesignadas, currentUser.nome);
      }

      setModalEditarPessoa(false);
      showToast(`Dados de ${editNome} atualizados e salvos com sucesso no Firestore!`);
    } catch (err: any) {
      showToast(`Erro ao atualizar cadastro no Firestore: ${err?.message || err}`);
    }
  };

  if (!pessoa) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="font-semibold text-sm">Carregando dados dos mecânicos...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Selector and Actions (Hidden in Print) */}
      <div className="no-print bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Selecionar Mecânico / Colaborador:
          </label>
          <div className="relative">
            <select
              value={pessoa?.id ?? ''}
              onChange={(e) => setSelectedPessoaId(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md font-semibold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-sky-600 cursor-pointer"
            >
              {[...db.pessoas]
                .sort((a, b) => a.nome.localeCompare(b.nome))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.perfil !== 'Leitor' && (
            <>
              <button
                onClick={handleOpenEditarPessoa}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-300 rounded-md hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
                title="Editar dados cadastrais, base, CANAC e designações deste mecânico no banco de dados"
              >
                <Edit2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Editar Dados do Mecânico</span>
              </button>
              <button
                onClick={() => setModalNovaLicenca(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-sky-700" />
                <span>Adicionar Licença</span>
              </button>
              <button
                onClick={() => setModalNovoTreinamento(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-900 bg-sky-50 border border-sky-300 rounded-md hover:bg-sky-100 transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-sky-700" />
                <span>Adicionar Treinamento</span>
              </button>
            </>
          )}

          <button
            onClick={triggerPrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" />
            <span>Imprimir Ficha (PDF)</span>
          </button>
        </div>
      </div>

      {/* Main Printable Dossier Container */}
      <div className="print-container bg-white p-6 rounded-lg border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none space-y-6">
        {/* Header Profile Section */}
        <div className="pb-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-sky-950 text-white font-bold text-xl flex items-center justify-center border border-slate-800">
              {pessoa.nome.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-950">{pessoa.nome}</h1>
                <button
                  onClick={handleOpenEditarPessoa}
                  className="p-1 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer rounded"
                  title="Editar cadastro do mecânico"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                  {pessoa.id}
                </span>
                <span className="text-[11px] bg-sky-100 text-sky-900 font-semibold px-2 py-0.5 rounded">
                  {pessoa.categoria}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    pessoa.situacao === 'Ativo'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}
                >
                  {pessoa.situacao}
                </span>
              </div>
              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <span>
                  Base Principal: <strong>{pessoa.base_principal_id}</strong>
                </span>
                <span>·</span>
                <span>
                  Bases Designadas:{' '}
                  <strong>{basesPessoa.length > 0 ? basesPessoa.join('/') : pessoa.base_principal_id}</strong>
                </span>
                <span>·</span>
                <span>
                  Cliente/Área: <strong>{pessoa.cliente_ou_area || 'Operações'}</strong>
                </span>
                <span>·</span>
                <span>
                  CANAC: <strong className="font-mono">{pessoa.canac || 'Nenhum'}</strong>
                </span>
                <span>·</span>
                <span>
                  IMP: <strong className="font-mono">{desigPessoa?.imp || 'N/A'}</strong>
                </span>
                <span>·</span>
                <span>
                  EASA Type: <strong>{desigPessoa?.easa_type || 'N/A'}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Block 1: Licenças ANAC / FAA */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-sky-800" />
              <span>Habilitações &amp; Licenças Oficiais (ANAC / FAA)</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">
              {licencasPessoa.length} registradas
            </span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Órgão</th>
                  <th className="py-2 px-2">Tipo</th>
                  <th className="py-2 px-2">Habilitação</th>
                  <th className="py-2 px-3">Número</th>
                  <th className="py-2 px-3 text-center">Expedição</th>
                  <th className="py-2 px-3 text-center">Vencimento</th>
                  <th className="py-2 px-2 text-center">Dias Restantes</th>
                  <th className="py-2 px-3 text-center">Situação</th>
                  <th className="py-2 px-3 text-right no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {licencasPessoa.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-4 text-center text-slate-400 text-xs italic">
                      Nenhuma licença cadastrada para esta pessoa.
                    </td>
                  </tr>
                ) : (
                  licencasPessoa.map((lic) => {
                    const status = calcularStatusLicenca(lic, dataReferencia, db.configuracao);
                    const dias = lic.data_vencimento
                      ? calcularDiasParaVencer(lic.data_vencimento, dataReferencia)
                      : null;

                    return (
                      <tr key={lic.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-800">{lic.orgao}</td>
                        <td className="py-2 px-2 font-semibold text-slate-700">{lic.tipo}</td>
                        <td className="py-2 px-2 font-mono font-bold text-slate-900">
                          {lic.habilitacao || '-'}
                        </td>
                        <td className="py-2 px-3 font-mono font-medium text-slate-800">{lic.numero}</td>
                        <td className="py-2 px-3 text-center font-mono text-slate-600">
                          {formatarDataBr(lic.data_expedicao)}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold">
                          {formatarDataBr(lic.data_vencimento)}
                        </td>
                        <td className="py-2 px-2 text-center font-mono tabular-nums font-semibold">
                          {dias !== null ? `${dias}d` : '-'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <StatusBadge status={status} size="sm" />
                        </td>
                        <td className="py-2 px-3 text-right no-print">
                          {currentUser.perfil !== 'Leitor' && (
                            <button
                              onClick={() => handleExcluirLicenca(lic.id)}
                              className="text-slate-400 hover:text-red-700 cursor-pointer p-1"
                              title="Excluir licença"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Block 2: Designações e Conformidade */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Funções */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-pink-700" />
              <span>Funções Designadas</span>
            </h3>
            <div className="grid grid-cols-5 gap-1 text-center">
              {funcoesDesignadas.map((fd) => (
                <div
                  key={fd.funcao}
                  className="bg-white border border-slate-200 p-1.5 rounded flex flex-col items-center justify-center"
                >
                  <span className="text-[10px] text-slate-500 font-semibold">{fd.funcao}</span>
                  <span
                    className={`text-xs font-bold mt-0.5 ${
                      fd.valor === 'SIM'
                        ? 'text-emerald-700'
                        : fd.valor === 'NÃO'
                        ? 'text-slate-400'
                        : 'text-amber-500 italic'
                    }`}
                  >
                    {fd.valor || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Frotas com Selo de Conformidade */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-pink-700" />
                <span>Aeronaves Designadas &amp; Conformidade de Treinamento</span>
              </span>
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 text-center">
              {aeronavesDesignadas.map((ad) => {
                const isAlert =
                  ad.valor === 'SIM' && (ad.conformidade === 'Vencido' || ad.conformidade === 'Sem registro');

                return (
                  <div
                    key={ad.aeronave}
                    className={`border p-1.5 rounded flex flex-col items-center justify-between ${
                      isAlert
                        ? 'bg-red-50 border-red-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-slate-800">{ad.aeronave}</span>
                    <span
                      className={`text-xs font-bold ${
                        ad.valor === 'SIM' ? 'text-slate-900' : 'text-slate-300'
                      }`}
                    >
                      {ad.valor || '—'}
                    </span>
                    <span
                      className={`text-[8px] font-semibold mt-1 px-1 rounded ${
                        ad.conformidade === 'OK'
                          ? 'bg-emerald-100 text-emerald-900'
                          : ad.conformidade === 'Vencido'
                          ? 'bg-red-200 text-red-950'
                          : ad.conformidade === 'Sem registro' && ad.valor === 'SIM'
                          ? 'bg-orange-200 text-orange-950'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {ad.conformidade}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Block 3: Motores Habilitados */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-sky-800" />
              <span>Motores Aeronáuticos Habilitados</span>
            </h2>
          </div>
          {motoresStatus.length === 0 ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-400 text-xs italic">
              Nenhuma motorização vinculada aos treinamentos deste mecânico.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {motoresStatus.map((m) => (
                <div
                  key={m.motorId}
                  className={`border px-2.5 py-1 rounded text-xs flex items-center gap-2 ${
                    m.status === 'Vigente'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                      : 'bg-red-50 border-red-300 text-red-950 font-semibold'
                  }`}
                >
                  <span className="font-mono">{m.fabricante} {m.modelo}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                    ({m.status})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Block 4: Treinamentos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-sky-800" />
              <span>Treinamentos Executados &amp; Validades</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">
              {treinamentosPessoa.filter((t) => !t.substituido_por).length} ativos
            </span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Grupo</th>
                  <th className="py-2 px-2">Frota / Variante</th>
                  <th className="py-2 px-3">Curso</th>
                  <th className="py-2 px-2 text-center">Execução</th>
                  <th className="py-2 px-2 text-center">Vencimento</th>
                  <th className="py-2 px-2 text-center">Dias</th>
                  <th className="py-2 px-3 text-center">Situação</th>
                  <th className="py-2 px-3">Motores / Obs</th>
                  <th className="py-2 px-3 text-right no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {treinamentosPessoa.map((t) => {
                  const c = cursosMap.get(t.curso_id);
                  const { status, data_vencimento, dias_para_vencer } = calcularStatusTreinamento(
                    t,
                    c,
                    dataReferencia,
                    db.configuracao
                  );

                  const isSubstituido = !!t.substituido_por;

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-50 ${isSubstituido ? 'opacity-40 bg-slate-50/50' : ''}`}
                    >
                      <td className="py-2 px-3 font-medium text-slate-700">{c?.grupo || '-'}</td>
                      <td className="py-2 px-2 font-semibold text-slate-800">
                        {c?.variante || c?.frota || '-'}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {c?.curso || t.curso_id}
                        {isSubstituido && (
                          <span className="ml-2 text-[9px] text-slate-500 font-normal italic">
                            (Substituído / Histórico)
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-600">
                        {formatarDataBr(t.data_execucao)}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold">
                        {data_vencimento ? formatarDataBr(data_vencimento) : 'Sem vencimento'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono tabular-nums font-semibold">
                        {dias_para_vencer !== null ? `${dias_para_vencer}d` : '-'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <StatusBadge status={status} size="sm" />
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-[11px]">
                        {t.motor_original && (
                          <span className="font-mono text-slate-700 block">{t.motor_original}</span>
                        )}
                        {t.observacao && <span className="text-slate-400 block">{t.observacao}</span>}
                      </td>
                      <td className="py-2 px-3 text-right no-print">
                        {!isSubstituido && currentUser.perfil !== 'Leitor' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() =>
                                setModalRenovar({
                                  id: t.id,
                                  cursoNome: c?.curso || t.curso_id,
                                })
                              }
                              className="text-sky-700 hover:text-sky-900 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                              title="Renovar treinamento"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Renovar</span>
                            </button>
                            <button
                              onClick={() => handleExcluirTreinamento(t.id)}
                              className="text-slate-400 hover:text-red-700 cursor-pointer p-1"
                              title="Excluir"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Adicionar Treinamento */}
      {modalNovoTreinamento && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveTreinamento}
            className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                Adicionar Treinamento para {pessoa.nome}
              </h3>
              <button
                type="button"
                onClick={() => setModalNovoTreinamento(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Curso do Catálogo:
              </label>
              <select
                required
                value={novoTrnCursoId}
                onChange={(e) => setNovoTrnCursoId(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
              >
                <option value="">Selecione um curso...</option>
                {db.cursosCatalogo.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.grupo}] {c.variante ? `${c.variante} - ` : ''}
                    {c.curso} ({c.validade_dias} dias)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Data de Execução:
              </label>
              <input
                type="date"
                required
                value={novoTrnDataExec}
                onChange={(e) => setNovoTrnDataExec(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Motores Habilitados (Seleção Múltipla):
              </label>
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-2 border border-slate-200 rounded text-xs bg-slate-50">
                {db.motoresCatalogo.map((m) => {
                  const checked = novoTrnMotores.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setNovoTrnMotores([...novoTrnMotores, m.id]);
                          else setNovoTrnMotores(novoTrnMotores.filter((id) => id !== m.id));
                        }}
                      />
                      <span className="font-mono text-[11px]">
                        {m.fabricante} {m.modelo}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Observações:
              </label>
              <input
                type="text"
                value={novoTrnObs}
                onChange={(e) => setNovoTrnObs(e.target.value)}
                placeholder="Ex.: Certificado nº 8829/2026"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setModalNovoTreinamento(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-sky-900 text-white rounded text-xs font-semibold hover:bg-sky-800 cursor-pointer"
              >
                Salvar Treinamento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Adicionar Licença */}
      {modalNovaLicenca && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveLicenca}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                Adicionar Habilitação / Licença para {pessoa.nome}
              </h3>
              <button
                type="button"
                onClick={() => setModalNovaLicenca(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Órgão:</label>
                <select
                  value={novaLicOrgao}
                  onChange={(e) => setNovaLicOrgao(e.target.value as any)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
                >
                  <option value="ANAC">ANAC</option>
                  <option value="FAA">FAA</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Tipo:</label>
                <select
                  value={novaLicTipo}
                  onChange={(e) => setNovaLicTipo(e.target.value as any)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
                >
                  <option value="CHT">CHT (Tem Vencimento)</option>
                  <option value="CCT">CCT (Sem Vencimento)</option>
                  <option value="AMP">FAA AMP</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Habilitação:
                </label>
                <select
                  value={novaLicHab}
                  onChange={(e) => setNovaLicHab(e.target.value as any)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold"
                >
                  <option value="CEL">CEL (Célula)</option>
                  <option value="GMP">GMP (Grupo Motopropulsor)</option>
                  <option value="AVI">AVI (Aviônicos)</option>
                  <option value="">Vazio (AMP)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Número da Licença:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex.: 06403"
                  value={novaLicNumero}
                  onChange={(e) => setNovaLicNumero(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
                />
              </div>
            </div>

            {novaLicTipo === 'CHT' && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Data de Vencimento:
                </label>
                <input
                  type="date"
                  required
                  value={novaLicVencimento ?? ''}
                  onChange={(e) => setNovaLicVencimento(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
                />
              </div>
            )}

            {novaLicTipo === 'AMP' && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Data de Expedição:
                </label>
                <input
                  type="date"
                  required
                  value={novaLicExpedicao ?? ''}
                  onChange={(e) => setNovaLicExpedicao(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setModalNovaLicenca(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-sky-900 text-white rounded text-xs font-semibold hover:bg-sky-800 cursor-pointer"
              >
                Salvar Licença
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Renovar Rápido */}
      {modalRenovar && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleRenovacao}
            className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">Renovar Treinamento</h3>
              <button
                type="button"
                onClick={() => setModalRenovar(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Renovando <strong>{modalRenovar.cursoNome}</strong> para <strong>{pessoa.nome}</strong>. O registro anterior será preservado no histórico como substituído.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nova Data de Execução:
              </label>
              <input
                type="date"
                required
                value={renovacaoData ?? ''}
                onChange={(e) => setRenovacaoData(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setModalRenovar(null)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-sky-900 text-white rounded text-xs font-semibold hover:bg-sky-800 cursor-pointer"
              >
                Confirmar Renovação
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Editar Cadastro do Mecânico / Colaborador */}
      {modalEditarPessoa && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSavePessoaEdit}
            className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 space-y-4 my-8 border border-slate-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Editar Cadastro do Mecânico / Colaborador
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ID no Banco: <span className="font-mono font-bold text-slate-700">{pessoa.id}</span> · Alterações são gravadas diretamente no banco de dados
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalEditarPessoa(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editNome ?? ''}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  CANAC (Código ANAC)
                </label>
                <input
                  type="text"
                  value={editCanac ?? ''}
                  onChange={(e) => setEditCanac(e.target.value)}
                  placeholder="Ex: 124859"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Código IMP (Designação Interna)
                </label>
                <input
                  type="text"
                  value={editImp ?? ''}
                  onChange={(e) => setEditImp(e.target.value)}
                  placeholder="Ex: IMP-1042"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Categoria
                </label>
                <select
                  value={editCategoria ?? 'Mecânico'}
                  onChange={(e) => setEditCategoria(e.target.value as CategoriaPessoa)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Mecânico">Mecânico</option>
                  <option value="Administrativo">Administrativo</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Situação Cadastral
                </label>
                <select
                  value={editSituacao ?? 'Ativo'}
                  onChange={(e) => setEditSituacao(e.target.value as SituacaoPessoa)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Base Principal
                </label>
                <select
                  value={editBasePrincipal ?? ''}
                  onChange={(e) => setEditBasePrincipal(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold"
                >
                  {db.bases.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id} — {b.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Habilitação EASA Type
                </label>
                <select
                  value={editEasaType ?? 'N/A'}
                  onChange={(e) => setEditEasaType(e.target.value as EasaType)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="N/A">N/A (Não aplicável)</option>
                  <option value="B1">EASA B1 (Mecânica / Célula)</option>
                  <option value="B2">EASA B2 (Aviônica / Elétrica)</option>
                  <option value="A">EASA A (Linha / Trânsito)</option>
                  <option value="C">EASA C (Base Hangar)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">
                  Cliente / Área / Setor Operacional
                </label>
                <input
                  type="text"
                  value={editClienteOuArea ?? ''}
                  onChange={(e) => setEditClienteOuArea(e.target.value)}
                  placeholder="Ex: Manutenção de Linha / Trânsito"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">
                  Bases Designadas (Disponibilidade Operacional)
                </label>
                <div className="flex flex-wrap gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  {db.bases.map((b) => {
                    const checked = editBasesDesignadas.includes(b.id);
                    return (
                      <label
                        key={b.id}
                        className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold hover:text-emerald-700"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditBasesDesignadas([...editBasesDesignadas, b.id]);
                            } else {
                              setEditBasesDesignadas(
                                editBasesDesignadas.filter((id) => id !== b.id)
                              );
                            }
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{b.id} ({b.nome.split('/')[0].trim()})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setModalEditarPessoa(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar no Banco de Dados</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
