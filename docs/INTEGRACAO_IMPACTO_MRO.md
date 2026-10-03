# Integração QualyQuest ↔ Impacto Aviation MRO

Este documento descreve a integração oficial entre o **QualyQuest (Sistema de Gestão da Qualidade - SGQ)** e o **Impacto Aviation MRO (Sistema Oficial de Manutenção e Registros Técnicos Aeronáuticos)**.

---

## 1. Princípios Arquiteturais e Fronteiras

1. **Fonte Única Oficial de Manutenção:**
   - **Impacto Aviation MRO:** Fonte externa oficial dos dados de manutenção (Bases, Técnicos, Habilitações CHT, Treinamentos, Ferramentas Calibradas, Ordens de Serviço e Contexto Técnico).
   - **QualyQuest:** Fonte oficial dos registros de qualidade, conformidade, auditorias, investigações, ações corretivas (CAPA) e RNCs (Relatórios de Não Conformidade).
2. **Sem Base Paralela:** O QualyQuest **não cria nem mantém** uma segunda versão paralela ou duplicada de OS, técnicos ou ferramentas. Não existe dataset local fictício utilizado como dado oficial.
3. **Somente Leitura (HTTP GET):** Todas as integrações com o Impacto operam em modo **estritamente somente leitura**. Nenhuma operação de escrita, modificação ou exclusão é executada no Impacto Aviation MRO.
4. **Armazenamento de IDs Estáveis:** O QualyQuest referencia apenas **IDs estáveis** (`ordemServicoId`, `tecnicoId`, `baseId`), preservando a soberania do dado de manutenção no Impacto.
5. **Comportamento Offline e Resiliência:**
   - Se o Impacto Aviation MRO estiver indisponível ou offline, a integração retorna explicitamente o estado **`OFFLINE_INDISPONIVEL`**.
   - Nenhum dado local é inventado ou simulado como se fosse dado oficial atual.
   - Caso existam registros de consultas anteriores bem-sucedidas em cache de contingência, estes são explicitamente rotulados como **`ULTIMA_CONSULTA_CONHECIDA`**, com alerta claro na interface de que não representam o estado em tempo real.

---

## 2. Variáveis de Ambiente

Configuradas via `.env` (exemplo documentado em `.env.example`):

```bash
# IMPACTO_MRO_API_URL: URL base da API oficial de integração do Impacto Aviation MRO (.../api/v1/integration)
IMPACTO_MRO_API_URL="https://mro.impactoaviation.com.br/api/v1/integration"

# IMPACTO_MRO_API_KEY: Token/Chave de autenticação da integração (nunca expor chaves reais)
IMPACTO_MRO_API_KEY="<IMPACTO_MRO_API_KEY>"
```

> **Segurança:** O frontend consome rotas proxy server-side (`/api/impacto/*`), garantindo que o token `IMPACTO_MRO_API_KEY` jamais seja exposto no navegador do cliente e prevenindo problemas de CORS.

---

## 3. Contrato da API e Envelope Canônico

A API do Impacto Aviation MRO e o proxy do QualyQuest entregam as respostas diretamente no envelope canônico oficial:

```json
{
  "success": true,
  "version": "1.0",
  "timestamp": "2026-10-03T12:00:00.000Z",
  "source": "Impacto Aviation MRO",
  "data": [ ... ],
  "meta": {
    "statusConexao": "ONLINE",
    "tempoRespostaMs": 45,
    "total": 12
  }
}
```

O proxy server-side do QualyQuest não aninha nem duplica o envelope JSON retornado pelo Impacto.

---

## 4. Endpoints da Integração (Somente Leitura)

A base da API é padronizada como `.../api/v1/integration`.

