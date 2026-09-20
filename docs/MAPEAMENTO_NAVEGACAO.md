# QualiGest SGQ — Mapeamento Definitivo da Navegação

## 1. Princípio Arquitetural

A navegação do **QualiGest SGQ** reflete a forma como uma organização aeronáutica (MRO, operador aéreo ou centro de serviços homologado sob RBAC 145 / EASA Part-145) **utiliza o SGQ no seu dia a dia**, e não a ordem cronológica em que as funcionalidades técnicas foram desenvolvidas.

A navegação obedece à lógica operacional:
> **Módulo → Registro → Abas e Ações Relacionadas → Evidências → Histórico**

---

## 2. Estrutura dos 8 Blocos Mandatados

```text
[+ Nova Não Conformidade] (Ação Primária em Destaque)

1. INÍCIO
   ├── Dashboard Executivo
   ├── Pendências & Alertas
   ├── Saúde do SGQ
   └── Apresentação Gerencial

2. QUALIDADE
   ├── Não Conformidades
   ├── Análise & Indicadores
   ├── Validação & Aprovação
   └── Base de Conhecimento

3. AUDITORIAS & CLIENTES
   ├── Auditorias
   ├── Clientes & Requisitos
   ├── Auditoria Inteligente
   └── Calendário de Auditorias

4. PESSOAS & COMPETÊNCIAS
   ├── Colaboradores
   ├── Treinamentos
   ├── CHTs & Qualificações
   ├── Vencimentos & Gaps
   └── Aptidão Operacional

5. DOCUMENTOS
   ├── Acervo Documental
   ├── Revisões e Histórico
   ├── Conhecimento Temporal
   ├── Fontes Oficiais
   ├── Solicitações de Revisão de Clientes
   ├── Comparação de Revisões
   └── Indicadores Documentais

6. RECURSOS & CONTROLES
   ├── Ferramentas & Metrologia
   ├── Importação de Dados
   └── Outros Controles

7. CONHECIMENTO & MELHORIA
   ├── Base de Conhecimento
   ├── Lições Aprendidas
   ├── Soluções Validadas
   ├── Extrator de NCs com IA
   └── Manual de Utilização

8. ADMINISTRAÇÃO
   ├── Organização
   ├── Usuários & Permissões
   ├── Auditoria do Sistema
   ├── Implantação e Onboarding
   └── Diagnósticos Técnicos
```

---

## 3. Dicionário de Rotas e Identificadores `activeTab`

