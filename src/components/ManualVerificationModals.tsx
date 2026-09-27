import React, { useState } from 'react';
import {
  X,
  Mail,
  Copy,
  ExternalLink,
  ShieldCheck,
  Building,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  Key,
  Globe,
  Bot,
  UserCheck,
  FileText
} from 'lucide-react';
import { DocumentoControlado, IdiomaSolicitacao } from '../types';

// ============================================================================
// 1. MODAL DE NOTIFICAÇÃO AUTOMATIZADA AO CLIENTE (MANUAIS FORNECIDOS)
// ============================================================================

interface CustomerNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  documento: DocumentoControlado | null;
  onConfirmSend: (docId: string, emailData: { email: string; assunto: string; corpo: string; protocolo: string }) => Promise<void>;
}

export const CustomerNotificationModal: React.FC<CustomerNotificationModalProps> = ({
  isOpen,
  onClose,
  documento,
  onConfirmSend,
}) => {
  const [idioma, setIdioma] = useState<IdiomaSolicitacao>('EN');
  const [destinatarioEmail, setDestinatarioEmail] = useState('');
  const [destinatarioNome, setDestinatarioNome] = useState('');
  const [prazoDias, setPrazoDias] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Inicializa com dados do documento
  React.useEffect(() => {
    if (documento) {
      setDestinatarioEmail(documento.contatoClienteEmail || 'techrecords@operador.com');
      setDestinatarioNome(documento.contatoClienteNome || 'Technical Records & QA Department');
      // Se for cliente internacional (Boeing, Kalitta, Atlas), sugere EN
      const prop = (documento.proprietarioCessor || documento.emissor || '').toUpperCase();
      if (prop.includes('KALITTA') || prop.includes('ATLAS') || prop.includes('BOEING') || prop.includes('CMA')) {
        setIdioma('EN');
      } else {
        setIdioma('PT');
      }
    }
  }, [documento]);

  if (!isOpen || !documento) return null;

  const revisaoAtual = documento.numeroRevisao || documento.revisaoVigenteNumero || 'Rev. Vigente';
  const clienteNome = documento.proprietarioCessor || documento.clienteNome || documento.emissor || 'Cliente / Operador Aéreo';

  // Template do E-mail
  const emailAssunto =
    idioma === 'EN'
      ? `[TECHNICAL DOCUMENTATION VERIFICATION] Current Revision Status Request — ${documento.codigo} — ${clienteNome}`
      : `[CONTROLE DE DOCUMENTAÇÃO TÉCNICA] Confirmação de Revisão Vigente — ${documento.codigo} — ${clienteNome}`;

  const emailCorpo =
    idioma === 'EN'
      ? `Dear ${destinatarioNome || 'Technical Records & Quality Team'},

Greetings from Quality Assurance & Controlled Library at Impacto Aviation MRO.

Under our continuing airworthiness compliance requirements (RBAC 145 / FAA 14 CFR Part 145), we are performing our periodic controlled documentation audit for manuals supplied for your aircraft maintenance support.

According to our controlled library records, we currently maintain:
• Publication Code: ${documento.codigo}
• Title: ${documento.titulo}
• Current Controlled Revision in Our System: ${revisaoAtual}
• Customer / Operator: ${clienteNome}

To guarantee that all current and upcoming maintenance interventions are strictly performed according to your latest authorized technical standards, we kindly request:
1. Formal confirmation whether revision "${revisaoAtual}" remains current and authorized, OR
2. Provision of the latest approved revision number, effective date, and transmittal letter / list of effective pages (LEP).

Requested Response Window: within ${prazoDias} business days.

Thank you for your partnership and dedication to airworthiness excellence.

Sincerely,

Technical Records & Quality Assurance Department
Impacto Aviation MRO
QualiGest SGQ Aeronáutico
`
      : `Prezado(a) ${destinatarioNome || 'Setor de Engenharia & Registros Técnicos'},

Saudações da equipe de Garantia da Qualidade e Biblioteca Técnica da Impacto Aviation MRO.

Em conformidade com as diretrizes do RBAC 145.109 e com os padrões de aeronavegabilidade continuada, realizamos a verificação periódica das publicações técnicas e manuais fornecidos pelo cliente/operador aéreo.

Consta atualmente em nosso acervo controlado a seguinte versão:
• Publicação / Manual: ${documento.codigo}
• Título: ${documento.titulo}
• Revisão Atualmente Controlada no QualiGest: ${revisaoAtual}
• Cliente / Operador: ${clienteNome}

Para assegurar que todas as intervenções de manutenção sejam executadas em estrita aderência aos manuais técnicos mais recentes e aplicáveis, solicitamos gentilmente:
1. A confirmação de que a revisão "${revisaoAtual}" permanece vigente e aplicável à sua frota, OU
2. A disponibilização da revisão mais recente aprovada, acompanhada da data de vigência e lista de páginas efetivas (LEP).

Prazo solicitado para retorno: ${prazoDias} dias úteis.

Agradecemos antecipadamente pela parceria e dedicação à segurança de voo.

Atenciosamente,

Setor de Controle Documental e Garantia da Qualidade
Impacto Aviation MRO
QualiGest SGQ — Sistema de Gestão da Qualidade Aeronáutica
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`Assunto: ${emailAssunto}\n\n${emailCorpo}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleMailto = () => {
    const url = `mailto:${encodeURIComponent(destinatarioEmail)}?subject=${encodeURIComponent(
      emailAssunto
    )}&body=${encodeURIComponent(emailCorpo)}`;
    window.open(url, '_blank');
  };

  const handleConfirmarEnvio = async () => {
    try {
      setIsSubmitting(true);
      const protocolo = `REQ-CLI-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await onConfirmSend(documento.id, {
        email: destinatarioEmail,
        assunto: emailAssunto,
        corpo: emailCorpo,
        protocolo,
      });
      setFeedback(`Solicitação registrada com sucesso sob protocolo ${protocolo}!`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      alert(`Erro ao registrar notificação: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 text-white">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Notificação Automatizada ao Cliente</h3>
              <p className="text-xs text-slate-400">
                Solicitação formal de confirmação de vigência para o manual {documento.codigo}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {feedback && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{feedback}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Idioma da Notificação:</label>
            <div className="flex rounded-lg overflow-hidden border border-slate-700 bg-slate-950 p-0.5">
              <button
                type="button"
                onClick={() => setIdioma('EN')}
                className={`flex-1 py-1 text-xs font-bold rounded ${
                  idioma === 'EN' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                EN (Inglês)
              </button>
              <button
                type="button"
                onClick={() => setIdioma('PT')}
                className={`flex-1 py-1 text-xs font-bold rounded ${
                  idioma === 'PT' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                PT (Português)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">E-mail do Cliente / Ponto Focal:</label>
            <input
              type="email"
              value={destinatarioEmail}
              onChange={(e) => setDestinatarioEmail(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Prazo para Resposta:</label>
            <select
              value={prazoDias}
              onChange={(e) => setPrazoDias(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value={3}>3 dias úteis (Urgente)</option>
              <option value={5}>5 dias úteis (Padrão SGQ)</option>
              <option value={10}>10 dias úteis</option>
            </select>
          </div>
        </div>

        {/* Prévia do E-mail */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">Prévia do E-mail Formal:</span>
            <span className="text-[11px] text-sky-400 font-mono">Assunto: {emailAssunto.slice(0, 45)}...</span>
          </div>
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 max-h-52 overflow-y-auto whitespace-pre-wrap leading-relaxed">
            {emailCorpo}
          </div>
        </div>

        {/* Ações */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>
            <button
              type="button"
              onClick={handleMailto}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              title="Abrir no Outlook / Gmail"
            >
              <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
              <span>Abrir no E-mail (mailto)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmarEnvio}
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Registrando...' : 'Registrar Notificação no SGQ'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// ============================================================================
// 2. MODAL DE AVISO / PORTAL DO FABRICANTE COM CREDENCIAIS RESTRITAS
// ============================================================================

interface ManufacturerAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  documento: DocumentoControlado | null;
  onConfirmVerification: (docId: string, novaData: string) => Promise<void>;
}

export const ManufacturerAlertModal: React.FC<ManufacturerAlertModalProps> = ({
  isOpen,
  onClose,
  documento,
  onConfirmVerification,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [portalUrl, setPortalUrl] = useState('');
  const [instrucoes, setInstrucoes] = useState('');

  React.useEffect(() => {
    if (documento) {
      setPortalUrl(documento.portalFabricanteUrl || documento.urlFonteVerificacao || 'https://myboeingfleet.boeing.com');
      setInstrucoes(
        documento.portalFabricanteInstrucoes ||
          'Acesso via portal corporativo do fabricante aeronáutico (OEM) com credenciais autorizadas de operador/oficina homologada.'
      );
    }
  }, [documento]);

  if (!isOpen || !documento) return null;

  const fabricanteNome = documento.fabricanteNome || documento.proprietarioCessor || documento.emissor || 'Fabricante (OEM)';

  const handleOpenPortal = () => {
    if (portalUrl) {
      window.open(portalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleConfirmarChecagem = async () => {
    try {
      setIsSubmitting(true);
      const agoraIso = new Date().toISOString();
      await onConfirmVerification(documento.id, agoraIso);
      onClose();
    } catch (err: any) {
      alert(`Erro ao registrar verificação: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 text-white">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Portal do Fabricante (OEM Restrito)</h3>
              <p className="text-xs text-slate-400">
                Checagem manual de vigência para publicações técnicas com login restrito
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informações da Publicação */}
        <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Publicação / Código:</span>
            <span className="font-mono font-bold text-sky-400">{documento.codigo}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Título Oficial:</span>
            <span className="font-semibold text-slate-200">{documento.titulo}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Fabricante (OEM):</span>
            <span className="font-bold text-purple-300">{fabricanteNome}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Revisão Controlada em Uso:</span>
            <span className="font-mono font-bold text-emerald-400">
              {documento.numeroRevisao || documento.revisaoVigenteNumero || 'Rev. 00'}
            </span>
          </div>
        </div>

        {/* Instruções de Credencial */}
        <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-purple-300 font-bold">
            <Key className="w-4 h-4 text-purple-400" />
            <span>Instruções de Acesso & Credenciais:</span>
          </div>
          <p className="text-slate-300 leading-relaxed">{instrucoes}</p>
          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono">URL: {portalUrl}</span>
            <button
              type="button"
              onClick={handleOpenPortal}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Acessar Portal OEM</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Ações */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleConfirmarChecagem}
            disabled={isSubmitting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Salvando...' : 'Confirmar Verificação no Portal Realizada'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};


// ============================================================================
// 3. MODAL DE CONFIGURAÇÃO DE FONTE & MODO DE VERIFICAÇÃO (AUTOMÁTICO VS MANUAL)
// ============================================================================

interface ConfigureSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  documento: DocumentoControlado | null;
  onSave: (docId: string, updates: Partial<DocumentoControlado>) => Promise<void>;
}

export const ConfigureSourceModal: React.FC<ConfigureSourceModalProps> = ({
  isOpen,
  onClose,
  documento,
  onSave,
}) => {
  const [tipoVerificacao, setTipoVerificacao] = useState<'AUTOMATICO' | 'MANUAL'>('MANUAL');
  const [urlFonte, setUrlFonte] = useState('');
  const [contatoEmail, setContatoEmail] = useState('');
  const [contatoNome, setContatoNome] = useState('');
  const [portalOemUrl, setPortalOemUrl] = useState('');
  const [instrucoesOem, setInstrucoesOem] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (documento) {
      setTipoVerificacao(documento.tipoVerificacao || 'MANUAL');
      setUrlFonte(documento.urlFonteVerificacao || '');
      setContatoEmail(documento.contatoClienteEmail || '');
      setContatoNome(documento.contatoClienteNome || '');
      setPortalOemUrl(documento.portalFabricanteUrl || '');
      setInstrucoesOem(documento.portalFabricanteInstrucoes || '');
    }
  }, [documento]);

  if (!isOpen || !documento) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await onSave(documento.id, {
        tipoVerificacao,
        urlFonteVerificacao: urlFonte.trim(),
        contatoClienteEmail: contatoEmail.trim(),
        contatoClienteNome: contatoNome.trim(),
        portalFabricanteUrl: portalOemUrl.trim(),
        portalFabricanteInstrucoes: instrucoesOem.trim(),
      });
      onClose();
    } catch (err: any) {
      alert(`Erro ao salvar configuração: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 text-white">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Configurar Automação & Fonte</h3>
              <p className="text-xs text-slate-400">{documento.codigo} — {documento.titulo}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Status de Automação (AUTOMÁTICO vs MANUAL) */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Classificação do Método de Verificação:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoVerificacao('AUTOMATICO')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  tipoVerificacao === 'AUTOMATICO'
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-blue-400">
                  <Bot className="w-4 h-4" />
                  <span>AUTOMÁTICO</span>
                </div>
                <span className="text-[11px] text-slate-300">
                  Scraping / Consulta direta a sites públicos (ANAC, FAA, DOU)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTipoVerificacao('MANUAL')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  tipoVerificacao === 'MANUAL'
                    ? 'bg-amber-600/20 border-amber-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <UserCheck className="w-4 h-4" />
                  <span>MANUAL</span>
                </div>
                <span className="text-[11px] text-slate-300">
                  Depende de ação humana, portal do cliente ou credencial de fabricante
                </span>
              </button>
            </div>
          </div>

          {/* Mapeamento de Fonte (URL) */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              URL / Localizador de Verificação:
            </label>
            <input
              type="url"
              value={urlFonte}
              onChange={(e) => setUrlFonte(e.target.value)}
              placeholder="https://www.anac.gov.br/... ou https://fornecedores..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Se for MANUAL, campos de cliente e OEM */}
          {tipoVerificacao === 'MANUAL' && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>Tratativas para Verificação Manual</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Ponto Focal do Cliente (Nome):</label>
                  <input
                    type="text"
                    value={contatoNome}
                    onChange={(e) => setContatoNome(e.target.value)}
                    placeholder="Ex: Carlos (Engenharia)"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">E-mail para Solicitações:</label>
                  <input
                    type="email"
                    value={contatoEmail}
                    onChange={(e) => setContatoEmail(e.target.value)}
                    placeholder="techrecords@cliente.com"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Portal / Instruções do Fabricante (OEM):</label>
                <input
                  type="text"
                  value={instrucoesOem}
                  onChange={(e) => setInstrucoesOem(e.target.value)}
                  placeholder="Ex: Acesso via MyBoeingFleet com 2FA corporativo"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                />
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Configuração'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