| Recurso | Rota Proxy no QualyQuest | Endpoint Oficial no Impacto Aviation MRO | Descrição |
| :--- | :--- | :--- | :--- |
| **Health Check Oficial** | `GET /api/impacto/health` | `GET /api/v1/integration/health` | Valida conectividade, autenticação e tempo de resposta da API de integração. |
| **Bases Operacionais** | `GET /api/impacto/bases` | `GET /api/v1/integration/bases` | Lista as bases de manutenção homologadas ativas (VCP, SDU, BSB, etc.). |
| **Técnicos & Inspetores** | `GET /api/impacto/tecnicos` | `GET /api/v1/integration/tecnicos` | Consulta equipe técnica, CHTs e validade das habilitações. |
| **Técnico Específico** | `GET /api/impacto/tecnicos/:id` | `GET /api/v1/integration/tecnicos/:id` | Detalhes do profissional técnico pelo ID estável. |
| **Qualificações** | `GET /api/impacto/qualificacoes` | `GET /api/v1/integration/qualificacoes` | Habilitações de tipo de aeronave/motor (ex: E195-E2, B737-800). |
| **Treinamentos** | `GET /api/impacto/treinamentos` | `GET /api/v1/integration/treinamentos` | Treinamentos mandatórios de SGQ/manutenção (HF, EWIS, FTS). |
| **Ferramentas Calibradas** | `GET /api/impacto/ferramentas` | `GET /api/v1/integration/ferramentas` | Instrumentos aferidos, certificados e status metrológico. |
| **Ferramenta Específica** | `GET /api/impacto/ferramentas/:id` | `GET /api/v1/integration/ferramentas/:id` | Detalhes de instrumento pelo código ou ID estável. |
| **Ordens de Serviço (OS)** | `GET /api/impacto/ordens-servico` | `GET /api/v1/integration/ordens-servico` | Consulta de OS por aeronave, base, status ou busca textual. |
| **OS Específica** | `GET /api/impacto/ordens-servico/:id` | `GET /api/v1/integration/ordens-servico/:id` | Dados de cabeçalho da OS. |
| **Contexto Completo da OS** | `GET /api/impacto/ordens-servico/:id/contexto-qualidade` | `GET /api/v1/integration/ordens-servico/:id/contexto-qualidade` | Dossiê completo: aeronave, base, equipe técnica executante, ferramentas aferidas, peças com Form 1 e alertas de conformidade. |

---

## 5. Modelo de Vinculação QualyQuest ↔ Impacto

O vínculo é armazenado na propriedade `origemImpactoMro` do registro de RNC (`NCRecord`), utilizando IDs estáveis:

```typescript
export interface VinculoImpactoMro {
  origem: 'Impacto Aviation MRO'; // Exibição explícita da procedência
  ordemServicoId: string;         // ID estável da OS no Impacto (ex: 'os_imp_2026_0982')
  numeroOS: string;               // Código legível da OS (ex: 'OS-2026-0982')
  tituloOS?: string;              // Título ou escopo resumido da OS
  prefixoAeronave?: string;       // Prefixo da aeronave (ex: 'PR-GUQ')
  modeloAeronave?: string;        // Modelo (ex: 'Boeing 737-800')
  tipoManutencao?: string;        // Ex: 'Check C', 'AOG'
  baseId?: string;                // ID estável da base (ex: 'base_vcp')
  baseNome?: string;              // Nome da base (ex: 'Base Viracopos - Hangar 1')
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

## 6. Comportamento em Caso de Indisponibilidade (Offline)

1. **Estado Offline:** Se a API do Impacto não estiver acessível, o status retornado é `OFFLINE_INDISPONIVEL`.
2. **Sem Dados Fictícios:** O QualyQuest não apresenta dados fictícios locais fingindo ser a fonte oficial.
3. **Histórico Auditável (`ULTIMA_CONSULTA_CONHECIDA`):** Caso o sistema possua em cache consultas anteriores realizadas durante a sessão, elas podem ser consultadas para auditoria com o rótulo explícito `ULTIMA_CONSULTA_CONHECIDA` e indicação da data/hora da consulta original.
4. **Isolamento de Falhas:** A indisponibilidade da API do Impacto não interrompe as operações do QualyQuest (RNCs, CAPA, auditorias e emissão de formulários continuam 100% operacionais).

---

## 7. Exemplo de Uso no Cliente TypeScript (`src/services/impactoMroApi.ts`)

```typescript
import { impactoMroApi } from './services/impactoMroApi';

// 1. Health check da integração
const health = await impactoMroApi.checkHealth();
console.log('Status da API:', health.data?.status); // 'ok' | 'offline'

// 2. Consulta de Ordens de Serviço
const ordens = await impactoMroApi.getOrdensServico({ prefixoAeronave: 'PR-GUQ' });

if (ordens.success && ordens.data) {
  console.log(`OSs encontradas: ${ordens.data.length}`);
} else if (ordens.meta.statusConexao === 'OFFLINE_INDISPONIVEL') {
  console.warn('API Impacto indisponível no momento.');
}

// 3. Consulta ao Contexto Completo de Qualidade da OS
const contexto = await impactoMroApi.getContextoQualidadeOS('os_imp_2026_0982');

if (contexto.success && contexto.data) {
  console.log('OS:', contexto.data.ordemServico.numero);
  console.log('Técnico Responsável:', contexto.data.tecnicoResponsavel.nome);
  console.log('Ferramentas Calibradas:', contexto.data.ferramentasUtilizadas);
  console.log('Alertas de Qualidade:', contexto.data.alertasQualidadeDetectados);
}
```
