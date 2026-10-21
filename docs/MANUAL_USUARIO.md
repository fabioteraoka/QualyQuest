# QualiGest SGQ — Manual Oficial do Usuário
## Sistema Integrado de Gestão e Garantia da Qualidade Aeronáutica (RBAC 145 / EASA Part-145)

---

## 📋 1. Visão Geral e Propósito

O **QualiGest SGQ** é uma plataforma corporativa especializada concebida para atender aos rigores de conformidade, segurança de voo e governança de centros de manutenção aeronáutica (MRO), operadores aéreos e oficinas homologadas sob os regulamentos **ANAC RBAC 145**, **EASA Part-145**, **FAA Part 145** e **ISO 9001:2015**.

O sistema atua como a **Única Fonte da Verdade (Single Source of Truth - SSoT)** da organização, eliminando planilhas isoladas e integrando em tempo real todas as 15 fases operacionais da qualidade.

---

## 🧭 2. Estrutura dos 35 Capítulos do Manual Integrado

O QualiGest possui 35 capítulos técnicos incorporados diretamente na aplicação (menu **"Manual de Utilização"**):

### Bloco I: Fundamentos & Acesso
- **Capítulo 1:** Apresentação do QualiGest SGQ (Escopo aeronáutico e visão geral).
- **Capítulo 2:** Primeiro Acesso e Associação de Organização (Tenant multi-organização).
- **Capítulo 3:** Perfis de Usuário e Segregação RBAC (ADMIN, GESTOR_SGQ, AUDITOR, CONSULTA).
- **Capítulo 4:** Nova Arquitetura de Navegação em 8 Blocos Operacionais.

### Bloco II: Gestão de Não Conformidades (RNC F 001-29)
- **Capítulo 5:** Dashboard Executivo e Indicadores Operacionais.
- **Capítulo 6:** Fluxo de Vida Completo da RNC F 001-29 (Abertura, Investigação, Eficácia, Encerramento).
- **Capítulo 7:** Bloco 1 — Identificação da Ocorrência e Registro de Entrada.
- **Capítulo 8:** Bloco 2 — Descrição do Desvio e Evidências Objetivas.
- **Capítulo 9:** Bloco 3 — Ação de Contenção Imediata (Mitigação em até 24/48 horas).
- **Capítulo 10:** Bloco 4 & 8 — Matriz de Risco Aeronáutico 5x5 (Doc 9859 OACI).
- **Capítulo 11:** Bloco 5 — Análise de Causa Raiz (Diagrama de Ishikawa 6M + 5 Porquês Encadeados).
- **Capítulo 12:** Bloco 6 — Requisitos Normativos Aplicáveis (RBAC 145, MOMQ, MOE, Diretrizes).
- **Capítulo 13:** Bloco 7 — Plano de Ação Corretiva e Preventiva (CAPA 5W2H).
- **Capítulo 14:** Bloco 9 — Acompanhamento e SLAs da Organização.
- **Capítulo 15:** Bloco 10 — Verificação de Eficácia e Critérios de Reabertura.
- **Capítulo 16:** Bloco 11 — Encerramento Formal e Assinatura Eletrônica Homologada.
- **Capítulo 17:** Central de Alertas e Prazos Críticos (Alertas preditivos aos 60, 30 e 15 dias).

### Bloco III: Documentação, Conhecimento & IA
- **Capítulo 18:** Biblioteca de Manuais e Extração Automatizada com IA Gemini.
- **Capítulo 19:** Comparação Semântica de RNCs e Prevenção de Reincidência.
- **Capítulo 20:** Base de Conhecimento Corporativa e Maturação N1 a N5.
- **Capítulo 21:** Gerador de Apresentação Gerencial Oficial 70/30 (Web & PPTX Widescreen).
- **Capítulo 22:** Conheça o QualiGest (Tour Funcional Interativo).
- **Capítulo 23:** Arquitetura do Sistema e Fluxo de Dados SSoT.

