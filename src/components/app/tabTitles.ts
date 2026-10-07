export function getTitleForTab(tab: string, selectedNCNumber?: string): string {
  switch (tab) {
    case 'dashboard': return 'Dashboard Executivo';
    case 'visao-evolucao': return 'Visão Mestre, Arquitetura & Roadmap Estratégico (FASE 12)';
    case 'saudeSGQ': return 'Saúde & Integridade do SGQ';
    case 'relatorio': return 'Registros de Não Conformidade (RNC)';
    case 'manuais': return 'Biblioteca de Manuais & Normas SGQ';
    case 'extrator': return 'Assistente Extrator de NCs com IA';
    case 'formulario': return selectedNCNumber ? `Edição de RNC #${selectedNCNumber}` : 'Novo Cadastro de RNC';
    case 'incidencias': return 'Análise de Incidências & Diagrama de Pareto';
    case 'alertas': return 'Central de Prazos & Notificações';
    case 'oficial': return 'Ficha Oficial F 001-29';
    case 'comparacaoRNC': return 'Comparação & Validação de RNCs Respondidas';
    case 'validacaoQueue': return 'Fila de Validação de RNCs';
    case 'knowledgeBase': return 'Base de Conhecimento Validada SGQ';
    case 'conhecaQualigest': return 'Conheça o QualiGest SGQ (Tour & Homologação)';
    case 'apresentacao': return 'Apresentação Gerencial da Qualidade';
    case 'arquitetura': return 'Arquitetura do Sistema SGQ';
    case 'admin-central': return 'Gestão Central de Organizações, Usuários & Permissões (FASE 11)';
    case 'configuracoes-org': return 'Configurações da Organização & Identidade';
    case 'onboarding-novo-cliente': return 'Onboarding & Implantação de Nova Organização';
    case 'manual-utilizacao': return 'Manual de Utilização & Governança da Qualidade';
    case 'auditorias-gestao': return 'Gestão de Auditorias Externas';
    case 'auditorias-constatacoes': return 'Constatações de Auditorias (Findings) & Respostas Oficiais';
    case 'auditorias-licoes': return 'Lições Aprendidas de Auditorias Externas';
    case 'auditorias-dashboard': return 'Dashboard Analítico de Auditorias';
    case 'pessoas-competencias': return 'Matriz de Competências & Pessoas';
    case 'treinamentos-qualificacoes': return 'Treinamentos, CHTs & Qualificações';
    case 'central-vencimentos-gaps': return 'Central de Vencimentos & Gaps Críticos';
    case 'competencias-dashboard': return 'Dashboard de Competências & Compliance';
    case 'controle-documental': return 'Controle Documental & Acervo Técnico';
    case 'consulta-temporal': return 'Conhecimento Temporal & RAG Auditável';
    case 'fontes-externas': return 'Fontes Oficiais Externas & Verificação';
    case 'documentos-dashboard': return 'Dashboard Executivo de Controle Documental';
    case 'clientes-requisitos': return 'Auditorias & Requisitos de Clientes (FASE 13)';
    case 'clientes-matriz': return 'Matriz de Cobertura SGQ — Um Controle, Vários Requisitos';
    case 'clientes-cockpit': return 'Cockpit & Estações de Clientes';
    case 'smart-audit': return 'Auditoria Inteligente por Requisitos & Resolução por Exceção (FASE 15)';
    case 'system-designer': return 'System Designer Oficial do QualiGest (Arquitetura, Coleções & ADRs)';
    default: return 'Sistema de Qualidade';
  }
}
