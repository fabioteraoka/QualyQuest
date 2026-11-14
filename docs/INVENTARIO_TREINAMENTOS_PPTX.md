# Inventário Oficial de Arquivos PPTX e Catálogo de Treinamentos — QualyQuest SGQ & Rooster MRO

> **Escopo da inspeção:** Varredura integral do repositório (excluindo `node_modules/`, `.git/` e artefatos de build em `dist/`).  
> **Regra de integridade:** Nenhuma informação de autoria, curso ou validade foi inferida ou inventada; metadados ausentes nos arquivos binários constam explicitamente como **"Não identificado"**. Nenhum arquivo `.pptx` foi removido ou alterado.

---

## 1. Sumário Executivo da Inspeção

| Indicador | Resultado Verificado |
| :--- | :--- |
| Arquivos `.pptx` no código-fonte / docs / raiz | **7 arquivos** (0 arquivos `.ppt` legados) |
| Cópia derivada de build detectada | 1 cópia em `dist/Apresentacao_Gerencial_QualyQuest_Rooster.pptx` (cópia de `public/` gerada por `vite build`) |
| Pares idênticos (duplicidade binária SHA-256) | **1 par idêntico:** `docs/Apresentacao_Gerencial_QualyQuest_Rooster.pptx` e `public/Apresentacao_Gerencial_QualyQuest_Rooster.pptx` (`sha256: c11f2a043a48b86c...`) |
| Natureza real de todos os `.pptx` encontrados | **Apresentações gerenciais do SGQ geradas via `PptxGenJS`** (não são apostilas ou decks técnicos de cursos aeronáuticos de mecânicos) |
| Catálogo real de cursos técnicos de manutenção | Mantido em código-fonte estruturado (`src/data/initialCompetenciesData.ts` e coleção `trainingCourses` / `roster_cursos_catalogo` no Firestore) |

---

## 2. Inventário Detalhado dos Arquivos `.pptx`

### 2.1 Tabela Consolidada

| # | Caminho no Repositório | Tamanho | SHA-256 (prefixo 16) | Slides / Notas | Criação (XML `core.xml`) | Autor / Criador Real (`core.xml`) | Categoria / Finalidade Verificada | Duplicidade / Versionamento |
| :-: | :--- | ---: | :--- | :-: | :--- | :--- | :--- | :--- |
| 1 | `docs/Apresentacao_Gerencial_QualyQuest_Rooster.pptx` | 3.743.854 B | `c11f2a043a48b86c` | 25 / 25 | `2026-11-03T08:14:43Z` | Criador técnico: `PptxGenJS`<br>Autor humano: **Não identificado** | Apresentação Gerencial Oficial da Qualidade (70% Situação Real SGQ / 30% Evolução Sistêmica) — QualyQuest / Rooster SGQ • IMPACTO Aviation | **Idêntico ao #2 (`public/...`)**. Versão mais recente do deck gerencial |
| 2 | `public/Apresentacao_Gerencial_QualyQuest_Rooster.pptx` | 3.743.854 B | `c11f2a043a48b86c` | 25 / 25 | `2026-11-03T08:14:43Z` | Criador técnico: `PptxGenJS`<br>Autor humano: **Não identificado** | Cópia pública servida estaticamente para download direto no cliente Web (refletida em `dist/` no build) | **Duplicidade exata do #1** (preservada por ser asset estático servido em `/Apresentacao_Gerencial_QualyQuest_Rooster.pptx`) |
| 3 | `pptx_1_normal.pptx` | 1.995.688 B | `eb5c9575b8e57184` | 24 / 24 (notas vazias) | `2026-10-16T09:19:40Z` | Criador técnico: `PptxGenJS`<br>Autor humano: **Não identificado** | Artefato de teste de regressão de layout PPTX Auto-Fit (`QualiGest SGQ`): cenário **dados normais** | Versão anterior (out/2026) do motor de geração PPTX (`QUALIGEST SGQ`), lote de teste #1 |
| 4 | `pptx_2_long_texts.pptx` | 2.035.514 B | `ac91322d44970d0d` | 24 / 24 (notas vazias) | `2026-10-16T09:19:40Z` | Criador técnico: `PptxGenJS`<br>Autor humano: **Não identificado** | Artefato de teste de regressão de layout PPTX Auto-Fit: cenário **textos longos** | Lote de teste out/2026 #2 (diferenciação apenas no payload de estresse de texto) |
| 5 | `pptx_3_many_rows.pptx` | 1.983.550 B | `a5af13a916c69953` | 24 / 24 (notas vazias) | `2026-10-16T09:19:40Z` | Criador técnico: `PptxGenJS`<br>Autor humano: **Não identificado** | Artefato de teste de regressão de layout PPTX Auto-Fit: cenário **muitas linhas tabulares** | Lote de teste out/2026 #3 (diferenciação no payload tabular) |
| 6 | `pptx_4_many_rncs.pptx` | 3.052.641 B | `09233dee5840f0a0` | 37 / 37 (notas vazias) | `2026-10-16T09:19:40Z` | Criador técnico: `PptxGenJS`<br>Autor humano: **Não identificado** | Artefato de teste de regressão de layout PPTX Auto-Fit: cenário **alto volume de RNCs com paginação automática** (+13 slides) | Lote de teste out/2026 #4 |
| 7 | `pptx_5_empty_data.pptx` | 1.951.625 B | `27f778bb4baf6542` | 23 / 23 (notas vazias) | `2026-10-16T09:19:40Z` | Criador técnico: `PptxGenJS`<br>Autor humano: **Não identificado** | Artefato de teste de regressão de layout PPTX Auto-Fit: cenário **base vazia / zero registros** | Lote de teste out/2026 #5 |