### Bloco IV: Administração & Segurança
- **Capítulo 24:** Administração da Organização (Tenant) e Identidade Visual Aeronáutica.
- **Capítulo 25:** Segurança, Privacidade e Isolamento de Dados no Cloud Firestore.
- **Capítulo 26:** Perguntas Frequentes (FAQ Operacional do MRO).
- **Capítulo 27:** Solução de Problemas e Diagnóstico da Infraestrutura.

### Bloco V: Módulos Avançados (Fases 12 a 15)
- **Capítulo 28:** Visão Mestre, Arquitetura e Roadmap Estratégico (Fase 12).
- **Capítulo 29:** Auditorias, Requisitos e Controles de Clientes (Fase 13 - Princípio "Um Controle, Vários Requisitos").
- **Capítulo 30:** Gestão Consolidada de Pessoas, Competências 360° e Governança Operacional (Fase 9).
- **Capítulo 31:** Auditoria Inteligente por Requisitos com Resolução por Exceção (Fase 13 Avançada / Checklist Kalitta QA-14).
- **Capítulo 32:** System Designer Permanente & Registro Oficial de ADRs (Fase 14).
- **Capítulo 33:** Motor de Importação Inteligente & Reconciliação com Reversão Undo (Fase 15).
- **Capítulo 34:** Conectores e API de Integração MRO (Impacto MRO Connect `/api/impacto/*`).
- **Capítulo 35:** Visão de Futuro & Horizontes de Evolução Tecnológica (Roadmap Estratégico H1 a H4).

---

## 🎯 3. Guia Rápido dos Módulos Principais

### 3.1. Emissão e Tratamento de RNC (F 001-29)
1. Clique em **"+ Nova Não Conformidade"** no menu principal.
2. Preencha a descrição objetiva do desvio ou utilize o **Extrator IA** para carregar um arquivo Word/PDF.
3. Classifique a severidade e probabilidade na **Matriz 5x5**.
4. Defina a ação de contenção imediata (responsável e prazo).
5. Conduza os **5 Porquês** e preencha as 6 dimensões do **Ishikawa 6M**.
6. Cadastre o plano de ação **5W2H**.
7. Após o prazo de maturação, valide a **eficácia documental/prática** antes do encerramento formal.

### 3.2. Auditoria por Requisitos de Clientes com Resolução por Exceção (Fase 13)
- Acesse **Auditorias & Clientes** > **Auditoria Inteligente**.
- Selecione o checklist (ex: **Kalitta Air QA-14**).
- Navegue pelas seções operacionais na árvore lateral.
- Para itens conformes, confirme a seção em lote (**Resolução por Exceção**).
- Para desvios pontuais, clique em **"Não Conforme"** para abrir e vincular diretamente a RNC F 001-29 com o requisito auditado.

### 3.3. Dossiê de Pessoas e Central de Vencimentos CHT (Fase 9)
- Consulte o quadro de colaboradores filtrando por especialidade (**CEL**, **GMP**, **AVI**) e status operacional.
- O sistema bloqueia preventivamente assinaturas técnicas no caso de CHT ou treinamentos mandatórios vencidos (ex: Fatores Humanos bienal, SGSO).

### 3.4. Controle Documental, Revisões & Motor de Conhecimento Temporal (Fase 10)

O módulo **Controle Documental & Revisões** gerencia todo o acervo técnico regulatório da organização (manuais de fabricantes OEM, normas de autoridades ANAC/FAA/EASA, procedimentos internos MOMQ/POPs e especificações de clientes).

#### 📍 Onde Encontrar a Edição do Documento e Revisão
1. No menu principal lateral, acesse **Documentação & SGQ** > **Controle Documental & Revisões**.
2. Na sub-aba **Acervo & Biblioteca Técnica (F 001-02-1)**:
   - Cada card de documento controlado possui o botão **"Editar"** (com ícone de lápis azul).
   - Ao clicar em **"Linha do Tempo"** ou no card para abrir os detalhes, o cabeçalho superior direito exibe o botão **"Editar Documento & Revisão"**.
   - Na sub-aba **Conhecimento Temporal**, ao consultar um manual, o painel do resultado disponibiliza o atalho rápido **"Editar Metadados & Revisão Vigente"**.