| Bloco | Item de Menu | `activeTab` ID | Componente Renderizado | Subaba / Parâmetro Inicial |
| :--- | :--- | :--- | :--- | :--- |
| **Ação** | + Nova RNC | `formulario` | `NCFormView` | Criação de novo registro |
| **INÍCIO** | Dashboard Executivo | `dashboard` | `DashboardView` | Visão executiva integrada |
| **INÍCIO** | Pendências & Alertas | `alertas` | `AlertsCenterView` | Prazos, SLA e ações críticas |
| **INÍCIO** | Saúde do SGQ | `saudeSGQ` | `SGQHealthView` | Radar de maturidade RBAC 145 |
| **INÍCIO** | Apresentação Gerencial | `apresentacao` | `QualityPresentationGeneratorView` | SSoT 20 Slides (70/30) |
| **QUALIDADE** | Não Conformidades | `relatorio` | `ReportListView` | Tabela dinâmica & Kanban |
| **QUALIDADE** | Análise & Indicadores | `incidencias` | `IncidenceAnalyticsView` | Pareto 80/20 & Incidências |
| **QUALIDADE** | Validação & Aprovação | `validacaoQueue` | `ValidationQueueView` | Fila de homologação N1-N5 |
| **QUALIDADE** | Base de Conhecimento | `knowledgeBase` | `KnowledgeBaseView` | Soluções homologadas |
| **AUDITORIAS** | Auditorias | `auditorias-gestao` | `AuditsManagementView` | Auditorias ANAC/EASA/Clientes |
| **AUDITORIAS** | Clientes & Requisitos | `clientes-requisitos`| `ClientAuditsManagementView` | Requisitos & "1 Controle, N Req" |
| **AUDITORIAS** | Auditoria Inteligente | `smart-audit` | `SmartAuditView` | Resolução por exceção & IA |
| **AUDITORIAS** | Calendário de Auditorias | `clientes-cronograma`| `ClientAuditsManagementView` | `initialTab="cronograma"` |
| **PESSOAS** | Colaboradores | `pessoas-competencias`| `PersonsCompetenciesView` | Cadastro técnico & postos |
| **PESSOAS** | Treinamentos | `treinamentos-qualificacoes` | `TrainingsQualificationsView` | `initialTab="CURSOS"` |
| **PESSOAS** | CHTs & Qualificações | `cht-qualificacoes` | `TrainingsQualificationsView` | `initialTab="QUALIFICACOES"` |
| **PESSOAS** | Vencimentos & Gaps | `central-vencimentos-gaps` | `ExpirationsGapsCenterView` | `initialSubTab="VENCIMENTOS"` |
| **PESSOAS** | Aptidão Operacional | `aptidao-operacional`| `ExpirationsGapsCenterView` | `initialSubTab="SIMULADOR"` |
| **DOCUMENTOS** | Acervo Documental | `controle-documental` | `DocumentControlCenterView` | `initialSubTab="acervo"` |
| **DOCUMENTOS** | Revisões e Histórico | `documentos-revisoes` | `DocumentControlCenterView` | `initialSubTab="acervo"` |
| **DOCUMENTOS** | Conhecimento Temporal | `consulta-temporal` | `DocumentControlCenterView` | `initialSubTab="temporal"` |
| **DOCUMENTOS** | Fontes Oficiais | `fontes-externas` | `DocumentControlCenterView` | `initialSubTab="fontes"` |
| **DOCUMENTOS** | Solicitações de Clientes| `documentos-solicitacoes` | `DocumentControlCenterView` | `initialSubTab="solicitacoes"` |
| **DOCUMENTOS** | Comparação de Revisões | `documentos-comparador` | `DocumentControlCenterView` | `initialSubTab="comparador"` |
| **DOCUMENTOS** | Indicadores Documentais | `documentos-dashboard` | `DocumentControlCenterView` | `initialSubTab="dashboard"` |
| **RECURSOS** | Ferramentas & Metrologia | `ferramentas-metrologia` | `SmartImportMigrationView` | `initialTab="METROLOGIA"` |
| **RECURSOS** | Importação de Dados | `importacao-inteligente` | `SmartImportMigrationView` | `initialTab="WIZARD"` |
| **RECURSOS** | Outros Controles | `outros-controles` | `ClientAuditsManagementView` | `initialTab="controles"` |
| **CONHECIMENTO**| Base de Conhecimento | `knowledgeBase` | `KnowledgeBaseView` | Repositório compartilhado |
| **CONHECIMENTO**| Lições Aprendidas | `auditorias-licoes` | `AuditLessonsLearnedView` | Lições derivadas de auditorias |
| **CONHECIMENTO**| Soluções Validadas | `comparacaoRNC` | `RNCComparisonView` | Comparador analítico de RNCs |
| **CONHECIMENTO**| Extrator de NCs com IA | `extrator` | `DocumentExtractorView` | Extração assistida por IA |
| **CONHECIMENTO**| Manual de Utilização | `manual-utilizacao` | `UserManualView` | 27 capítulos do SGQ |
| **ADMIN** | Organização | `configuracoes-org` | `OrganizationSettingsView` | Identidade e parâmetros do tenant |
| **ADMIN** | Usuários & Permissões | `admin-central` | `CentralAdministrationView` | `initialSubTab="usuarios"` |
| **ADMIN** | Auditoria do Sistema | `admin-audit-trail` | `CentralAdministrationView` | `initialSubTab="audit-trail"` |
| **ADMIN** | Implantação e Onboarding| `onboarding-novo-cliente` | `NewOrganizationOnboardingView` | Setup de novos clientes |
| **ADMIN** | Diagnósticos Técnicos | `diagnosticos-tecnicos` | `TechnicalDiagnosticsCenterView` | Arquitetura, ADRs, Firebase & Infra |

---

## 4. Mapeamento: Menu Antigo vs. Novo Menu Consolidado

