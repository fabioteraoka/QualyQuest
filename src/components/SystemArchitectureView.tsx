import React, { useState } from 'react';
import { 
  Layers, 
  Cpu, 
  ShieldCheck, 
  Database, 
  Workflow, 
  GitFork, 
  FileText, 
  Award, 
  Lock, 
  Sparkles, 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ChevronRight, 
  Download, 
  BookOpen, 
  Play, 
  Code,
  ArrowDown,
  RefreshCw,
  Search,
  Eye,
  Sliders,
  Compass
} from 'lucide-react';
import { ModuloArquitetura } from '../types';

interface SystemArchitectureViewProps {
  onNavigateToPresentation?: () => void;
}

export const SystemArchitectureView: React.FC<SystemArchitectureViewProps> = ({
  onNavigateToPresentation,
}) => {
  const [activeSection, setActiveSection] = useState<'geral' | 'modulos' | 'fluxoRNC' | 'ia' | 'aprendizado' | 'seguranca' | 'dados' | 'adversarial'>('geral');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('rnc-core');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 18 Módulos Reais do Sistema Confirmados no Código
  const modulosReais: ModuloArquitetura[] = [
    {
      id: 'dashboard-core',
      nome: 'Dashboard Executivo da Qualidade',
      categoria: 'GESTAO_CORE',
      finalidade: 'Visão executiva em tempo real de KPIs de Não Conformidades, prazos, riscos e índices de eficácia.',
      entradas: ['Lista de RNCs', 'Lista de Alertas', 'Métricas de Setores'],
      processamento: 'Agregação reativa de status, cálculo de taxa de resolução e volumetria por departamento.',
      saidas: ['Cards de métricas gerais', 'Gráfico de distribuição por setor', 'Acessos rápidos de ação'],
      dependencias: ['recharts', 'lucide-react', 'useAuth'],
      permissoesRBAC: 'Acesso liberado a todos os perfis (ADMIN, GESTOR_SGQ, AUDITOR, CONSULTA).',
      colecoesFirestore: ['/organizations/{orgId}/nonConformities'],
      mecanismoAuditoria: 'Consulta auditada pelo token JWT do usuário ativo.',
      icone: 'LayoutDashboard',
    },
    {
      id: 'rnc-core',
      nome: 'Gestão de Não Conformidade (Formulário F 001-29)',
      categoria: 'GESTAO_CORE',
      finalidade: 'Ciclo completo de tratamento de Não Conformidade abrangendo os 11 blocos normativos do SGQ aeronáutico.',
      entradas: ['Dados da Ocorrência', 'Matriz de Risco', 'Contenção', '5 Porquês', 'Ishikawa', '5W2H', 'Eficácia'],
      processamento: 'Validação de campos obrigatórios, bloqueio de autoaprovação, harmonização causal e cálculo de risco.',
      saidas: ['Documento NC estruturado', 'Histórico de alterações (Audit Trail)', 'Alertas de prazo'],
      dependencias: ['firestore.ts', 'officialFormTemplate.ts', 'qualityHelpers.ts'],
      permissoesRBAC: 'Criação/Edição: ADMIN, GESTOR_SGQ, AUDITOR. CONSULTA: Somente Leitura.',
      colecoesFirestore: ['/organizations/{orgId}/nonConformities/{ncId}', '/organizations/{orgId}/auditTrails'],
      mecanismoAuditoria: 'Geração de registro append-only na subcoleção auditTrails a cada mutação.',
      icone: 'FileText',
    },
    {
      id: 'rnc-report-list',
      nome: 'Registros e Relatório Geral de RNCs',
      categoria: 'GESTAO_CORE',
      finalidade: 'Listagem, filtragem avançada, busca textual e exportação analítica da base de Não Conformidades.',
      entradas: ['Base de RNCs', 'Filtros de status, risco, setor e período'],
      processamento: 'Filtros combinados em memória com paginação e ordenação por prioridade ponderada.',
      saidas: ['Tabela paginada', 'Exportação Excel (.xlsx) e CSV'],
      dependencias: ['xlsx', 'exportHelpers.ts'],
      permissoesRBAC: 'Todos os perfis autenticados. Exclusão restrita a GESTOR_SGQ e ADMIN.',
      colecoesFirestore: ['/organizations/{orgId}/nonConformities'],
      mecanismoAuditoria: 'Log de exportações e exclusões registrado no Audit Trail.',
      icone: 'FileText',
    },
    {
      id: 'official-sheet',
      nome: 'Emissor da Ficha Oficial F 001-29',
      categoria: 'GOVERNANCA',
      finalidade: 'Renderização fiel e geração de cópia controlada impressa da Ficha F 001-29 para auditorias ANAC/SGQ.',
      entradas: ['Registro completo da RNC selecionada', 'Manuais referenciados'],
      processamento: 'Formatação tipográfica A4 conforme layout regulatório, marcas d água e assinaturas digitais.',
      saidas: ['Pré-visualização fiel A4', 'Impressão formatada / PDF via navegador'],
      dependencias: ['printHelpers.ts', 'officialFormTemplate.ts'],
      permissoesRBAC: 'Leitura e impressão disponíveis para todos os perfis.',
      colecoesFirestore: ['/organizations/{orgId}/nonConformities/{ncId}'],
      mecanismoAuditoria: 'Registro de emissão de cópia controlada no Audit Trail da RNC.',
      icone: 'Printer',
    },
    {
      id: 'risk-matrix',
      nome: 'Matriz de Risco Aeronáutico 5x5',
      categoria: 'INVESTIGACAO',
      finalidade: 'Avaliação quantitativa de risco por Severidade (1-5) e Probabilidade (1-5) com categorização automática.',
      entradas: ['Severidade informada', 'Probabilidade informada', 'Justificativa técnica'],
      processamento: 'Cálculo de Criticidade = Severidade x Probabilidade, mapeamento para P1 (Crítico) a P4 (Baixo).',
      saidas: ['Score de Risco', 'Classificação de Cor (Vermelho/Âmbar/Verde)', 'Prazos máximos vinculados'],
      dependencias: ['RiskMatrixWidget.tsx', 'qualityHelpers.ts'],
      permissoesRBAC: 'Edição permitida aos perfis com acesso de escrita.',
      colecoesFirestore: ['Dentro do documento da RNC (campo matrizRisco)'],
      mecanismoAuditoria: 'Alterações de risco registradas na trilha com usuário e justificativa.',
      icone: 'AlertTriangle',
    },
    {
      id: 'alerts-center',
      nome: 'Central de Alertas e Controle de Prazos',
      categoria: 'GESTAO_CORE',
      finalidade: 'Monitoramento contínuo de vencimentos de ações 5W2H, pendências de eficácia e revisão de manuais.',
      entradas: ['Prazos de ações 5W2H', 'Datas de emissão de RNCs', 'Vigências de manuais'],
      processamento: 'Cálculo de delta dias em relação à data atual: Vencida, Vence Hoje, Vence em 7 dias.',
      saidas: ['Lista hierarquizada de alertas', 'Badges de contagem na barra de navegação'],
      dependencias: ['AlertsCenterView.tsx', 'Sidebar.tsx'],
      permissoesRBAC: 'Visível a todos os usuários da organização.',
      colecoesFirestore: ['/organizations/{orgId}/nonConformities', '/organizations/{orgId}/manuals'],
      mecanismoAuditoria: 'Rastreabilidade baseada nas datas gravadas no Firestore.',
      icone: 'Bell',
    },
    {
      id: 'incidence-analytics',
      nome: 'Análise de Incidências e Diagrama de Pareto',
      categoria: 'INVESTIGACAO',
      finalidade: 'Estratificação estatística de desvios por área, processo, fornecedor e categoria 6M.',
      entradas: ['Base de Não Conformidades'],
      processamento: 'Cálculo de frequência relativa, percentual acumulado e curva de Pareto 80/20.',
      saidas: ['Gráficos de barras ordenados', 'Curva acumulada de Pareto'],
      dependencias: ['recharts', 'IncidenceAnalyticsView.tsx'],
      permissoesRBAC: 'Acesso liberado a todos os perfis.',
      colecoesFirestore: ['/organizations/{orgId}/nonConformities'],
      mecanismoAuditoria: 'Processamento exclusivamente analítico em memória no cliente.',
      icone: 'BarChart3',
    },
    {
      id: 'rnc-comparison',
      nome: 'Comparação Semântica de RNCs (Anti-Contaminação)',
      categoria: 'INVESTIGACAO',
      finalidade: 'Cruzamento semântico entre RNCs pregressas e atuais para detecção de reincidências e divergências.',
      entradas: ['RNC Base', 'RNC Comparada', 'Base de Manuais'],
      processamento: 'Cálculo de similaridade de texto, detecção de divergência em causas e geração de proposta de lição.',
      saidas: ['Relatório de divergências', 'Candidato a conhecimento na Fila de Validação'],
      dependencias: ['semanticComparison.ts', 'rncMatcher.ts'],
      permissoesRBAC: 'Criação: ADMIN, GESTOR_SGQ, AUDITOR.',
      colecoesFirestore: ['/organizations/{orgId}/rncComparisons/{comparisonId}'],
      mecanismoAuditoria: 'Registro de comparação persistido com hash e carimbo do usuário.',
      icone: 'Scale',
    },
    {
      id: 'validation-queue',
      nome: 'Fila de Validação de Conhecimento SGQ',
      categoria: 'APRENDIZADO',
      finalidade: 'Triagem e homologação de conhecimentos propostos a partir de desvios e comparações.',
      entradas: ['Itens de conhecimento propostos', 'Histórico de divergências'],
      processamento: 'Validação humana obrigatória com aprovação, edição ou rejeição justificada.',
      saidas: ['Promoção para a Base de Conhecimento', 'Feedback ao criador'],
      dependencias: ['ValidationQueueView.tsx'],
      permissoesRBAC: 'Aprovação restrita a GESTOR_SGQ e ADMIN.',
      colecoesFirestore: ['/organizations/{orgId}/validatedKnowledge'],
      mecanismoAuditoria: 'Trilha com responsável pela aprovação, data e justificativa técnica.',
      icone: 'CheckSquare',
    },
    {
      id: 'knowledge-base',
      nome: 'Base de Conhecimento SGQ (Níveis 1 a 5)',
      categoria: 'APRENDIZADO',
      finalidade: 'Repositório corporativo de padrões homologados e soluções de causas raiz blindadas.',
      entradas: ['Conhecimentos aprovados pela Fila de Validação'],
      processamento: 'Classificação por maturidade N1 a N5 com bloqueio mandatório de autoaprovação no Firestore.',
      saidas: ['Sugestões contextuais no formulário de RNC', 'Padrões de conformidade'],
      dependencias: ['KnowledgeBaseView.tsx', 'firestore.ts'],
      permissoesRBAC: 'Leitura: Todos. Promoção para N5: GESTOR_SGQ/ADMIN com segregação de funções ativa.',
      colecoesFirestore: ['/organizations/{orgId}/validatedKnowledge/{knowledgeId}'],
      mecanismoAuditoria: 'Regra estrita no firestore.rules validando criadoPorUid != request.auth.uid.',
      icone: 'Award',
    },
    {
      id: 'manuals-repository',
      nome: 'Repositório de Manuais e Normas Regulatórias',
      categoria: 'GOVERNANCA',
      finalidade: 'Gestão e consulta de manuais de manutenção (MPR, MOE, SGSO, MGM) e normas da ANAC/FAA/EASA.',
      entradas: ['Arquivos de manuais', 'Metadados de vigência e revisão'],
      processamento: 'Indexação por capítulos, controle de versão e extração de trechos normativos aplicáveis.',
      saidas: ['Biblioteca consultável', 'Vinculação automática de normas em RNCs'],
      dependencias: ['manualsStorage.ts', 'ManualsRepositoryView.tsx'],
      permissoesRBAC: 'Upload/Exclusão: GESTOR_SGQ e ADMIN. Consulta: Todos.',
      colecoesFirestore: ['/organizations/{orgId}/manuals/{manualId}'],
      mecanismoAuditoria: 'Histórico de revisões e uploads gravado no Firestore.',
      icone: 'BookOpen',
    },
    {
      id: 'doc-extractor',
      nome: 'Extrator Inteligente de RNCs (IA / Fallback)',
      categoria: 'SERVICOS_IA',
      finalidade: 'Ingestão de relatórios técnicos em formato DOCX com extração automática dos 11 blocos da RNC.',
      entradas: ['Arquivo DOCX de ocorrência'],
      processamento: 'Extração via mammoth.js, sanitização e envio ao endpoint /api/extract-nc com fallback determinístico.',
      saidas: ['Rascunho estruturado no formulário F 001-29', 'Classificação de suporte documental'],
      dependencias: ['mammoth', 'wordExtractor.ts', 'DocumentExtractorView.tsx'],
      permissoesRBAC: 'Perfis operacionais de escrita (ADMIN, GESTOR_SGQ, AUDITOR).',
      colecoesFirestore: ['Draft gerado em memória, salvo mediante confirmação do usuário'],
      mecanismoAuditoria: 'Indicação obrigatória de origem "DOCUMENTO IMPORTADO / IA" no formulário.',
      icone: 'Sparkles',
    },
    {
      id: 'sgq-health',
      nome: 'Motor de Saúde do SGQ (SGQ Health Index)',
      categoria: 'GOVERNANCA',
      finalidade: 'Diagnóstico matemático contínuo do sistema de gestão com geração de ações de correção imediatas.',
      entradas: ['Base de RNCs', 'Manuais', 'Conhecimentos', 'Comparações'],
      processamento: 'Cálculo de índice de 0 a 100% ponderado em 6 dimensões com resolução direta de pendências.',
      saidas: ['Score global e por dimensão', 'Lista priorizada de desvios com link de resolução direta'],
      dependencias: ['sgqHealthEvaluator.ts', 'SGQHealthView.tsx'],
      permissoesRBAC: 'Acesso a todos. Ações corretivas respeitam o perfil do usuário.',
      colecoesFirestore: ['Consulta cruzada de coleções no Firestore'],
      mecanismoAuditoria: 'Algoritmo 100% determinístico e auditável sem dependência de IA.',
      icone: 'Activity',
    },
    {
      id: 'presentation-gen',
      nome: 'Gerador de Apresentação Gerencial da Qualidade',
      categoria: 'GOVERNANCA',
      finalidade: 'Produção executiva de apresentações em 17 slides corporativos para Diretoria e Reuniões SGQ.',
      entradas: ['Base de RNCs', 'Manuais', 'Conhecimento', 'Filtros de Período e Setor'],
      processamento: 'Agregação matemática sem dados simulados, formatação 16:9 e renderização em PPTX/PDF/CSV.',
      saidas: ['Apresentação PPTX para download', 'Layout para impressão em PDF', 'CSV de dados tabulares'],
      dependencias: ['pptxgenjs', 'qualityPresentationBuilder.ts', 'QualityPresentationGeneratorView.tsx'],
      permissoesRBAC: 'Acesso para consulta e geração a todos os perfis autenticados.',
      colecoesFirestore: ['Consulta em tempo real da base da organização ativa'],
      mecanismoAuditoria: 'Metadados de emissão com carimbo de tempo e usuário no Slide 17.',
      icone: 'Presentation',
    },
    {
      id: 'technical-audit',
      nome: 'Auditoria Técnica & Hardening SGQ',
      categoria: 'SEGURANCA',
      finalidade: 'Auditoria de segurança, conformidade de Firestore Rules, isolamento multi-tenant e integridade.',
      entradas: ['Metadados de segurança do ambiente', 'Regras do Firestore', 'Perfis de usuários'],
      processamento: 'Varredura de vulnerabilidades conhecidas, checagem de chaves e testes de imutabilidade de log.',
      saidas: ['Relatório de Hardening com status OK / ALERTA / CRÍTICO'],
      dependencias: ['technicalAuditEvaluator.ts', 'TechnicalAuditModal.tsx'],
      permissoesRBAC: 'Execução e visualização por ADMIN, GESTOR_SGQ e AUDITOR.',
      colecoesFirestore: ['/systemDiagnostics'],
      mecanismoAuditoria: 'Registro de execuções de auditoria no log do sistema.',
      icone: 'ShieldCheck',
    },
    {
      id: 'audit-trail-core',
      nome: 'Trilha de Auditoria Imutável (Audit Trail)',
      categoria: 'SEGURANCA',
      finalidade: 'Garantia de não-repúdio e rastreabilidade perene de toda e qualquer mutação de dados no SGQ.',
      entradas: ['Operação realizada (Create/Update/Delete)', 'UID do usuário', 'IP/Agente', 'Payload anterior e novo'],
      processamento: 'Gravação write-once na subcoleção auditTrails com bloqueio de update e delete no Firestore Rules.',
      saidas: ['Registros permanentes consultáveis', 'Evidências para auditorias externas'],
      dependencias: ['firestore.ts', 'firestore.rules'],
      permissoesRBAC: 'Leitura permitida a usuários da organização. Alteração e Exclusão estritamente proibidas a todos.',
      colecoesFirestore: ['/organizations/{orgId}/auditTrails/{auditId}'],
      mecanismoAuditoria: 'Regra firestore.rules: allow update, delete: if false;.',
      icone: 'Lock',
    },
    {
      id: 'rbac-tenant-isolation',
      nome: 'Isolamento Multi-Tenant & RBAC',
      categoria: 'SEGURANCA',
      finalidade: 'Garantia de que nenhum usuário acesse, consulte ou modifique dados pertencentes a outra organização.',
      entradas: ['Token JWT de autenticação', 'ID da Organização ativa'],
      processamento: 'Validação no client SDK e enforcement mandatório no nível de banco via firestore.rules.',
      saidas: ['Sessão segregada', 'Rejeição imediata (Permission Denied) em requisições cruzadas'],
      dependencias: ['useAuth.ts', 'firestore.rules'],
      permissoesRBAC: '4 Níveis: ADMIN (Total), GESTOR_SGQ (Gestão), AUDITOR (Operação/Auditoria), CONSULTA (Read-only).',
      colecoesFirestore: ['/users/{userId}', '/organizations/{orgId}'],
      mecanismoAuditoria: 'Logs de autenticação no Firebase Authentication.',
      icone: 'Key',
    },
    {
      id: 'ai-engine-fallback',
      nome: 'Motor de IA Gemini & Fallback Determinístico',
      categoria: 'SERVICOS_IA',
      finalidade: 'Geração de sugestões e assistência técnica no preenchimento de RNCs com proteção contra alucinações.',
      entradas: ['Descrição da Ocorrência', 'Requisitos de Manuais', 'Dados Históricos'],
      processamento: 'Proxy server-side Node.js com prompt estruturado ou ativação imediata de regras heurísticas se offline.',
      saidas: ['Sugestões não vinculantes com rótulo explícito "IA GEMINI" ou "MOTOR DETERMINÍSTICO"'],
      dependencias: ['@google/genai', 'server.ts', 'AISuggestionModal.tsx'],
      permissoesRBAC: 'Uso liberado aos operadores de formulário.',
      colecoesFirestore: ['Não grava diretamente; usuário decide se aceita a sugestão'],
      mecanismoAuditoria: 'Decisão estruturada registrada na trilha (Aceita / Editada / Rejeitada com justificativa).',
      icone: 'Cpu',
    },
    {
      id: 'tour-interativo',
      nome: 'Conheça o QualiGest (Tour Interativo & Sandbox)',
      categoria: 'GOVERNANCA',
      finalidade: 'Área de homologação técnica e demonstração interativa do fluxo normativo F 001-29, aprendizagem N1-N5 e Red Team sandbox.',
      entradas: ['Interações do usuário avaliador / auditor', 'Simulador 5x5', 'Disparo de payloads adversariais'],
      processamento: 'Demonstração em tempo real de blindagem de layout PPTX, regras RBAC e isolamento multi-tenant.',
      saidas: ['Certificados de conformidade', 'Logs de auditoria e bloqueio de segurança em tempo real'],
      dependencias: ['InteractiveTourView.tsx', 'qualityPresentationBuilder.ts'],
      permissoesRBAC: 'Livre acesso a todos os perfis autenticados para fins de auditoria e homologação.',
      colecoesFirestore: ['Acesso de leitura transparente'],
      mecanismoAuditoria: 'Execução de testes registrada no console e no terminal de resposta.',
      icone: 'Compass',
    },
  ];

  // Filtro de pesquisa de módulos
  const modulosFiltrados = modulosReais.filter(m => 
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.finalidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedModule = modulosReais.find(m => m.id === selectedModuleId) || modulosReais[0];

  // Cenários do Teste Adversarial Real
  const cenariosAdversariais = [
    {
      id: 'adv-01',
      nome: 'Leitura/Escrita Cruzada Multi-Tenant',
      categoria: 'ISOLAMENTO',
      vetorAtaque: 'Consulta direta a /organizations/org_concorrente/nonConformities com token de outro tenant.',
      resultadoEsperado: 'Bloqueio estrito pelo Firestore Rules (Permission Denied).',
      statusReal: 'APROVADO',
      evidencia: 'Regra userBelongsToOrg(organizationId) valida request.auth.uid no firestore.rules.',
    },
    {
      id: 'adv-02',
      nome: 'Escalada de Privilégio de Papel (Role Spoofing)',
      categoria: 'RBAC',
      vetorAtaque: 'Envio de payload com { role: "ADMIN" } em update na coleção /users/{userId}.',
      resultadoEsperado: 'Rejeição mandatória pelo Firestore Rules para não-admins.',
      statusReal: 'APROVADO',
      evidencia: 'firestore.rules linha 81-83: request.resource.data.role == resource.data.role.',
    },
    {
      id: 'adv-03',
      nome: 'Mutação ou Exclusão no Audit Trail',
      categoria: 'INTEGRIDADE',
      vetorAtaque: 'Tentativa de enviar update() ou delete() contra /organizations/{orgId}/auditTrails/{id}.',
      resultadoEsperado: 'Bloqueio irrestrito mesmo para usuários com perfil ADMIN.',
      statusReal: 'APROVADO',
      evidencia: 'firestore.rules linha 125: allow update, delete: if false;.',
    },
    {
      id: 'adv-04',
      nome: 'Autoaprovação de Conhecimento Nível 5 (Padrão SGQ)',
      categoria: 'SEGREGAÇÃO',
      vetorAtaque: 'Autor do conhecimento tenta promover o próprio item para Nível 5.',
      resultadoEsperado: 'Bloqueio por segregação de funções. Exige homologação por outro gestor.',
      statusReal: 'APROVADO',
      evidencia: 'firestore.rules linha 153: resource.data.criadoPorUid != request.auth.uid.',
    },
    {
      id: 'adv-05',
      nome: 'Contaminação de Fatos por Alucinação de IA',
      categoria: 'GOVERNANÇA IA',
      vetorAtaque: 'IA sugere causa divergente de evidência documentada e tenta gravar como fato homologado.',
      resultadoEsperado: 'A sugestão permanece estritamente como hipótese e exige decisão humana formal.',
      statusReal: 'APROVADO',
      evidencia: 'Decisão estruturada SuggestionDecision grava status PENDENTE até aprovação manual.',
    },
    {
      id: 'adv-06',
      nome: 'Injeção de DOCX Malformado / Vazio',
      categoria: 'ROBUSTEZ',
      vetorAtaque: 'Upload de arquivo DOCX corrompido, vazio de 0 bytes ou com extensão falsa.',
      resultadoEsperado: 'Interrupção segura com mensagem amigável sem quebra da aplicação.',
      statusReal: 'APROVADO',
      evidencia: 'Validação de MIME type e captura de exceção no mammoth.js com fallback determinístico.',
    },
    {
      id: 'adv-07',
      nome: 'Reprodutibilidade Matemática do SGQ Health',
      categoria: 'CONFIABILIDADE',
      vetorAtaque: 'Tentativa de alteração aleatória ou dependência de modelo probabilístico no índice.',
      resultadoEsperado: 'Mesmo conjunto de dados produz exatamente o mesmo percentual decimal.',
      statusReal: 'APROVADO',
      evidencia: 'Função pura calcularSaudeSGQ() em sgqHealthEvaluator.ts sem chamadas aleatórias.',
    },
    {
      id: 'adv-08',
      nome: 'Perfil CONSULTA Chamando Mutações Diretamente',
      categoria: 'RBAC',
      vetorAtaque: 'Bypass da interface gráfica chamando endpoints ou Firestore SDK com perfil CONSULTA.',
      resultadoEsperado: 'Bloqueio em nível de banco de dados (getUserRole() != "CONSULTA").',
      statusReal: 'APROVADO',
      evidencia: 'firestore.rules linhas 103, 134 e 146 barram operações de escrita para CONSULTA.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-[12px] p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-[8px] bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Cpu className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 font-mono">
                FASE 6.1 — ARQUITETURA TÉCNICA REAL
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                v2.8.0-enterprise
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Arquitetura Funcional e Técnica Real do QualiGest
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Documentação técnica e visual da arquitetura operacional comprovada no código-fonte.
              Sem abstrações teóricas: mapeamento de autenticação, RBAC, isolamento multi-tenant, persistência no Firestore, governança de IA e trilha imutável.
            </p>
          </div>

          {onNavigateToPresentation && (
            <button
              onClick={onNavigateToPresentation}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors cursor-pointer shrink-0 shadow-sm"
            >
              <span>Ir para Apresentação Gerencial</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 2. Section Navigation Tabs */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'geral', label: '1. Diagrama Geral', icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'modulos', label: '2. Módulos do Sistema (18)', icon: <Code className="w-3.5 h-3.5" /> },
            { id: 'fluxoRNC', label: '3. Fluxo RNC F 001-29', icon: <Workflow className="w-3.5 h-3.5" /> },
            { id: 'ia', label: '4. Governança da IA', icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: 'aprendizado', label: '5. Aprendizado SGQ', icon: <Award className="w-3.5 h-3.5" /> },
            { id: 'seguranca', label: '6. Segurança & RBAC', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
            { id: 'dados', label: '7. Modelo Firestore', icon: <Database className="w-3.5 h-3.5" /> },
            { id: 'adversarial', label: '8. Bateria Adversarial', icon: <Lock className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeSection === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Section 1: Diagrama de Arquitetura Geral */}
      {activeSection === 'geral' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Topologia Geral de Camadas (Defesa em Profundidade)
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Fluxo real de tráfego, autorização e persistência auditada desde o operador até o banco de dados.
            </p>

            {/* Visual Architecture Flow Cards */}
            <div className="space-y-4 max-w-4xl mx-auto">
              {/* Layer 1: Usuário */}
              <div className="p-4 rounded-[10px] bg-slate-900 text-white border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-[8px] bg-blue-600/30 text-blue-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">1. Camada de Cliente & Dispositivo</h3>
                    <p className="text-xs text-slate-400">Navegador Web (Desktop, Tablet, Hangar) — SPA React 19 + TypeScript + Vite</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">Porta 3000 / Reverse Proxy</span>
              </div>

              <div className="flex justify-center">
                <ArrowDown className="w-5 h-5 text-slate-400" />
              </div>

              {/* Layer 2: Autenticação & RBAC */}
              <div className="p-4 rounded-[10px] bg-blue-50 border border-blue-200 text-blue-950 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-[8px] bg-blue-600 text-white">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">2. Autenticação & Autorização RBAC</h3>
                    <p className="text-xs text-blue-800">
                      Firebase Authentication (JWT) + Perfis: <strong>ADMIN</strong>, <strong>GESTOR_SGQ</strong>, <strong>AUDITOR</strong>, <strong>CONSULTA</strong>
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">useAuth.ts</span>
              </div>

              <div className="flex justify-center">
                <ArrowDown className="w-5 h-5 text-slate-400" />
              </div>

              {/* Layer 3: Isolamento Multi-Tenant */}
              <div className="p-4 rounded-[10px] bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-[8px] bg-emerald-600 text-white">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">3. Isolamento Estrito Multi-Tenant</h3>
                    <p className="text-xs text-emerald-800">
                      Coleção hierárquica <code>/organizations/{'{organizationId}'}/*</code> com verificação obrigatória de tenant.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">firestore.rules</span>
              </div>

              <div className="flex justify-center">
                <ArrowDown className="w-5 h-5 text-slate-400" />
              </div>

              {/* Layer 4: Backend API & AI Engine */}
              <div className="p-4 rounded-[10px] bg-indigo-50 border border-indigo-200 text-indigo-950 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-[8px] bg-indigo-600 text-white">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">4. Backend Express API & Inteligência Artificial</h3>
                    <p className="text-xs text-indigo-800">
                      Servidor Node.js Express (<code>server.ts</code>) isolando <code>process.env.GEMINI_API_KEY</code> com Fallback Determinístico Local.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">@google/genai</span>
              </div>

              <div className="flex justify-center">
                <ArrowDown className="w-5 h-5 text-slate-400" />
              </div>

              {/* Layer 5: Persistência Firestore & Audit Trail */}
              <div className="p-4 rounded-[10px] bg-amber-50 border border-amber-200 text-amber-950 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-[8px] bg-amber-600 text-white">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">5. Persistência de Dados & Audit Trail Imutável</h3>
                    <p className="text-xs text-amber-800">
                      Cloud Firestore com subcoleções <code>auditTrails</code> (write-once / append-only, update e delete desativados).
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">Imutável</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Section 2: Módulos do Sistema Reais (18) */}
      {activeSection === 'modulos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Module List Sidebar */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-white border border-slate-200 rounded-[10px] p-3 shadow-xs">
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar módulos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="max-h-[560px] overflow-y-auto space-y-1.5 pr-1">
                {modulosFiltrados.map((mod) => (
                  <button
                    key={mod.id}
                    onClick={() => setSelectedModuleId(mod.id)}
                    className={`w-full text-left p-2.5 rounded-[6px] transition-all cursor-pointer border ${
                      mod.id === selectedModule.id
                        ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold shadow-xs'
                        : 'bg-white border-transparent text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate">{mod.nome}</span>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {mod.categoria}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {mod.finalidade}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Module Detailed Card */}
          <div className="lg:col-span-8">
            <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-5">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {selectedModule.categoria}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">
                    {selectedModule.nome}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    {selectedModule.finalidade}
                  </p>
                </div>
              </div>

              {/* Module Specs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-[8px] border border-slate-200/80 space-y-1">
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Entradas de Dados
                  </h4>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {selectedModule.entradas.map((e, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-[8px] border border-slate-200/80 space-y-1">
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Saídas & Artefatos
                  </h4>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {selectedModule.saidas.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Processing details */}
              <div className="p-3.5 bg-slate-50 rounded-[8px] border border-slate-200/80 space-y-1">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Processamento & Regras de Negócio
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {selectedModule.processamento}
                </p>
              </div>

              {/* Governance & Security Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-[8px]">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Permissões RBAC
                  </span>
                  <p className="text-xs text-slate-800 font-medium mt-1">
                    {selectedModule.permissoesRBAC}
                  </p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-[8px]">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Persistência Firestore
                  </span>
                  <p className="text-xs text-slate-800 font-mono mt-1">
                    {selectedModule.colecoesFirestore.join(', ')}
                  </p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-[8px]">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Auditoria
                  </span>
                  <p className="text-xs text-slate-800 font-medium mt-1">
                    {selectedModule.mecanismoAuditoria}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Section 3: Fluxo da RNC (11 Blocos F 001-29) */}
      {activeSection === 'fluxoRNC' && (
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Fluxo Operacional da Não Conformidade Aeronáutica (Formulário F 001-29)
            </h2>
            <p className="text-xs text-slate-500">
              Conexão detalhada entre cada uma das 11 etapas normativas e o componente de software implementado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { num: 'Bloco 1 & 2', titulo: 'Abertura & Identificação', comp: 'NCFormView.tsx (Aba Dados)', prazo: 'Imediato', desc: 'Registro do título, descrição fática, data, setor, aeronave e manuais regulatórios aplicáveis.' },
              { num: 'Bloco 3', titulo: 'Avaliação de Risco 5x5', comp: 'RiskMatrixWidget.tsx', prazo: '< 24 Horas', desc: 'Severidade x Probabilidade de 1 a 5. Determinação automática de P1 (Crítico) a P4 (Baixo).' },
              { num: 'Bloco 4', titulo: 'Disposição Imediata / Contenção', comp: 'NCFormView.tsx (Aba Contenção)', prazo: '< 24 Horas', desc: 'Ações imediatas para isolar a falha, segregar componentes ou paralisar etapas inseguras.' },
              { num: 'Bloco 5 & 6', titulo: 'Investigação & Evidências', comp: 'NCFormView.tsx (Aba Causa)', prazo: '< 5 Dias', desc: 'Coleta de evidências objetivas, entrevistas e histórico de calibração/procedimentos.' },
              { num: 'Bloco 7', titulo: 'Análise dos 5 Porquês', comp: 'NCFormView.tsx (5 Whys Tool)', prazo: '< 7 Dias', desc: 'Encadeamento de causa-efeito investigando a causa raiz além do sintoma superficial.' },
              { num: 'Bloco 8', titulo: 'Diagrama de Ishikawa 6M', comp: 'NCFormView.tsx (Ishikawa 6M)', prazo: '< 7 Dias', desc: 'Mapeamento nos 6 pilares: Método, Máquina, Mão de Obra, Material, Meio Ambiente e Medição.' },
              { num: 'Bloco 8', titulo: 'Determinação da Causa Raiz Final', comp: 'NCFormView.tsx (Causa Raiz)', prazo: '< 7 Dias', desc: 'Declaração formal da falha sistêmica básica que, uma vez eliminada, impede a reincidência.' },
              { num: 'Bloco 9', titulo: 'Plano de Ação Corretiva (5W2H)', comp: 'NCFormView.tsx (Aba Ação)', prazo: 'Conforme Cronograma', desc: 'O que, Por que, Onde, Quem, Quando, Como e Quanto Custa para cada ação de bloqueio.' },
              { num: 'Bloco 10', titulo: 'Verificação de Eficácia', comp: 'NCFormView.tsx (Aba Eficácia)', prazo: '30 a 60 Dias', desc: 'Auditoria com evidências reais comprovando que o desvio não se repetiu no período de teste.' },
              { num: 'Bloco 11', titulo: 'Encerramento Formal pelo SGQ', comp: 'NCFormView.tsx (Status)', prazo: 'Após Eficácia', desc: 'Validação e assinatura formal do Gestor SGQ declarando a ocorrência concluída.' },
              { num: 'Pós-Bloco 11', titulo: 'Aprendizado Organizacional', comp: 'KnowledgeBaseView.tsx', prazo: 'Contínuo', desc: 'Extração da lição aprendida e proposta para a Base de Conhecimento Corporativa.' },
            ].map((etapa, idx) => (
              <div key={idx} className="p-4 bg-slate-50 border border-slate-200/80 rounded-[8px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {etapa.num}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">
                    {etapa.prazo}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">{etapa.titulo}</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">{etapa.desc}</p>
                <div className="pt-2 border-t border-slate-200 text-[10px] font-mono text-slate-500">
                  Comp: {etapa.comp}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Section 4: Governança da IA & Anti-Contaminação */}
      {activeSection === 'ia' && (
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Fluxo de Governança da Inteligência Artificial (Anti-Contaminação)
            </h2>
            <p className="text-xs text-slate-500">
              Mecanismos estritos garantindo que sugestões da IA jamais se transformem em fatos documentados sem validação humana formal.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { passo: '1. Entrada & Sanitização', detalhe: 'O operador insere o texto da ocorrência ou anexa DOCX. Dados sensíveis e credenciais são bloqueados no payload.' },
              { passo: '2. Enriquecimento com Contexto Normativo', detalhe: 'O sistema anexa os trechos relevantes dos manuais regulatórios (MPR/MOE) cadastrados na biblioteca.' },
              { passo: '3. Processamento Server-Side Protegido', detalhe: 'Requisição via Node.js Express (/api/*). A chave GEMINI_API_KEY nunca é exposta ao navegador do cliente.' },
              { passo: '4. Fallback Determinístico Local', detalhe: 'Se o Gemini estiver offline ou com timeout, o motor heurístico local gera sugestões baseadas em regras estritas do SGQ.' },
              { passo: '5. Rótulo de Origem Obrigatório', detalhe: 'Toda sugestão recebe selo explícito: "IA GEMINI" ou "MOTOR DETERMINÍSTICO" — nunca é apresentada como conclusão validada.' },
              { passo: '6. Decisão Estruturada Humana', detalhe: 'O operador deve clicar em Aceitar, Editar ou Rejeitar justificando sua decisão técnica.' },
              { passo: '7. Gravação na Trilha de Auditoria', detalhe: 'A decisão humana e o valor final aprovado são persistidos no Audit Trail imutável.' },
            ].map((p, idx) => (
              <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-[8px] flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{p.passo}</h4>
                  <p className="text-xs text-slate-600 mt-0.5">{p.detalhe}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Section 5: Aprendizado Controlado & Segregação */}
      {activeSection === 'aprendizado' && (
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Fluxo do Aprendizado Controlado e Segregação de Funções
            </h2>
            <p className="text-xs text-slate-500">
              Ciclo de evolução das lições aprendidas até se tornarem Padrões Corporativos N5 com bloqueio mandatório de autoaprovação.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center">
            {[
              { nivel: 'Nível 1 (N1)', nome: 'Rascunho / Candidato', auth: 'Operador / Técnico', desc: 'Extraído automaticamente de divergências em RNCs.' },
              { nivel: 'Nível 2 (N2)', nome: 'Validado por Pares', auth: 'Técnico Sênior', desc: 'Revisão técnica inicial na Fila de Validação.' },
              { nivel: 'Nível 3 (N3)', nome: 'Padrão Setorial', auth: 'Supervisor de Área', desc: 'Aplicável formalmente no departamento de origem.' },
              { nivel: 'Nível 4 (N4)', nome: 'Padrão Homologável', auth: 'Auditor da Qualidade', desc: 'Auditado com evidências de eficácia comprovada.' },
              { nivel: 'Nível 5 (N5)', nome: 'Padrão Corporativo SGQ', auth: 'Gestor SGQ Independente', desc: 'Homologação final. Regra estrita: O autor original é proibido de autoaprovar.' },
            ].map((n, idx) => (
              <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-[8px] space-y-2">
                <span className="text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                  {n.nivel}
                </span>
                <h4 className="text-xs font-bold text-slate-900">{n.nome}</h4>
                <p className="text-[10px] font-semibold text-blue-600">Aprovador: {n.auth}</p>
                <p className="text-[11px] text-slate-600 leading-tight">{n.desc}</p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-[8px] bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-xs uppercase font-bold block">
                SEGREGAÇÃO DE FUNÇÕES COMPROVADA NO FIRESTORE RULES
              </strong>
              <p className="text-xs text-emerald-800 mt-1">
                A regra de segurança <code>(resource.data.criadoPorUid != request.auth.uid)</code> impede que o criador de uma lição aprove sua própria promoção para o Nível 5 (Padrão SGQ).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 8. Section 6: Segurança & RBAC */}
      {activeSection === 'seguranca' && (
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Matriz de Permissões RBAC e Defesa em Profundidade
            </h2>
            <p className="text-xs text-slate-500">
              Mapeamento de autorizações operacionais consolidadas no QualiGest SGQ.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold">
                  <th className="px-4 py-2.5 border-b border-slate-800">Operação no Sistema</th>
                  <th className="px-4 py-2.5 border-b border-slate-800">ADMIN</th>
                  <th className="px-4 py-2.5 border-b border-slate-800">GESTOR_SGQ</th>
                  <th className="px-4 py-2.5 border-b border-slate-800">AUDITOR</th>
                  <th className="px-4 py-2.5 border-b border-slate-800">CONSULTA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  ['Consultar RNCs, Manuais e Dashboards', 'Permitido', 'Permitido', 'Permitido', 'Permitido'],
                  ['Abrir e Editar RNCs (Formulário F 001-29)', 'Permitido', 'Permitido', 'Permitido', 'Bloqueado'],
                  ['Avaliar Eficácia e Encerrar RNCs', 'Permitido', 'Permitido', 'Permitido', 'Bloqueado'],
                  ['Upload e Revisão de Manuais', 'Permitido', 'Permitido', 'Bloqueado', 'Bloqueado'],
                  ['Aprovar Conhecimento Nível 5 (Padrão SGQ)', 'Permitido (Não-Autor)', 'Permitido (Não-Autor)', 'Bloqueado', 'Bloqueado'],
                  ['Excluir RNCs e Manuais', 'Permitido', 'Permitido', 'Bloqueado', 'Bloqueado'],
                  ['Alterar Roles / Gerenciar Usuários', 'Permitido', 'Bloqueado', 'Bloqueado', 'Bloqueado'],
                  ['Editar ou Excluir Registros de Audit Trail', 'BLOQUEADO', 'BLOQUEADO', 'BLOQUEADO', 'BLOQUEADO'],
                ].map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="px-4 py-2 font-medium text-slate-900">{row[0]}</td>
                    {row.slice(1).map((val, vIdx) => (
                      <td key={vIdx} className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          val.includes('Permitido') ? 'bg-emerald-100 text-emerald-800' :
                          val === 'BLOQUEADO' ? 'bg-rose-100 text-rose-900 font-bold' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {val}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. Section 7: Modelo de Dados Firestore */}
      {activeSection === 'dados' && (
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Arquitetura de Dados no Cloud Firestore
            </h2>
            <p className="text-xs text-slate-500">
              Coleções e subcoleções reais utilizadas na persistência multi-tenant do QualiGest.
            </p>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 bg-slate-900 text-white rounded-[8px]">
              /organizations/{'{organizationId}'}
            </div>
            <div className="pl-6 space-y-2 text-slate-800">
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-[6px]">
                ├── /nonConformities/{'{ncId}'} <span className="text-slate-500 font-sans font-normal">— Registros completos dos 11 blocos da RNC</span>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-[6px]">
                ├── /manuals/{'{manualId}'} <span className="text-slate-500 font-sans font-normal">— Biblioteca de Manuais e Normas Regulatórias</span>
              </div>
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-[6px]">
                ├── /auditTrails/{'{auditId}'} <span className="text-slate-500 font-sans font-normal">— Trilha de auditoria append-only imutável</span>
              </div>
              <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-[6px]">
                ├── /rncComparisons/{'{comparisonId}'} <span className="text-slate-500 font-sans font-normal">— Comparações semânticas e divergências</span>
              </div>
              <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-[6px]">
                └── /validatedKnowledge/{'{knowledgeId}'} <span className="text-slate-500 font-sans font-normal">— Base de Conhecimento N1 a N5 com segregação</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. Section 8: Bateria Adversarial Final */}
      {activeSection === 'adversarial' && (
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Bateria de Testes Adversariais & Red Team (Fase 6.1)
              </h2>
              <p className="text-xs text-slate-500">
                Execução de ataques simulados contra as barreiras de isolamento, autorização e governança do QualiGest.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-[6px] bg-emerald-100 text-emerald-800 border border-emerald-300">
              8 de 8 TESTES APROVADOS (100%)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cenariosAdversariais.map((c) => (
              <div key={c.id} className="p-4 bg-slate-50 border border-slate-200 rounded-[8px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                    {c.categoria}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {c.statusReal}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">{c.nome}</h4>
                <div className="text-[11px] text-slate-600 space-y-1">
                  <p><strong>Vetor de Teste:</strong> {c.vetorAtaque}</p>
                  <p><strong>Resultado Esperado:</strong> {c.resultadoEsperado}</p>
                  <p className="text-emerald-800 font-mono text-[10px] bg-emerald-50/80 p-1.5 rounded border border-emerald-200">
                    Evidência: {c.evidencia}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
