# QualiGest SGQ — Sistema Integrado de Gestão e Garantia da Qualidade Aeronáutica

<div align="center">

[![Versão](https://img.shields.io/badge/Versão-v2.8.0--enterprise-0284c7.svg?style=for-the-badge)](https://impacto.aero)
[![Compliance](https://img.shields.io/badge/Homologação-ANAC%20RBAC%20145%20%7C%20EASA%20%7C%20FAA-10b981.svg?style=for-the-badge)](https://impacto.aero)
[![Segurança](https://img.shields.io/badge/Multi--Tenancy-Firestore%20Rules%20Audited-6366f1.svg?style=for-the-badge)](https://impacto.aero)
[![AI Engine](https://img.shields.io/badge/IA%20Copilot-Google%20Gemini%20Aeronáutico-f59e0b.svg?style=for-the-badge)](https://impacto.aero)

**A Plataforma Enterprise de Garantia da Qualidade, Segurança Operacional e Compliance para Oficinas de Manutenção Aeronáutica (MRO), Centros de Serviços e Operadores Aéreos.**

[Visão Geral](#-visão-geral) • [Diferenciais de Negócio](#-diferenciais-estratégicos--roi) • [Telas e Módulos](#-demonstração-visual-do-sistema) • [Relatórios Oficiais](#-relatórios-técnicos--dossiê-f-001-29) • [Arquitetura](#-arquitetura-e-segurança) • [Instalação](#-instalação-e-execução)

---

</div>

<p align="center">
  <img src="./public/screenshots/dashboard_overview.jpg" alt="Painel Executivo QualiGest SGQ" width="100%" style="border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);" />
</p>

---

## 📋 Visão Geral

O **QualiGest SGQ** foi concebido especificamente para atender aos rigores operacionais e normativos de centros de manutenção aeronáutica homologados segundo **ANAC RBAC 145**, **EASA Part-145**, **FAA Part 145**, **ISO 9001** e **AS9100**.

Mais do que um simples emissor de Não Conformidades, o QualiGest é um **ecossistema integrado de governança da qualidade e conhecimento técnico**, interligando:
- **Gestão de RNCs (F 001-29)** com Matriz de Risco Aeronáutico 5x5 e planos CAPA;
- **Auditorias Externas** de autoridades reguladoras e clientes com geração de lições aprendidas;
- **Dossiê de Pessoas e Habilitações Técnicas (CHTs ANAC)** com controle preditivo de vencimentos;
- **Controle Documental com Consulta Temporal**, garantindo que qualquer intervenção técnica do passado possa ser auditada com a revisão exata que estava em vigor no dia do evento;
- **Copilot de IA Aeronáutico (Gemini)** treinado para sugerir causas raízes, auditar coerência técnica e acelerar investigações.

---

## 💎 Diferenciais Estratégicos & ROI

| Pilar | Desafio Tradicional no MRO | Solução QualiGest SGQ | Impacto no Negócio |
| :--- | :--- | :--- | :--- |
| **Tratamento de RNCs** | Planilhas descentralizadas, prazos perdidos e análises de causa superficiais. | Workflow guiado (5 Porquês + Ishikawa 6M), cálculo automático de criticidade e alertas por e-mail. | **-85% no tempo de ciclo** de fechamento de RNCs. |
| **Auditorias ANAC/EASA** | Semanas organizando pastas físicas, dossiês e evidências para auditores. | Central de Auditorias com exportação instantânea do acervo de evidências e RNCs correlatas. | **Auditorias sem surpresas** e risco zero de multas por descontrole. |
| **Vencimento de CHTs** | Técnicos liberando aeronaves com treinamentos ou CHTs vencidos (falha grave). | Central de Vencimentos Preditiva (alertas aos 60, 30 e 15 dias) e Matriz de Competências por posto. | **100% de compliance** com as exigências do RBAC 145.163. |
| **Acervo Documental** | Risco de uso de revisões obsoletas de manuais de manutenção (AMM/CMM). | Consulta Temporal com precisão de data, logs de leitura obrigatória e comparador visual de revisões. | **Blindagem jurídica e técnica** contra apontamentos de auditoria. |
| **Multi-Tenancy** | Dificuldade em gerir filiais, bases operacionais ou clientes segregados. | Isolamento rigoroso por organização no Firestore (`/organizations/{orgId}/...`) com governança unificada. | **Escalabilidade ilimitada** para holdings e redes de oficinas. |

---

## 📸 Demonstração Visual do Sistema

### 1. Painel Executivo & Dashboard da Qualidade
Acompanhamento em tempo real dos principais indicadores operacionais do SGQ: índice de eficácia de ações corretivas, distribuição de severidade na Matriz de Risco 5x5, volume de RNCs por setor e status da frota.

<p align="center">
  <img src="./public/screenshots/dashboard_overview.jpg" alt="Dashboard da Qualidade" width="100%" style="border-radius: 8px;" />
</p>

---

### 2. Inteligência Analítica e Matriz de Risco 5x5
Gráficos analíticos interativos (Análise de Pareto 80/20 de causas fundamentais, tempo médio de resolução MTTR, distribuição por Capítulo ATA e mapa de calor de probabilidade versus severidade de risco aeronáutico).

<p align="center">
  <img src="./public/screenshots/analytics_charts.jpg" alt="Métricas e Gráficos Analíticos" width="100%" style="border-radius: 8px;" />
</p>

---

### 3. Relatórios Técnicos & Dossiê Oficial (Formulário RNC F 001-29)
Geração automática de relatórios oficiais no formato padrão da aviação, contendo cabeçalho institucional, selos de certificação, histórico dos 5 Porquês, diagrama espinha de peixe (6M), plano CAPA com prazos/responsáveis e assinaturas digitais com rastreabilidade criptográfica. Exportação em **PDF de alta resolução**, **Excel (.xlsx)** e **PowerPoint (.pptx)** para comitês executivos.

<p align="center">
  <img src="./public/screenshots/rnc_report_preview.jpg" alt="Visualização do Relatório Oficial F 001-29" width="100%" style="border-radius: 8px;" />
</p>

---

### 4. Controle Documental & Máquina Temporal de Revisões (Fase 10)
Centro de controle para Manuais de Manutenção de Aeronaves (AMM), Manuais de Componentes (CMM), Manuais Gerais de Operação (MGO/MOE) e Diretrizes de Aeronavegabilidade (DA/AD):
- **Consulta Temporal Reversa:** Digite qualquer data do passado para saber instantaneamente qual revisão exata estava vigente no momento de uma ordem de serviço.
- **Comparador Visual de Revisões:** Destaque automático de adições (verde) e supressões (vermelho) entre revisões de manuais.
- **Monitoramento de Fontes Oficiais:** Verificação periódica de portais de fabricantes (Boeing, Airbus, Embraer) e autoridades (ANAC, FAA, EASA).
- **Evidências de Leitura Operacional:** Mecânicos registram leitura obrigatória antes da liberação de tarefas críticas.

<p align="center">
  <img src="./public/screenshots/document_control.jpg" alt="Controle Documental e Comparador de Revisões" width="100%" style="border-radius: 8px;" />
</p>

---

### 5. Pessoas, Competências & Central de Vencimentos CHT (Fase 9)
Gestão integral do corpo técnico de manutenção:
- **Controle de Licenças ANAC:** CHTs nas especialidades Célula (CEL), Grupo Motopropulsor (GMP) e Aviônicos (AVI), além de escopos de liberação de aeronave (RII/Release).
- **Reciclagens Obrigatórias:** Acompanhamento de validades de Fatores Humanos, SGSO, EWIS, Segurança de Tanques de Combustível (FTS) e Legislação RBAC 145.
- **Radar de Competências:** Cruzamento visual entre os requisitos do posto de trabalho e o nível de proficiência demonstrado pelo colaborador.

<p align="center">
  <img src="./public/screenshots/competency_matrix.jpg" alt="Matriz de Competências e Vencimentos CHT" width="100%" style="border-radius: 8px;" />
</p>

---

---

## 🚀 As 15 Fases Operacionais do QualiGest SGQ

O QualiGest foi construído através de 15 fases de engenharia contínua, todas homologadas e operando de forma integrada:

1. **Fase 1 — Ficha Oficial de Não Conformidade (Formulário F 001-29):** Digitalização completa do formulário oficial com numeração única, triagem de ação corretiva/preventiva e avaliação de risco inicial e residual.
2. **Fase 2 — Nuvem Cloud Firestore como SSoT Multiusuário:** Persistência em tempo real via listeners `onSnapshot`, eliminação de dependência de cache local e isolamento estrito por organização (`/organizations/{orgId}/...`).
3. **Fase 3 — Extrator e Transcrição Inteligente com IA Gemini:** Leitura óptica e semântica de formulários Word (`.docx`), PDF e imagens de RNCs com auto-preenchimento e preenchimento de contingência por regras SGQ.
4. **Fase 4 — Motor de Investigação Causal (Ishikawa 6M + 5 Porquês + 5W2H):** Encadeamento causal estrito distinguindo fatos comprovados de hipóteses sob validação humana, com plano CAPA detalhado.
5. **Fase 5 — Base de Conhecimento Validada (N1 a N5) & Comparador Semântico:** Esteira de maturação do conhecimento organizacional e comparador de desvios para evitar retrabalho e reincidências.
6. **Fase 6 — Dashboard Executivo & Inteligência Analítica:** Curva de Pareto 80/20, tempo médio de fechamento (MTTR), distribuição por capítulo ATA 100 e matriz de risco 5x5 em tempo real.
7. **Fase 7 — Auditorias Externas (ANAC, EASA, FAA, Clientes):** Controle formal de auditorias recebidas, classificação de constatações (findings Maiores/Menores) e conversão direta de apontamentos em RNCs vinculadas.
8. **Fase 8 — Saúde do SGQ (sgqHealth) & Central de Alertas Preditivos:** Algoritmo ponderado de maturidade regulatória que audita a integridade de dados e emite alertas preditivos aos 60, 30 e 15 dias.
9. **Fase 9 — Pessoas, Competências 360° & Central de Vencimentos CHT:** Dossiê integral de colaboradores com carteiras ANAC (CEL, GMP, AVI), cursos regulamentares (Fatores Humanos, SGSO, EWIS), segregação entre status operacional e aptidão técnica, e bloqueio preventivo de assinaturas de liberação.
10. **Fase 10 — Controle Documental & Consulta Temporal na Data da OS (F 001-02-1):** Catálogo de publicações controladas (AMM, CMM, MOE, POP), consulta reversa que atesta qual revisão exata estava em vigor na data de qualquer ordem de serviço do passado, comparador visual de revisões e monitoramento de fontes externas.
11. **Fase 11 — Gestão Metrológica, Ferramentas Calibradas & Conta Corrente de Créditos (RBAC 145.109):** Rastreabilidade de instrumentos com calibração RBC (torquímetros, multímetros, manômetros), balanço de créditos e área de quarentena com tranca física e digital.
12. **Fase 12 — Apresentação Gerencial Oficial 70/30 (Web & PPTX Auto-Fit):** Motor SSoT com 20 slides corporativos divididos em 70% Situação Real da Empresa e 30% Evolução do Sistema, com auto-fit geométrico e Teste de Espelho certificado.
13. **Fase 13 — Auditoria Inteligente por Requisitos com Resolução por Exceção:** Arquitetura "Um Controle, Vários Requisitos" com checklist Kalitta Air QA-14 / EASA / ANAC, árvore hierárquica por seções e confirmação de conformidade em lote para foco exclusivo nas exceções e desvios.
14. **Fase 14 — System Designer Oficial Permanente & Registro de ADRs:** Registro vivo e imutável das Decisões Arquiteturais de Software (ADRs), topologia de componentes, matriz de fluxo de dados e inventário técnico de coleções.
15. **Fase 15 — Motor de Importação Inteligente de Dados & Reconciliação:** Wizard em 4 etapas com upload e detecção de planilhas, mapeamento de colunas assistido por IA Gemini, pré-visualização de diff de reconciliação (novo, atualizado, inalterado) e reversão segura de carga (Undo).

---

## 🔌 API de Integração MRO (Impacto MRO Connect)

O QualiGest disponibiliza um proxy seguro no servidor Node.js Express (`server.ts`) para comunicação bidirecional com os sistemas operacionais do hangar:
- `GET /api/impacto/health`: Monitoramento de conectividade da oficina.
- `GET /api/impacto/aeronaves`: Frota e modelos em manutenção.
- `GET /api/impacto/colaboradores`: Efetivo técnico ativo e qualificações.
- `GET /api/impacto/ferramentas`: Ferramental calibrado e status metrológico.
- `GET /api/impacto/ordens-servico`: Ordens de Serviço (OS) ativas e histórico.
- `GET /api/impacto/ordens-servico/:id/contexto-qualidade`: Dossiê consolidado de qualidade da OS cruzando técnico, ferramentas utilizadas e manuais consultados.

> **Resiliência e Fallback:** Se a conexão externa com o ERP oscilar, o sistema ativa automaticamente o modo de contingência local, garantindo que as operações do hangar jamais sejam interrompidas.

---

## 🔮 Horizontes de Evolução Tecnológica (Roadmap Estratégico)

O plano de evolução do QualiGest é estruturado em **4 Horizontes de Inovação Contínua**:

| Horizonte | Foco Estratégico | Status | Entregas Chave |
| :--- | :--- | :--- | :--- |
| **H1: Core Consolidado** | Fases 1 a 15 100% Homologadas | 🟢 **Em Produção** | RNC F 001-29, Ishikawa 6M, 5W2H, Pessoas/CHTs, Máquina Temporal, Metrologia RBC, Apresentação 70/30, Auditoria por Exceção, System Designer ADRs e Smart Import. |
| **H2: Conectores ERP & MRO** | Expansão de Integrações de Hangar | 🟡 **Em Andamento** | Conectores com SAP, Totvs, Quantum, Diário de Bordo Eletrônico (ELB) e leitura ótica de códigos de barras e RFID de ferramental. |
| **H3: SGQ Preditivo & Frota** | Modelagem Estocástica de Confiabilidade | 🔵 **Planejado** | Análise de confiabilidade ATA 100, predição de falhas de componentes de frota e cruzamento proativo de Diretrizes de Aeronavegabilidade (AD/DA). |
| **H4: Ecossistema Global Inter-MRO** | Inteligência Coletiva em Segurança de Voo | ⚪ **Visão Futura** | Rede colaborativa segura e anonimizada entre oficinas homologadas para intercâmbio de lições aprendidas e benchmarking regulatório ANAC/EASA/FAA. |

---

## 🧩 Arquitetura de Navegação em 8 Blocos Operacionais

A navegação do QualiGest é estruturada em torno do ciclo real de trabalho de uma organização de manutenção aeronáutica (RBAC 145 / EASA Part-145):

```
QualiGest SGQ Enterprise
├── [+ Nova Não Conformidade] (Ação Primária Instantânea)
├── 1. INÍCIO
│   ├── Dashboard Executivo
│   ├── Pendências & Alertas Críticos
│   ├── Saúde do SGQ (Maturidade RBAC 145)
│   └── Apresentação Gerencial (SSoT 20 Slides 70/30)
├── 2. QUALIDADE
│   ├── Não Conformidades (Tabela Dinâmica & Kanban)
│   ├── Análise & Indicadores (Pareto 80/20 & ATA 100)
│   ├── Validação & Aprovação (Fila N1-N5)
│   └── Base de Conhecimento Homologada
├── 3. AUDITORIAS & CLIENTES
│   ├── Auditorias Regulatórias & Clientes
│   ├── Clientes & Requisitos ("Um Controle, Vários Requisitos")
│   ├── Auditoria Inteligente com IA
│   └── Calendário e Cronograma de Auditorias
├── 4. PESSOAS & COMPETÊNCIAS
│   ├── Colaboradores & Dossiê Técnico
│   ├── Treinamentos & Cursos Regulamentares
│   ├── Carteiras CHT (CEL / GMP / AVI) & Qualificações
│   ├── Central Preditiva de Vencimentos & Gaps
│   └── Simulador de Aptidão Operacional
├── 5. DOCUMENTOS
│   ├── Acervo Documental (AMM, CMM, MOE, POP)
│   ├── Revisões Vigentes & Histórico Imutável
│   ├── Conhecimento Temporal na Data da OS
│   ├── Monitoramento de Fontes Oficiais (ANAC, FAA, EASA, OEMs)
│   ├── Solicitações de Revisão de Clientes
│   ├── Comparador Visual de Revisões
│   └── Indicadores de Gestão Documental
├── 6. RECURSOS & CONTROLES
│   ├── Ferramentas & Metrologia Calibrada
│   ├── Importação Inteligente de Dados (Wizard)
│   └── Outros Controles Centrais SGQ
├── 7. CONHECIMENTO & MELHORIA
│   ├── Base de Conhecimento e Padrões
│   ├── Lições Aprendidas de Auditorias
│   ├── Soluções Validadas (Comparador de RNCs)
│   ├── Extrator de Documentos com IA
│   └── Manual Oficial de Utilização
└── 8. ADMINISTRAÇÃO
    ├── Parâmetros da Organização (Tenant)
    ├── Gestão de Usuários & Permissões (RBAC)
    ├── Trilha de Auditoria do Sistema (Audit Trail)
    ├── Implantação e Onboarding de Clientes
    └── Centro de Diagnósticos Técnicos (Arquitetura, ADRs, Firebase & Infra)
```

> **Jornada Operacional Padronizada:** A navegação obedece ao fluxo: **Módulo → Registro → Abas e Ações Relacionadas → Evidências → Histórico**. Ações de saída como a *Ficha Oficial F 001-29* são acionadas contextualmente em cada registro, eliminando poluição visual no menu permanente.

---

## 📚 Manuais e Documentação Técnica

Para guias aprofundados e especificações arquiteturais, consulte a documentação oficial na pasta `/docs`:

- **[Manual do Usuário](./docs/MANUAL_USUARIO.md):** Guia prático de navegação executiva, atalhos de teclado, filtros e interpretação dos 20 slides gerenciais.
- **[Manual do Administrador](./docs/MANUAL_ADMINISTRADOR.md):** Governança de acessos (RBAC), isolamento multi-tenant, auditorias e homologação de conhecimento N5.
- **[Manual Técnico & Arquitetura](./docs/MANUAL_TECNICO.md):** Especificação do motor SSoT (`presentationSlidesData.ts`), renderizador visual Web, gerador PPTX e Teste de Espelho.
- **[Manual de Implantação & Homologação](./docs/MANUAL_IMPLANTACAO.md):** Procedimentos de deploy, variáveis de ambiente, regras de segurança e suíte de homologação contínua.

---

## 🛡️ Arquitetura e Segurança

- **Frontend:** React 19, TypeScript estrito, Tailwind CSS, Lucide Icons, Recharts, Framer Motion.
- **Backend Seguro:** Node.js + Express (`server.ts`) com proxy reverso e proteção de chaves de API do lado do servidor (Gemini API jamais exposta no cliente).
- **Banco de Dados Cloud:** Firebase Cloud Firestore com particionamento multi-tenant (`organizations/{orgId}/...`).
- **Políticas de Acesso Granulares (`firestore.rules`):** Regras de segurança RBAC que impedem vazamento de dados entre empresas, exigem autenticação válida e protegem trilhas de auditoria contra exclusão acidental.
- **Auditoria de Operações:** Cada alteração, aprovação de revisão documental ou mudança de status gera um registro rastreável com identificação de usuário, timestamp e resumo de impacto.

---

## ⚙️ Instalação e Execução

### Pré-requisitos
- Node.js 18+ ou Bun
- Projeto Firebase configurado com Firestore e Authentication

### 1. Clonar e Configurar Variáveis
```bash
git clone https://github.com/seu-repositorio/qualigest-sgq.git
cd qualigest-sgq
cp .env.example .env
```

### 2. Executar em Desenvolvimento
```bash
# Iniciar servidor integrado Express + Vite na porta 3000
npm run dev
```

### 3. Validação de Código e Compilação
```bash
# Verificação estrita de tipagem TypeScript
npm run lint

# Build de produção otimizado
npm run build

# Execução em ambiente de produção
npm run start
```

---

## 📚 Manual de Operações Integrado (35 Capítulos)

O QualiGest SGQ possui um manual técnico de **35 capítulos completos** diretamente incorporado à aplicação. Acesse a guia **"Manual de Utilização"** no menu principal para consultar:
- Políticas de Não Conformidade conforme o RBAC 145.211;
- Procedimento para análise de causa raiz (Ishikawa 6M + 5 Porquês) e aprovação de planos CAPA 5W2H;
- Matriz de Risco 5x5 e esteira de maturação do conhecimento N1 a N5;
- Gestão de Pessoas, Competências 360° e Bloqueios CHT;
- Consulta Temporal Documental na data da Ordem de Serviço (F 001-02-1);
- Gestão Metrológica, Ferramentas Calibradas RBC e Conta Corrente de Créditos;
- Auditorias de Clientes com Resolução por Exceção (Kalitta QA-14 / EASA / ANAC);
- System Designer Permanente e Catálogo Oficial de ADRs;
- Motor de Importação Inteligente em 4 Etapas com Reconciliação e Desfazer (Undo);
- Simuladores interativos de fluxo operacional e checklist de 12 passos para novos usuários.

---

<div align="center">
  <sub>Desenvolvido com excelência técnica para a aviação comercial e executiva • Impacto Aviation MRO</sub>
</div>
