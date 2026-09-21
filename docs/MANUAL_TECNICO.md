# QualiGest SGQ — Manual Técnico
## Arquitetura de Apresentação Gerencial, SSoT e Motor de Espelho (Fase 12.2)

### 1. Visão Geral da Arquitetura

Na Fase 12.2, a Apresentação Gerencial da Qualidade foi completamente desacoplada de renderizações parciais e cálculos dispersos, adotando o princípio arquitetural de **Única Fonte da Verdade (Single Source of Truth - SSoT)**.

```
[ Banco de Dados / Records Brutos ]
                │
                ▼
[ presentationSlidesData.ts ]  <--- Único Motor de Cálculo e DVOs
                │
         SlideApresentacao[]
         (com SlideGraficoDados)
                │
       ┌────────┴────────┐
       ▼                 ▼
[ SlideVisualRenderer ]  [ qualityPresentationBuilder ]
  (Visualizador Web)       (Exportador PPTX 16:9)
       │                 │
       └────────┬────────┘
                ▼
[ presentationConsistencyValidator.ts ]  <--- Teste de Espelho Web vs PPTX
```

---

### 2. Componentes Principais

#### 2.1. Motor Centralizado de Slides (`src/utils/presentationSlidesData.ts`)
- **Entrada:** Registros brutos (`NCRecord[]`, `ManualRecord[]`, `ConhecimentoValidadoItem[]`, `AuditoriaExternaRecord[]`, etc.).
- **Processamento:**
  - Aplica filtros de período de forma determinística.
  - Calcula indicadores consolidados (total, taxa de encerramento, eficácia, matriz de severidade).
  - Constrói o array imutável de 20 `SlideApresentacao`.
  - Injeta o objeto estruturado `SlideGraficoDados` (com itens de barras, fatias de pizza, células da matriz 5x5 e categorias 6M).
- **Tratamento de Dados Insuficientes (`semDados: true`):** Quando não há dados suficientes para compor um gráfico estatístico, o slide é explicitamente sinalizado com `semDados = true` e `graficoDados.tipo = 'nenhum'`, evitando números inventados ou vazios.

#### 2.2. Renderizador Visual Web (`src/components/presentation/SlideVisualRenderer.tsx`)
- Renderiza componentes Tailwind e Recharts orientados puramente aos dados contidos em `slide.graficoDados`.
- Não realiza cálculos estatísticos em tempo de renderização.
- Exibe cards de KPI, tabelas executivas, gráficos de barras/pizza, matriz térmica de risco e diagramas de arquitetura e evolução do SGQ.

#### 2.3. Construtor PPTX Nativo (`src/utils/qualityPresentationBuilder.ts`)
- Mapeia diretamente a estrutura `SlideApresentacao` para slides do PptxGenJS (formato Widescreen 16:9).
- Renderiza gráficos nativos (`pptx.ChartType.bar`, `pptx.ChartType.pie`) usando a mesma paleta de cores hexadecimais da Web.
- Aplica o algoritmo de **Auto-Fit Geométrico** travando o rodapé em `maxBottomY = 6.85"`, garantindo tolerância superior a 0.20" antes do rodapé padrão (7.05").

#### 2.4. Validador de Consistência & Teste de Espelho (`src/utils/presentationConsistencyValidator.ts`)
- **Regra de Ouro:**
  - Valida se os totais das tabelas batem com as somas das categorias dos gráficos.
  - Verifica ausência de valores `NaN`, `null` ou `undefined`.
  - Confirma se o Ishikawa totaliza 100% (ou 0 quando sem dados).
  - Testa se os slides marcados como `semDados` não possuem gráficos fantasmas.
  - Emite o `RelatorioTesteEspelho` consumido tanto pela UI no modal de certificação quanto nos scripts de homologação contínua.

---

### 3. Modelo de Tipagem (`src/types.ts`)