#### 📝 Como Cadastrar e Editar a Revisão Atual
1. Ao acionar o botão de edição, o modal **Editar Documento Controlado & Revisão** é aberto.
2. Na **Seção 1 (Identificação Geral)**, confira o título, categoria, emissor, **Proprietário do Documento** (órgão/empresa responsável pela governança) e **Assessor do Documento** (técnico responsável pela análise documental).
3. Na **Seção 2 (Revisão Vigente & Vigência Temporal)**, preencha os campos obrigatórios conectados diretamente ao banco de dados:
   - **Número da Revisão Vigente:** código oficial da revisão atual (ex: `Rev. 08`, `Emenda 09`, `Rev. 107`).
   - **Data da Revisão:** data formal de publicação/emissão informada pelo fabricante ou autoridade.
   - **Data de Início da Vigência:** data exata a partir da qual a revisão passou a ser legalmente e tecnicamente mandatória para as manutenções no MRO.
   - **Data de Aprovação Técnica:** data de aprovação/homologação interna da revisão pela Garantia da Qualidade SGQ.
   - **Data Prevista para Próxima Revisão:** prazo regulamentar para revalidação periódica.
4. Clique em **"Salvar Documento & Revisão"**.
   - **Documento sem histórico anterior:** O sistema cria atomicamente o primeiro registro de `RevisaoDocumental` com status `VIGENTE`, garantindo que o documento imediatamente passe a responder às consultas do Motor de Conhecimento Temporal.
   - **Documento com histórico existente:** Se a revisão for a mesma em vigor, as datas e número são sincronizados com precisão. Caso seja necessária uma transição para uma nova revisão, o sistema preserva a anterior intacta com suas datas de início e fim de vigência, evitando criação de revisões duplicadas ou apagamento silencioso do passado.

#### 📅 Como Registrar a Data de Vigência
- A data de início da vigência (`dataVigencia`) é independente da data de emissão (`dataRevisao`):
  - **Data da Revisão:** quando a autoridade/OEM emitiu o documento.
  - **Início da Vigência:** quando a empresa incorporou ou passou a ser obrigada a seguir a norma.
- *Atenção:* O QualiGest nunca substitui silenciosamente datas de revisão ou vigência por datas de upload do arquivo ou criação de registros no sistema.

#### 🔍 Como Consultar o Histórico Cronológico
1. No card do documento no Acervo, clique em **"Linha do Tempo"** (ou no botão do modal de detalhes).
2. O histórico exibe a árvore cronológica de revisões:
   - A revisão em vigor é sinalizada com badge verde **`VIGENTE`** e ícone de nó ativo.
   - Revisões anteriores exibem badge cinza **`SUBSTITUIDO`**, acompanhadas da data em que foram substituídas e a referência expressa da revisão sucessora.
   - É possível inspecionar o escopo de alterações de cada época, o responsável pela homologação e baixar a via do arquivo correspondente àquela versão histórica.

#### ⏳ Como Interpretar uma Consulta Temporal sem Dados Suficientes
Na sub-aba **Conhecimento Temporal**, ao selecionar um documento e a data em que uma Ordem de Serviço (OS) ou evento ocorreu no passado:
1. **Resultado `DETERMINADO` (Revisão Vigente Identificada):** O sistema aponta matematicamente qual revisão (mesmo substituída hoje) era a única aplicável no dia do evento, gerando o parecer formal de defesa para auditorias ANAC/EASA.
2. **Resultado `Dados Insuficientes no Histórico Temporal`:** Significa que o documento ainda não possui revisões registradas na linha do tempo imutável com datas de vigência formalizadas.
   - **Ação:** O painel disponibiliza os botões **"Cadastrar Revisão no Histórico"** e **"Editar Metadados & Revisão Vigente"** para sanar imediatamente a pendência cadastral.