| Entrada Antiga | Onde Ficou na Nova Arquitetura | Justificativa Operacional |
| :--- | :--- | :--- |
| **Ficha Oficial F 001-29** (item permanente) | **Acessada Contextualmente** na RNC (botão "Visualizar Ficha", ação de impressão e detalhes) | Elimina ruído no menu fixo; F 001-29 é um formato de saída/dossiê, não uma seção isolada de navegação primária. |
| **Biblioteca de Manuais** | Consolidada em **DOCUMENTOS → Acervo Documental** | Manuais AMM/CMM/MOE fazem parte do acervo documental controlado sob controle de revisões vigentes. |
| **Arquitetura do Sistema** | Consolidada em **ADMINISTRAÇÃO → Diagnósticos Técnicos** (Subaba Arquitetura) | Função técnica de engenharia de software não deve poluir a rotina de inspetores ou mecânicos. |
| **System Designer Oficial** | Consolidado em **ADMINISTRAÇÃO → Diagnósticos Técnicos** (Subaba System Designer) | Especificação formal de engenharia e ADRs do sistema agrupada com governança de TI. |
| **Auditoria Técnica (Hardening)** | Integrada em **ADMINISTRAÇÃO → Diagnósticos Técnicos** | Ferramenta de auditoria de segurança e integridade de banco de dados alocada no painel administrativo. |
| **Diagnóstico Firebase** | Integrado em **ADMINISTRAÇÃO → Diagnósticos Técnicos** | Teste de infraestrutura de nuvem, latência e Firestore mantido sob gestão técnica. |
| **Checklist de Ativação** | Integrado em **ADMINISTRAÇÃO → Implantação e Onboarding** | Processo de setup de novo tenant acessível durante a implantação inicial. |
| **Conheça o QualiGest** | Integrado no **Manual de Utilização** (Capítulos 1 e 4) | Tour institucional incorporado ao manual operacional. |
| **Constatações de Auditoria** | Acessível dentro do módulo **AUDITORIAS & CLIENTES → Auditorias** | Findings são filhas de auditorias e devem ser investigadas no contexto de cada auditoria. |
| **Metrologia / Ferramentas Calibradas** | Consolidada em **RECURSOS & CONTROLES → Ferramentas & Metrologia** | Elevada a módulo direto sob governança de recursos da oficina. |

---

## 5. Acesso Contextual à Ficha Oficial F 001-29

A Ficha Oficial F 001-29 é o relatório canônico e regulatório do QualiGest SGQ. Para manter o menu limpo e organizado sem perder qualquer funcionalidade:

1. **Lista de RNCs (`ReportListView`):**
   - Cada linha possui botão de ação direta para abrir a Ficha Oficial.
   - Selecionar uma RNC permite alternar entre modo tabela e Ficha Oficial F 001-29.
2. **Formulário de RNC (`NCFormView`):**
   - Ao salvar ou visualizar o desvio, há botão de geração imediata da Ficha Oficial.
3. **Dashboard Executivo (`DashboardView`):**
   - O clique em qualquer ocorrência recente abre imediatamente a Ficha Oficial correspondente.
4. **Central de Alertas (`AlertsCenterView`):**
   - Clicar em um alerta de prazo ou risco abre a Ficha Oficial do registro.
5. **Ações Disponíveis dentro da Ficha Oficial (`OfficialReportView`):**
   - Botão **"Voltar para Registros"** (retorna imediatamente para a listagem).
   - Botão **"Imprimir / Exportar PDF"** (formatação para papel A4 em alta resolução).
   - Botão **"Editar RNC"** (abre o formulário na aba de causa ou plano 5W2H).
   - Botão **"Exportar Excel (.xlsx)"** e **"Auditar com IA"**.

---

## 6. Controle de Acesso Baseado em Função (RBAC)

O menu aplica as regras de visibilidade e autorização conforme os perfis:

| Papel RBAC | Acesso a INÍCIO e QUALIDADE | Acesso a AUDITORIAS e PESSOAS | Acesso a DOCUMENTOS e RECURSOS | Acesso a ADMINISTRAÇÃO |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | Total (Leitura / Edição) | Total (Leitura / Edição) | Total (Leitura / Edição) | **Total** (Gestão, Auditoria, TI) |
| **GESTOR_SGQ**| Total (Aprovação / Encerramento) | Total (Aprovação / Homologação) | Total (Aprovação de Revisões) | **Total** (Organização, Usuários) |
| **AUDITOR** | Criação / Edição de RNCs | Gestão de Constatações | Leitura de Documentos | Bloqueado |
| **MANUTENCAO** | Abertura de RNCs / Consulta | Consulta de Competências | Leitura de Manuais / Metrologia | Bloqueado |
| **TREINAMENTO**| Consulta de RNCs | Gestão Integral de Treinamentos | Leitura de Manuais | Bloqueado |
| **CONSULTA** | Somente Leitura | Somente Leitura | Somente Leitura | Bloqueado |
