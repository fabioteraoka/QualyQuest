# Integração QualyQuest ↔ Impacto Aviation MRO

Este documento descreve a primeira integração oficial entre o **QualyQuest (Sistema de Gestão da Qualidade - SGQ)** e o **Impacto Aviation MRO (Sistema Oficial de Manutenção e Registros Técnicos Aeronáuticos)**.

---

## 1. Princípios Arquiteturais e Fronteiras

1. **Separação de Responsabilidades:**
   - **Impacto Aviation MRO:** Fonte externa oficial dos dados de manutenção (Bases, Técnicos, Habilitações CHT, Treinamentos, Ferramentas Calibradas, Ordens de Serviço).
   - **QualyQuest:** Fonte oficial dos registros de qualidade, conformidade, auditorias, investigações e RNCs (Relatórios de Não Conformidade).
2. **Somente Leitura:** Todas as integrações com o Impacto operam em modo **estritamente leitura (HTTP GET)**. Nenhuma operação de escrita, modificação ou exclusão é executada no Impacto Aviation MRO.
3. **Sem Duplicação de Entidades:** O QualyQuest não duplica ordens de serviço, técnicos ou ferramentas no seu banco de dados. Ele armazena apenas **IDs estáveis de referência** (`ordemServicoId`, `tecnicoId`, `baseId`).
4. **Resiliência e Continuidade Operacional:** Caso a API do Impacto esteja inacessível ou não configurada, o QualyQuest continua funcionando integralmente com os dados locais e de contingência já existentes.

---

## 2. Variáveis de Ambiente

Configuradas via `.env` (exemplo documentado em `.env.example`):

```bash
# IMPACTO_MRO_API_URL: URL base da API oficial de integração do Impacto Aviation MRO
IMPACTO_MRO_API_URL="https://mro.impactoaviation.com.br/api"

# IMPACTO_MRO_API_KEY: Token/Chave de autenticação da integração
IMPACTO_MRO_API_KEY="sua_chave_de_integracao_aqui"
```

> **Segurança:** O frontend consome rotas proxy server-side (`/api/impacto/*`), garantindo que o token `IMPACTO_MRO_API_KEY` jamais seja exposto no navegador e prevenindo problemas de CORS.

---

## 3. Endpoints da Integração (Somente Leitura)

| Recurso | Endpoint QualyQuest | Endpoint Impacto Aviation MRO | Descrição |
| :--- | :--- | :--- | :--- |
| **Status / Conectividade** | `GET /api/impacto/status` | `GET /status` | Verifica a integridade da comunicação e tempo de resposta. |
| **Bases Operacionais** | `GET /api/impacto/bases` | `GET /bases` | Lista as bases de manutenção ativas (ex: VCP, SDU, BSB). |
| **Técnicos & Inspetores** | `GET /api/impacto/tecnicos` | `GET /tecnicos` | Consulta equipe técnica, CHTs e validade das habilitações. |
| **Técnico Específico** | `GET /api/impacto/tecnicos/:id` | `GET /tecnicos/:id` | Detalhes do profissional pelo ID estável. |
| **Qualificações** | `GET /api/impacto/qualificacoes` | `GET /qualificacoes` | Habilitações de tipo de aeronave/motor (E195-E2, B737, etc.). |
| **Treinamentos** | `GET /api/impacto/treinamentos` | `GET /treinamentos` | Treinamentos mandatórios (HF, EWIS, FTS Fase 2). |
| **Ferramentas Calibradas** | `GET /api/impacto/ferramentas` | `GET /ferramentas` | Consulta ferramentas e status metrológico aferido. |
| **Ferramenta Específica** | `GET /api/impacto/ferramentas/:id` | `GET /ferramentas/:id` | Detalhes de instrumento pelo código ou ID estável. |
| **Ordens de Serviço (OS)** | `GET /api/impacto/ordens-servico` | `GET /ordens-servico` | Consulta de OS por aeronave, base, status ou busca textual. |
| **OS Específica** | `GET /api/impacto/ordens-servico/:id` | `GET /ordens-servico/:id` | Dados de cabeçalho da OS. |
| **Contexto Completo da OS** | `GET /api/impacto/ordens-servico/:id/contexto-qualidade` | `GET /ordens-servico/:id/contexto-qualidade` | Dossiê completo: aeronave, base, equipe técnica, ferramentas usadas, peças com Form 1 e alertas de desvio. |