3. **Resultado `Data Anterior à Primeira Revisão Controlada` (`DOCUMENTO_NAO_EXISTIA_NA_DATA`):** O evento ocorreu antes da entrada em vigor da revisão mais antiga conhecida do manual. O sistema atesta para os auditores que na referida data o manual não existia formalmente na organização.

### 3.5. Importação Inteligente de Dados com Reconciliação (Fase 15)
- Acesse **Recursos & Controles** > **Importação Inteligente**.
- **Etapa 1:** Carregue uma planilha `.xlsx` ou `.csv`. O sistema detecta o tipo de dado.
- **Etapa 2:** O Copilot Gemini mapeia automaticamente as colunas da planilha para o esquema do Firestore.
- **Etapa 3:** Analise o diff visual: itens novos (verde), modificados (azul) ou inalterados (cinza).
- **Etapa 4:** Execute a carga com a segurança de poder **Desfazer (Undo)** a qualquer momento pelo histórico.

### 3.6. Módulo Rooster MRO Integrado (Gestão Operacional de Mecânicos & Frotas)
O módulo **Rooster MRO** opera integrado ao QualiGest sem cadastros paralelos, com **Fonte Única de Verdade (Single Source of Truth)** no Cloud Firestore:
1. **Pessoas e Mecânicos Compartilhados:** A tela de Pessoas do Rooster consulta diretamente o cadastro de colaboradores do QualiGest (`organizations/{orgId}/persons`). Alterações autorizadas (nome, base, CANAC, categoria) refletem instantaneamente em ambos os módulos.
2. **Preservação Integral de Metadados:** Edições realizadas pela interface do Rooster preservam 100% dos dados técnicos do SGQ (datas de admissão, cargo operacional, observações, restrições e ramais corporativos).
3. **Catálogo Canônico de Cursos:** Cursos de Doutrinação e Treinamentos de Frotas são centralizados em `trainingCourses`. O Rooster consome essa relação oficial com controle de periodicidade e vigência automática.
4. **Ficha do Mecânico & Roster Operacional:** Permite auditar instantaneamente as habilitações (CHT/CCT/AMP), certificados de cursos concluídos, matriz de competências por aeronave (Boeing, Airbus, Embraer, ATR) e motores (CFM, GE, IAE, PW, RR).
5. **Lançamentos Individuais e em Lote:** Permite registrar turmas inteiras de treinamento de uma só vez, com persistência confirmada no Firestore e encadeamento de histórico em renovações.
6. **Reconciliação com Confirmação Real:** O botão "Reconciliar com Firestore" efetua a verificação em lote com retorno de status real e notificações de persistência.

---

## 📊 4. Apresentação Gerencial 70/30 (Web & PPTX)
- Proporção executiva: **70% Espelho Real da Empresa (Slides 1 a 14)** e **30% Evolução do Sistema (Slides 15 a 20)**.
- Navegação por teclado: setas `←` e `→` para transitar, `Espaço` para avançar, `Home`/`End` para início e fim.
- Exportação instantânea em **PowerPoint (.pptx)** widescreen 16:9 com auto-fit geométrico e **Teste de Espelho** certificado.

---

## 🔮 5. Horizontes de Evolução Tecnológica (Roadmap)
- **H1 (Core Consolidado):** Fases 1 a 15 ativas em produção.
- **H2 (Conectores MRO & ERPs):** Integrações ampliadas com SAP, Totvs, Quantum e Diário de Bordo Eletrônico.
- **H3 (SGQ Preditivo):** Confiabilidade ATA 100 e predição de falhas em frotas.
- **H4 (Ecossistema Global):** Rede inter-oficinas de lições aprendidas e benchmarking regulatório anonimizado.