> **Observação sobre campos ausentes nos PPTX:** Em todos os 7 arquivos, `docProps/core.xml` registra exclusivamente `title: PptxGenJS Presentation`, `subject: PptxGenJS Presentation`, `creator: PptxGenJS`, `lastModifiedBy: PptxGenJS`. Público-alvo formal, carga horária, código de curso e instrutor **não estão declarados** nos metadados dos arquivos (classificados como **Não identificado**). O script gerador oficial associado encontra-se em `scripts/generate_official_pptx.ts`.

---

## 3. Conteúdo Verificado Slide a Slide (`Apresentacao_Gerencial_QualyQuest_Rooster.pptx`)

Abaixo está o mapeamento real extraído dos XMLs (`ppt/slides/slide1.xml` a `slide25.xml` e respectivas `notesSlides`) da apresentação mais recente (`2026-11-03`):

| Slide | Categoria / Seção (Extraída) | Título e Tema Real do Slide | Notas do Apresentador |
| :-: | :--- | :--- | :--- |
| 01 | Capa | **QualyQuest / Rooster SGQ • IMPACTO Aviation — Apresentação Gerencial da Qualidade** | Índice numérico `1` |
| 02 | Visão Executiva | Visão Geral do SGQ (Macro-Indicadores) | Índice numérico `2` |
| 03 | Processo Operacional | Panorama e Funil de RNCs (Fluxo F 001-29) | Índice numérico `3` |
| 04 | Distribuição Operacional | Distribuição de RNCs por Setor Operacional | Índice numérico `4` |
| 05 | Casos Críticos | RNCs Críticas e Pendências Relevantes | Índice numérico `5` |
| 06 | Segurança Operacional | Gestão de Riscos & Matriz Aeronáutica 5x5 | Índice numérico `6` |
| 07 | Segurança Operacional | Matriz 5x5 — Detalhamento de Desvios Críticos e Altos | Índice numérico `7` |
| 08 | Análise Causal | Investigação de Causas Raízes (Ishikawa 6M) | Índice numérico `8` |
| 09 | Ações Corretivas | Planos de Ação Corretiva (5W2H) & Pontualidade | Índice numérico `9` |
| 10 | Ações Corretivas | Planos de Ação 5W2H — Detalhamento (Parte 2 de 2) | Índice numérico `10` |
| 11 | Eficácia da Qualidade | Eficácia das Ações & Bloqueio de Reincidência | Índice numérico `11` |
| 12 | Competências & Efetivo | Pessoas, Competências & Status Operacional | Índice numérico `12` |
| 13 | Competências & Efetivo | Distribuição do Efetivo por Especialidade & Prontidão | Índice numérico `13` |
| 14 | Competências Técnicas | Vigência de Treinamentos e CHTs | Índice numérico `14` |
| 15 | Controle Documental | Governança Documental e Manuais Regulatórios | Índice numérico `15` |
| 16 | Metrologia & Ferramental | Gestão Metrológica, Ferramental & Conta de Créditos | Índice numérico `16` |
| 17 | Auditorias Externas | Auditorias da Qualidade & Constatações (ANAC, EASA, FAA, Clientes) | Índice numérico `17` |
| 18 | Atenção Imediata | Principais Pontos de Atenção & Fatores Críticos | Índice numérico `18` |
| 19 | Plano de Resposta | Matriz de Priorização Imediata & Decisões | Índice numérico `19` |
| 20 | Ecossistema & Integração | O Ecossistema Integrado do QualyQuest SGQ | Índice numérico `20` |
| 21 | Maturidade do SGQ | Régua Oficial de Maturidade do SGQ (Níveis 1 a 5) | Índice numérico `21` |
| 22 | Status Sistêmico | Funcionalidades e Status de Homologação | Índice numérico `22` |
| 23 | Roadmap Estratégico | Roadmap Estratégico do QualyQuest / Rooster | Índice numérico `23` |
| 24 | Conclusão & Diretrizes | Conclusão Executiva e Diretrizes da Qualidade | Índice numérico `24` |
| 25 | Auditoria & Metadados | Fonte dos Dados e Rastreabilidade do Relatório | Índice numérico `25` |