```typescript
export interface SlideGraficoDadoItem {
  rotulo: string;
  valor: number;
  cor?: string;
  subtitulo?: string;
  percentual?: number;
}

export interface SlideGraficoDados {
  tipo: 'barras' | 'pizza' | 'linhas' | 'matriz-5x5' | 'ishikawa-6m' | 'ecossistema' | 'regua-maturidade' | 'roadmap' | 'nenhum';
  titulo?: string;
  unidade?: string;
  itens: SlideGraficoDadoItem[];
  matriz5x5?: { contagem: Record<string, number>; totalCriticos: number; ... };
  ishikawa?: { metodo: number; maoDeObra: number; ...; total: number };
  serieTemporal?: Array<{ periodo: string; total: number; encerradas: number }>;
}

export interface SlideApresentacao {
  id: number;
  numero: number;
  titulo: string;
  subtitulo: string;
  categoria: string;
  bloco?: BlocoApresentacao;
  tipoVisualizacao?: TipoVisualizacaoSlide;
  metricasPrincipais: SlideMetricaItem[];
  pontosChave: string[];
  tabelaDados?: { colunas: string[]; linhas: (string | number)[][] };
  graficoDados?: SlideGraficoDados;
  semDados?: boolean;
  origemRastreabilidade: string;
}
```

---

### 4. Architecture Decision Records (ADRs) — Fase Corretiva & Homologação

#### ADR-014: Unificação da Matriz de Risco 5x5 como Single Source of Truth (SSoT)
* **Contexto:** Havia cálculo independente de células da Matriz 5x5 no Dashboard e na Apresentação PPTX, causando potenciais divergências de agrupamento e formatação visual das células.
* **Decisão:** Implementar a função canônica centralizada `consolidarRNCsPorMatrizRisco(records)` em `src/utils/qualityHelpers.ts`. O Dashboard e o motor de slides consomem obrigatoriamente essa mesma função. As células destacam a quantidade com badges em alto contraste e listagem nominal das RNCs por tooltip.
* **Impacto:** Eliminação total de divergências entre Web e PPTX, garantindo paridade cruzada perfeita no Teste de Espelho.

#### ADR-015: Governança Oficial de Status Operacional (`EM_TREINAMENTO`) e Separação de Aptidão
* **Contexto:** O status `EM_TREINAMENTO` era previsto em algumas telas mas não integrava o tipo oficial `StatusColaborador`, gerando inconsistências no cadastro e no importador.
* **Decisão:** 
  1. Incluir formalmente `EM_TREINAMENTO` no tipo canônico `StatusColaborador`.
  2. Implementar `normalizarStatusColaboradorCompleto()` no motor de importação com trilha de auditoria.
  3. Separar terminológica e funcionalmente **Status Operacional** (disponibilidade administrativa: `ATIVO`, `EM_TREINAMENTO`, `RESTRITO`, `SUSPENSO`, `AFASTADO`, `DESLIGADO`) de **Aptidão Operacional** (habilitação técnica para a tarefa: `APTO`, `APTO_COM_RESTRICAO`, `NAO_APTO`, `EM_AVALIACAO`).
  4. Adicionar no Dashboard a "Tabela Executiva de Efetivo por Status" e navegação interativa que filtra os técnicos ao clicar nos cards de status.
* **Impacto:** Clareza executiva imediata para a liderança e conformidade estrita com RBAC 145.

#### ADR-016: Geração Dinâmica de Slides e Paginação Adaptativa (Sem Limite Rígido de 20 Slides)
* **Contexto:** A apresentação gerencial estava artificialmente limitada a 20 slides, truncando dados de colaboradores, RNCs e ações quando o volume de dados da organização crescia.
* **Decisão:** 
  1. Remover o teto de 20 slides; a quantidade de slides agora é calculada dinamicamente conforme o volume de dados.
  2. Utilizar `particionarArray()` para dividir colaboradores nominais (máx 6 por slide), RNCs e ações 5W2H em slides subsequentes numerados sequencialmente.
  3. Refatorar o construtor PPTX e o visualizador Web para mapear blocos e números dinamicamente sem suposições estáticas.
* **Impacto:** Escalabilidade para organizações com grande efetivo sem espremer conteúdo ou violar a Safe Area de 16:9.

