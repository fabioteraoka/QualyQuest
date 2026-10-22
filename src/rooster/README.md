# Rooster MRO — Sistema Mestre de Pessoas, Treinamentos e Habilitações
## Módulo Mestre Operacional MRO Integrado ao Ecossistema QualyQuest SGQ

---

### 1. Princípio Arquitetural Fundamental

> **ROOSTER COMO MESTRE. QUALYQUEST COMO ECOSSISTEMA INTEGRADO.**

O **Rooster MRO** é o **sistema mestre de cadastro, criação e manutenção oficial** das seguintes entidades corporativas:

1. **Pessoas / Colaboradores Técnicos** (`organizations/{orgId}/persons`)
2. **Catálogo de Treinamentos** (`organizations/{orgId}/trainingCourses`)
3. **Registros de Treinamentos Realizados** (`organizations/{orgId}/trainingRecords`)
4. **Habilitações, Licenças e Qualificações Técnicas** (`organizations/{orgId}/qualifications`)
5. **Relações Operacionais entre Colaborador, Treinamento, Habilitação e Motores**
6. **Histórico Rastreável de Validade, Renovação e Substituição de Registros**

Os demais módulos do QualyQuest consomem e exibem essas informações em tempo real via listeners `onSnapshot` do Cloud Firestore, delegando as operações oficiais de criação e edição ao Rooster MRO para evitar concorrência ou divergência cadastral.

---

### 2. Mapa das Entidades Canônicas e Formulários Mestres

| Entidade | Formulário Oficial no Rooster | Coleção Canônica no Firestore | Consumo no QualyQuest |
| :--- | :--- | :--- | :--- |
| **Colaborador / Mecânico** | `PessoasView.tsx` / `FichaMecanicoView.tsx` | `organizations/{orgId}/persons/{personId}` | `PersonsCompetenciesView.tsx` (Dossiê e Matriz) |
| **Catálogo de Cursos** | `CatalogoView.tsx` | `organizations/{orgId}/trainingCourses/{courseId}` | `TrainingsQualificationsView.tsx` (Grade Regulamentar) |
| **Treinamentos Realizados** | `TreinamentosView.tsx` (Individual e em Lote) | `organizations/{orgId}/trainingRecords/{recordId}` | `TrainingsQualificationsView.tsx` (Histórico e Auditoria) |
| **Licenças / CHTs** | `LicencasView.tsx` | `organizations/{orgId}/qualifications/{qualificationId}` | `TrainingsQualificationsView.tsx` (CHTs e Autorizações) |
| **Estações / Bases** | `BasesView.tsx` | `organizations/{orgId}/operational_bases/{baseId}` | `OperationalBasesView.tsx` |
| **Catálogo de Motores** | `CatalogoView.tsx` (Aba Motores) | `organizations/{orgId}/roster_motores/{motorId}` | Roster & Fichas Técnicas |
| **Vínculos Treino-Motor** | `TreinamentosView.tsx` | `organizations/{orgId}/roster_treinamentos_motor` | Ficha do Mecânico & Roster |
| **Designações de Frota/Função** | `DesignacoesView.tsx` | `organizations/{orgId}/roster_designacoes_*` | Aptidão Operacional & Roster |

---

### 3. Regras de Ouro de Integridade & Não-Divergência

1. **Identidade Estável:** Chaves primárias UUID/CUID imutáveis (`personId`, `courseId`, `trainingRecordId`). Nenhuma fusão ou relacionamento é estabelecido por nome textual de colaborador.
2. **Preservação de 100% dos Campos SGQ:** Ao cadastrar ou editar mecânicos no Rooster, todos os atributos canônicos são mantidos: matrícula, setor, cargo operacional, data de admissão, contatos corporativos (ramais), observações e restrições operacionais.
3. **Cálculo Rigoroso de Validade (Sem Prazos Presumidos):** Treinamentos ou cursos sem periodicidade explícita são gravados com `sem_validade: true` e `validade_dias: 0`, sem atribuição arbitrária de prazos (ex: 5 anos ou 730 dias).
4. **Encadeamento de Renovação Auditado:** A renovação de um treinamento gera um novo registro com `registroTreinamentoOrigemId` e vincula o registro anterior via `substituidoPor`, preservando o histórico de auditoria.
5. **Isolamento Multi-Tenant Estrito:** Todas as operações operam exclusivamente no escopo da organização (`organizations/{organizationId}/*`), com regras em `firestore.rules` que bloqueiam gravações em coleções legadas de raiz.

---

### 4. Suíte Automatizada de Homologação (55 Testes)

Para validar a integridade de todas as dimensões de integração:
```bash
npx tsx scripts/test_integration_qualyquest_rooster.ts
```

Verificação de código e compilação:
```bash
npm run lint
npm run build
```
