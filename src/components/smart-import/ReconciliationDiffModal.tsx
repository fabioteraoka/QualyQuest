import React from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sliders,
  User,
  Award,
  FileText,
  Wrench
} from 'lucide-react';
import { RegistroLinhaImportacao, TipoControleImportacao } from '../../types';

interface ReconciliationDiffModalProps {
  linha: RegistroLinhaImportacao | null;
  tipoControle: TipoControleImportacao;
  isOpen: boolean;
  onClose: () => void;
  onDecidir: (
    indiceLinha: number,
    decisao: 'ATUALIZAR' | 'MANTER_EXISTENTE' | 'CRIAR_NOVO' | 'IGNORAR'
  ) => void;
  onAlterarPessoaAcao?: (indiceLinha: number, acao: 'VINCULAR_EXISTENTE' | 'CRIAR_PESSOA') => void;
  onAlterarCursoAcao?: (indiceLinha: number, acao: 'VINCULAR_EXISTENTE' | 'CRIAR_CURSO') => void;
}

export const ReconciliationDiffModal: React.FC<ReconciliationDiffModalProps> = ({
  linha,
  tipoControle,
  isOpen,
  onClose,
  onDecidir,
  onAlterarPessoaAcao,
  onAlterarCursoAcao,
}) => {
  if (!isOpen || !linha) return null;

  const divergencias = linha.camposDivergentes || [];
  const dadosNovos = linha.dadosMapeados || {};
  const dadosAtuais = linha.dadosExistentesSnapshot || {};
  const isAlterado = linha.classificacaoReconciliacao === 'EXISTENTE_ALTERADO';
  const isDuplicidade = linha.classificacaoReconciliacao === 'POSSIVEL_DUPLICIDADE';

  const getModuloIcon = () => {
    switch (tipoControle) {
      case 'CALIBRACAO_FERRAMENTAL':
        return <Wrench className="w-5 h-5 text-blue-600" />;
      case 'TREINAMENTOS':
        return <User className="w-5 h-5 text-blue-600" />;
      case 'CONTROLE_DOCUMENTAL':
        return <FileText className="w-5 h-5 text-blue-600" />;
      default:
        return <Layers className="w-5 h-5 text-blue-600" />;
    }
  };

  const getIdentificador = () => {
    if (tipoControle === 'CALIBRACAO_FERRAMENTAL') {
      return `${dadosNovos.codigoPatrimonio || 'SEM-PAT'} — ${dadosNovos.descricao || 'Instrumento'}`;
    }
    if (tipoControle === 'TREINAMENTOS') {
      return `${dadosNovos.pessoaNome || 'Colaborador'} | Curso: ${dadosNovos.cursoNome || 'Treinamento'}`;
    }
    if (tipoControle === 'CONTROLE_DOCUMENTAL') {
      return `${dadosNovos.codigo || 'DOC'} Rev. ${dadosNovos.revisaoAtual || '00'} — ${dadosNovos.titulo || 'Documento'}`;
    }
    return `Linha #${linha.indiceLinha}`;
  };

  return (
    <div
      id="modal-reconciliation-diff"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* CABEÇALHO DO MODAL */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
              {getModuloIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
                  Linha #{linha.indiceLinha}
                </span>
                {isAlterado && (
                  <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                    Cadastro Existente com Dados Divergentes
                  </span>
                )}
                {isDuplicidade && (
                  <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                    Possível Duplicidade Identificada
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                {getIdentificador()}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPO DO MODAL: COMPARAÇÃO LADO A LADO */}
        <div className="p-6 space-y-6 max-h-[68vh] overflow-y-auto">
          {/* CONTEXTO DO REGISTRO EXISTENTE */}
          {linha.registroExistenteResumo && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-2.5">
              <Sliders className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-0.5">Diagnóstico de Correspondência com Banco Oficial:</strong>
                <p className="text-blue-900 leading-relaxed">{linha.registroExistenteResumo}</p>
              </div>
            </div>
          )}

          {/* CASO ESPECÍFICO: VINCULAR PESSOA OU CRIAR NOVA */}
          {tipoControle === 'TREINAMENTOS' && onAlterarPessoaAcao && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-600" />
                  Vínculo com Cadastro Oficial de Pessoas (RH / SGQ):
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {linha.pessoaAcao === 'VINCULAR_EXISTENTE' ? '✓ Vinculado' : '+ Criar Novo'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => onAlterarPessoaAcao(linha.indiceLinha, 'VINCULAR_EXISTENTE')}
                  className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                    linha.pessoaAcao === 'VINCULAR_EXISTENTE'
                      ? 'border-blue-500 bg-blue-50/80 font-bold text-blue-900 ring-1 ring-blue-400'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="block text-[11px] text-slate-500 font-normal">Opção Recomendada:</span>
                  Vincular ao Colaborador Existente:
                  <strong className="block text-slate-900 mt-0.5 truncate">
                    {linha.pessoaNomeVinculada || dadosNovos.pessoaNome || 'Colaborador'}
                  </strong>
                </button>

                <button
                  type="button"
                  onClick={() => onAlterarPessoaAcao(linha.indiceLinha, 'CRIAR_PESSOA')}
                  className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                    linha.pessoaAcao === 'CRIAR_PESSOA'
                      ? 'border-purple-500 bg-purple-50/80 font-bold text-purple-900 ring-1 ring-purple-400'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="block text-[11px] text-slate-500 font-normal">Tratar como Homônimo:</span>
                  Cadastrar como Nova Pessoa no SGQ
                  <span className="block text-[11px] text-purple-700 font-medium mt-0.5">
                    (Requer validação expressa do Gestor)
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* TABELA COMPARATIVA CAMPO A CAMPO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Comparação Lado a Lado: Atual no QualiGest vs. Arquivo Importado
              </h4>
              <span className="text-[11px] text-slate-500">
                {divergencias.length > 0 ? (
                  <strong className="text-amber-700 font-bold">
                    {divergencias.length} campo(s) divergente(s)
                  </strong>
                ) : (
                  <span className="text-emerald-700 font-medium">Dados idênticos</span>
                )}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-1/4">Campo Oficial</th>
                    <th className="p-3 w-1/3 text-slate-700">Valor Atual no Banco QualiGest</th>
                    <th className="p-3 w-1/3 text-blue-900">Novo Valor na Planilha</th>
                    <th className="p-3 text-center w-16">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {Object.keys(dadosNovos).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">
                        Nenhum campo mapeado nesta linha.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(dadosNovos).map(([campo, valorNovo]) => {
                      const divItem = divergencias.find((d) => d.campo === campo);
                      const valorAtual = divItem ? divItem.valorAtual : dadosAtuais[campo];
                      const isDiferente = Boolean(divItem) || (valorAtual !== undefined && String(valorAtual) !== String(valorNovo));

                      return (
                        <tr
                          key={campo}
                          className={isDiferente ? 'bg-amber-50/40 font-medium' : 'hover:bg-slate-50'}
                        >
                          <td className="p-3 font-semibold text-slate-800">
                            {divItem?.label || campo}
                          </td>

                          <td className="p-3 font-mono text-[11px] text-slate-600">
                            {valorAtual !== undefined && valorAtual !== null && String(valorAtual).trim() !== '' ? (
                              String(valorAtual)
                            ) : (
                              <span className="text-slate-400 italic font-sans">— (Não preenchido)</span>
                            )}
                          </td>

                          <td className="p-3 font-mono text-[11px] font-bold text-blue-950">
                            {valorNovo !== undefined && valorNovo !== null && String(valorNovo).trim() !== '' ? (
                              <span className={isDiferente ? 'text-amber-950 bg-amber-100/70 px-1.5 py-0.5 rounded' : ''}>
                                {String(valorNovo)}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic font-sans">—</span>
                            )}
                          </td>

                          <td className="p-3 text-center whitespace-nowrap">
                            {isDiferente ? (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                                Divergente
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Igual
                              </span>
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

          {/* NOTA METROLÓGICA OU DOCUMENTAL SE FOR O CASO */}
          {tipoControle === 'CALIBRACAO_FERRAMENTAL' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
              <strong className="text-slate-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                Rastreabilidade Metrológica RBAC 145.109:
              </strong>
              <p>
                Ao escolher "Atualizar Cadastro Oficial", uma nova calibração será adicionada ao histórico metrológico do instrumento, preservando integralmente certificados e datas anteriores para auditorias da ANAC.
              </p>
            </div>
          )}

          {tipoControle === 'CONTROLE_DOCUMENTAL' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
              <strong className="text-slate-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                Governança Documental SGQ:
              </strong>
              <p>
                Ao atualizar um documento existente com nova revisão ou data, a versão anterior é arquivada no histórico de revisões com carimbo temporal.
              </p>
            </div>
          )}
        </div>

        {/* RODAPÉ DO MODAL: BOTÕES DE DECISÃO DO USUÁRIO */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            Decisão atual: <strong className="text-slate-900">{linha.decisaoUsuario || linha.acaoDuplicidade}</strong>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onDecidir(linha.indiceLinha, 'MANTER_EXISTENTE');
                onClose();
              }}
              className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Manter Atual do SGQ (Ignorar Planilha)
            </button>

            <button
              type="button"
              onClick={() => {
                onDecidir(linha.indiceLinha, 'CRIAR_NOVO');
                onClose();
              }}
              className="px-3 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-900 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Criar como Registro Separado
            </button>

            <button
              type="button"
              onClick={() => {
                onDecidir(linha.indiceLinha, 'ATUALIZAR');
                onClose();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              Atualizar Cadastro Oficial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
