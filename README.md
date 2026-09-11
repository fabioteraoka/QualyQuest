# QualiGest SGQ — Sistema Integrado de Gestão e Garantia da Qualidade Aeronáutica

**Versão:** v2.8.0-enterprise  
**Normas & Regulamentos de Referência:** ANAC RBAC 145 / EASA Part-145 / FAA Part 145 / ISO 9001 / AS9100  
**Stack:** React 19 • TypeScript • Tailwind CSS • Vite • Express • Firebase Firestore & Auth • Google GenAI (Gemini)

---

## 📋 Visão Geral

O **QualiGest SGQ** é uma solução completa de Gestão da Qualidade desenvolvida sob medida para Oficinas de Manutenção Aeronáutica (MRO), operadores aéreos e centros de serviços homologados. O sistema cobre desde o ciclo de vida rigoroso de Não Conformidades (RNC F 001-29) até auditorias externas, qualificação de pessoal técnico (CHTs), e o controle documental aeronáutico com rastreabilidade temporal.

---

## 🚀 Estrutura de Módulos (Fases Homologadas)

### 1. Gestão de Não Conformidades (RNC F 001-29) — Fases 1 a 4
- **Formulário Oficial de RNC:** Emissão, descrição técnica com classificação de severidade e probabilidade (Matriz de Risco 5x5).
- **Análise de Causa Raiz:** Metodologias integradas de **5 Porquês** e **Diagrama de Ishikawa (6M)**.
- **Plano de Ações Corretivas e Preventivas (CAPA):** Definição de ações imediatas, corretivas e de contenção com responsáveis e prazos.
- **Verificação de Eficácia:** Avaliação formal de reincidência e eficácia das ações antes do encerramento oficial da RNC.
- **Exportação e Relatórios:** Geração de relatórios em PDF (jspdf + html2canvas), planilhas Excel (xlsx) e apresentações PowerPoint (pptxgenjs).

### 2. Base de Conhecimento e IA Copilot SGQ — Fases 5 e 6
- **Banco de Lições Aprendidas:** Registro sistemático de falhas, causas fundamentais e aprendizados homologados.
- **Auditoria Técnica e Compliance AI:** Auditoria de conformidade assistida por IA (Gemini) com fallbacks inteligentes locais em caso de indisponibilidade de rede.
- **Prevenção Ativa:** Sugestões contextuais automáticas durante o preenchimento de novas RNCs.

### 3. Multi-Tenancy e Governança Organizacional — Fase 7
- **Isolamento Completo por Organização:** Dados particionados em nível de coleção (`/organizations/{orgId}/...`).
- **Onboarding de Novos Clientes:** Assistente guiado para criação de organizações, parametrização de identidade visual e regras regulamentares.
- **Manual de Utilização e Governança Interativo:** Manual com 27 capítulos navegáveis e simuladores práticos acessível diretamente na interface.

### 4. Gestão de Auditorias Externas Recebidas — Fase 8
- **Registro de Auditorias:** Homologações e auditorias da ANAC, EASA, FAA, Clientes e Fabricantes.
- **Apontamentos e Constatações (Findings):** Acompanhamento de Não Conformidades, Observações e Oportunidades de Melhoria com geração direta de RNC vinculada.
- **Lições Aprendidas de Auditoria Externa:** Incorporação dos aprendizados no acervo de governança.

### 5. Pessoas, Competências & Qualificações Técnicas — Fase 9
- **Dossiê do Colaborador:** Registro de CHTs ANAC, carteiras técnicas, licenças e escopos de liberação técnica.
- **Cursos e Reciclagens Regulamentares:** Acompanhamento de SGSO, Fatores Humanos, EWIS, Legislação Aeronáutica, etc.
- **Central de Vencimentos & Gaps:** Alertas preditivos com cores de criticidade (Vencido, < 30 dias, < 60 dias).
- **Matriz de Competências:** Cruzamento entre requisitos de postos de trabalho e qualificações reais da equipe técnica.

### 6. Controle Documental, Revisões & Fontes Externas — Fase 10
- **Acervo de Documentos Controlados:** Manuais de Procedimentos (MOE/MGO), Manuais de Fabricante (AMM, CMM, SRM, IPC, WDM), Diretrizes e Procedimentos Internos.
- **Revisões Imutáveis:** Histórico inalterável com entrada em vigor formal, cancelamento e substituição atômica.
- **Consulta Temporal (Revisão Vigente na Data do Evento):** Permite determinar com precisão jurídica qual revisão de manual era mandatória na data exata de um evento ou intervenção passada.
- **Comparador de Revisões & Análise de Impacto:** Comparação textual de alterações e diagnóstico automático de impactos em RNCs abertas e processos.
- **Monitoramento de Fontes Oficiais:** Registro de fontes externas (ANAC, FAA, Boeing, Airbus, Embraer) com logs de verificação e checagem de vigência.
- **Solicitações Formais de Revisão a Clientes:** Gerador de e-mails técnicos trilíngues (PT, EN, ES) para confirmação de vigência documental perante clientes.
- **Evidências de Consulta Operacional:** Registro obrigatório para mecânicos e inspetores comprovarem leitura de manuais vigentes antes da execução de serviços.

---

## 🛠️ Tecnologias e Arquitetura

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Motion.
- **Backend / Servidor:** Node.js, Express, `server.ts` com middleware Vite integrado e roteamento de API seguro.
- **Banco de Dados & Autenticação:** Firebase Cloud Firestore & Firebase Auth com regras estritas de segurança (`firestore.rules`) por tenant.
- **Inteligência Artificial:** SDK `@google/genai` utilizando o modelo Gemini via backend para proteção das credenciais de API.

---

## ⚙️ Instalação e Execução

### Pré-requisitos
- Node.js 18+ ou Bun

### Configuração de Ambiente
Copie o arquivo de variáveis de exemplo e defina as credenciais necessárias:
```bash
cp .env.example .env
```

### Comandos Disponíveis

```bash
# Executar em modo desenvolvimento (Porta 3000)
npm run dev

# Checagem de tipagem estrita (TypeScript)
npm run lint

# Compilar para produção (Vite + esbuild CJS server)
npm run build

# Iniciar servidor de produção
npm run start
```

---

## 📖 Documentação na Aplicação

Além deste arquivo, o QualiGest SGQ possui um manual completo integrado ao sistema:
- Acesse o menu lateral **Manual de Utilização** no aplicativo para consultar os **27 capítulos técnicos de governança** e interagir com os simuladores de processo.