---

## 4. Modelo de Vinculação QualyQuest ↔ Impacto

O vínculo é armazenado na propriedade `origemImpactoMro` do registro de RNC (`NCRecord`):

```typescript
export interface VinculoImpactoMro {
  origem: 'Impacto Aviation MRO'; // Exibição explícita da procedência
  ordemServicoId: string;         // ID estável da OS no Impacto (ex: 'os_imp_2026_0982')
  numeroOS: string;               // Código legível da OS (ex: 'OS-2026-0982')
  tituloOS?: string;              // Título ou escopo resumido da OS
  prefixoAeronave?: string;       // Prefixo da aeronave (ex: 'PR-AZL')
  modeloAeronave?: string;        // Modelo (ex: 'Embraer E195-E2')
  tipoManutencao?: string;        // Ex: 'Check C', 'AOG'
  baseId?: string;                // ID estável da base (ex: 'base_vcp')
  baseNome?: string;              // Nome da base (ex: 'Viracopos - Hangar 1')
  tecnicoId?: string;             // ID estável do técnico responsável (ex: 'tec_imp_001')
  tecnicoNome?: string;           // Nome do técnico
  tecnicoCht?: string;            // CHT do técnico
  dataAberturaOS?: string;        // Data de abertura
  statusOS?: string;              // Status da OS no MRO
  urlNavegavel?: string;          // Link direto no sistema do Impacto MRO
  dataVinculo: string;            // Timestamp ISO de criação do vínculo
  vinculadoPor?: string;          // Auditor que vinculou
}
```

---

## 5. Exemplo de Uso Prático

### 5.1. No Cliente TypeScript (`src/services/impactoMroApi.ts`)
```typescript
import { impactoMroApi } from './services/impactoMroApi';

// 1. Consultar Ordens de Serviço disponíveis
const ordens = await impactoMroApi.getOrdensServico({ prefixoAeronave: 'PR-AZL' });

// 2. Obter o Contexto Completo de Qualidade da OS
const contexto = await impactoMroApi.getContextoQualidadeOS('os_imp_2026_0982');

if (contexto.success && contexto.data) {
  console.log(`OS: ${contexto.data.ordemServico.numero}`);
  console.log(`Aeronave: ${contexto.data.ordemServico.prefixoAeronave}`);
  console.log(`Técnico Responsável: ${contexto.data.tecnicoResponsavel.nome} (${contexto.data.tecnicoResponsavel.cht})`);
  console.log(`Ferramentas aplicadas:`, contexto.data.ferramentasUtilizadas);
  console.log(`Alertas de conformidade:`, contexto.data.alertasQualidadeDetectados);
}
```

### 5.2. Na Interface do Usuário (QualyQuest)
1. **Cadastro e Edição de RNC (`NCFormView`):**
   - No bloco **"Vínculo Oficial com Ordem de Serviço (Impacto Aviation MRO)"**, clique em **"Vincular a OS do Impacto Aviation MRO"**.
   - No modal seletor, pesquise por prefixo de aeronave ou número de OS e selecione a OS desejada.
   - Após vinculado, o card exibe o badge oficial, os IDs estáveis e os botões **"Consultar Contexto da OS"** e **"Consultar no Impacto"**.
   - No modal de contexto, o auditor pode clicar em **"Adicionar à RNC como Evidência"** para enriquecer a investigação sem sobrescrever dados originais do QualyQuest.
2. **Tabela de Relatórios (`ReportListView`):**
   - Cada RNC vinculada exibe o badge clicável `Impacto: OS-XXXX`, permitindo abrir o dossiê de qualidade com um clique.
3. **Ficha Oficial F 001-29 (`OfficialReportView`):**
   - Apresenta o banner de rastreabilidade de manutenção e imprime a linha oficial de proveniência técnica no formulário A4 auditável.