> Os arquivos `pptx_1_normal.pptx` a `pptx_5_empty_data.pptx` compartilham a estrutura de slides 1 a 23/24 (e 37 no cenário `many_rncs` por quebra automática de tabelas), gerados em `2026-10-16` sob o título anterior `QUALIGEST SGQ` e com notas de slides vazias.

---

## 4. Relação com o Catálogo Real de Cursos & Treinamentos (Rooster MRO)

Embora o repositório **não contenha** arquivos `.pptx` de apostilas ou aulas técnicas de manutenção aeronáutica, o módulo **Rooster MRO** mantém o catálogo estruturado de cursos obrigatórios em `src/data/initialCompetenciesData.ts` (`INITIAL_TRAINING_COURSES`) e nas coleções `trainingCourses` / `roster_cursos_catalogo`.

| Código | Título do Curso | Tipo / Modalidade | Carga Horária | Recorrência / Validade | Frota / Escopo | Material PPTX no Repo |
| :--- | :--- | :--- | :---: | :---: | :--- | :---: |
| `TRN-EWIS-01` | EWIS — Electrical Wiring Interconnection System (Grupos 1 e 2) | Regulatório / Presencial | 16h | 24 meses (tol. 30d) | Geral RBAC 145 | Não existe PPTX no repo |
| `TRN-FTS-02` | FTS Fase 2 — Fuel Tank Safety (RBAC 145 / SFAR 88) | Regulatório / Híbrido | 8h | 24 meses (tol. 30d) | Geral RBAC 145 | Não existe PPTX no repo |
| `TRN-HF-01` | Fatores Humanos em Manutenção Aeronáutica (The Dirty Dozen) | Qualidade / Presencial | 12h | 24 meses (tol. 60d) | Geral SGQ | Não existe PPTX no repo |
| `TRN-SUP-01` | Recebimento de Materiais e Prevenção de Peças Suspeitas (SUPs) | Regulatório / Presencial | 8h | 12 meses (tol. 30d) | Suprimentos / MOMQ | Não existe PPTX no repo |
| `TRN-TORQ-01` | Técnicas de Torqueamento e Frenagem (AC 43.13-1B) | Prático / On-the-Job | 6h | 12 meses (tol. 15d) | Manutenção / Metrologia | Não existe PPTX no repo |
| `TRN-NDT-PT` | Ensaio por Líquido Penetrante Aeronáutico | Aeronáutico / Presencial | 40h | 36 meses (tol. 30d) | NDT (ASTM E1417) | Não existe PPTX no repo |
| `TRN-A320-FAM-01` | Airbus A320 — Familiarização (Nível 1) | Fabricante / Presencial | 40h | Sem vencimento (`recorrente: false`) | A320 (CFM56 / LEAP-1A) | Não existe PPTX no repo |
| `TRN-A320-RAMP-02` | Airbus A320 — Ramp & Transit (Nível 2) | Aeronáutico / Híbrido | 60h | 24 meses (tol. 30d) | A320 (CFM56 / LEAP-1A) | Não existe PPTX no repo |
| `TRN-A320-MAINT-03` | Airbus A320 — Line & Base Maintenance (Nível 3) | Aeronáutico / Presencial | 120h | 24 meses (tol. 30d) | A320 (CFM56 / LEAP-1A) | Não existe PPTX no repo |
| `TRN-A330-FAM-01` | Airbus A330 — Familiarização (Nível 1) | Fabricante / Presencial | 40h | Sem vencimento (`recorrente: false`) | A330 (Trent 700 / CF6) | Não existe PPTX no repo |
| `TRN-B737-FAM-01` | Boeing 737 — Familiarização (Nível 1) | Fabricante / Presencial | 40h | Sem vencimento (`recorrente: false`) | B737 (CFM56-7B) | Não existe PPTX no repo |
| `TRN-B737-RAMP-02` | Boeing 737 — Ramp & Transit (Nível 2) | Aeronáutico / Híbrido | 60h | 24 meses (tol. 30d) | B737 (CFM56-7B) | Não existe PPTX no repo |
| `TRN-B737-MAINT-03` | Boeing 737 — Line & Base Maintenance (Nível 3) | Aeronáutico / Presencial | 120h | 24 meses (tol. 30d) | B737 (CFM56-7B) | Não existe PPTX no repo |
| `TRN-B777-FAM-01` | Boeing 777 — Familiarização (Nível 1) | Fabricante / Presencial | 40h | Sem vencimento (`recorrente: false`) | B777 (GE90 / Trent 800) | Não existe PPTX no repo |
| `TRN-ATR-RAMP-02` | ATR 42/72 — Ramp & Transit (Nível 2) | Aeronáutico / Híbrido | 50h | 24 meses (tol. 30d) | ATR 42/72 (PW127) | Não existe PPTX no repo |

### Síntese das Lacunas Identificadas sobre Treinamentos em PPTX

1. **Ausência de decks instrucionais técnicos:** Os 7 arquivos `.pptx` existentes cobrem exclusivamente relatórios gerenciais do SGQ (slides 12–14 do deck oficial exibem indicadores executivos de efetivo, especialidades e vigência de treinamentos/CHTs, mas não constituem material didático de curso).
2. **Duplicação física controlada:** `docs/Apresentacao_Gerencial_QualyQuest_Rooster.pptx` e `public/Apresentacao_Gerencial_QualyQuest_Rooster.pptx` têm conteúdo binário idêntico; os cinco arquivos `pptx_1_*` a `pptx_5_*` na raiz são snapshots de teste gerados em 16/10/2026.
3. **Recomendação operacional:** Caso a IMPACTO deseje anexar apostilas ou apresentações didáticas dos cursos (`TRN-*`) ao sistema, recomenda-se armazená-las via módulo de Controle Documental ou Evidence Storage referenciado por `cursoId`, evitando versionamento binário duplicado na raiz do repositório.
