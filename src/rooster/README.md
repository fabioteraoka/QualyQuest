# Rooster MRO — Gestão Operacional de Mecânicos, Habilitações e Frotas
## Módulo Especializado MRO Integrado com QualyQuest SGQ

---

### 1. Visão Geral e Princípio Arquitetural
O **Rooster MRO** é a interface especializada de operações de hangar e linha, projetada para acompanhamento rápido de efetivo técnico, fichas de mecânicos, matrizes de cursos por frotas de aeronaves (Boeing, Airbus, Embraer, ATR) e motores (CFM56, LEAP, GE90, PW1000G, Trent).

A partir da **Fase Corretiva Definitiva**, o Rooster **não mantém cadastros paralelos**. Ele consome e atualiza diretamente as coleções canônicas do **QualyQuest** no Cloud Firestore.

---

### 2. Mapa das Entidades e Coleções Canônicas

| Entidade Rooster | Entidade Canônica QualyQuest | Caminho no Firestore |
| :--- | :--- | :--- |
| `Pessoa` | `ColaboradorPessoa` | `organizations/{orgId}/persons/{personId}` |
| `CursoCatalogo` | `CursoTreinamento` | `organizations/{orgId}/trainingCourses/{courseId}` |
| `Treinamento` | `RegistroTreinamentoColaborador` | `organizations/{orgId}/trainingRecords/{trainingRecordId}` |
| `Licenca` | `QualificacaoColaborador` | `organizations/{orgId}/qualifications/{qualificationId}` |
| `Base` | `OperationalBase` | `organizations/{orgId}/operational_bases/{baseId}` |
| `MotorCatalogo` | Vínculos MRO | `organizations/{orgId}/roster_motores/{motorId}` |
| `TreinamentoMotor` | Vínculos N:N | `organizations/{orgId}/roster_treinamentos_motor/{trnId__motorId}` |
| `DesignacaoPessoa` | Atribuições MRO | `organizations/{orgId}/roster_designacoes_pessoa/{pessoaId}` |
| `DesignacaoBase` | Alocação de Estações | `organizations/{orgId}/roster_designacoes_base/{pessoaId__baseId}` |
| `DesignacaoFuncao` | Matriz de Funções | `organizations/{orgId}/roster_designacoes_funcao/{pessoaId__funcao}` |
| `DesignacaoAeronave` | Matriz de Frotas | `organizations/{orgId}/roster_designacoes_aeronave/{pessoaId__aero}` |
| `Configuracao` | Parâmetros MRO | `organizations/{orgId}/roster_configuracao/geral` |

---

### 3. Garantias de Integridade de Dados

1. **Identidade Estável:** Nenhum vínculo é estabelecido puramente por nome ou texto livre. Os registros utilizam o ID canônico imutável (`personId`, `courseId`, `trainingRecordId`).
2. **Preservação Não-Destrutiva:** A edição de um colaborador pelo Rooster (`savePessoa`) recupera a entidade canônica completa em memória e mescla os dados, garantindo que campos SGQ (data de admissão, ramais corporativos, cargo operacional, observações e restrições) permaneçam intactos.
3. **Persistência Assíncrona com Confirmação:** Todos os métodos do `repository` retornam `Promise<void>`, aguardando confirmação explícita de gravação do Firestore antes de emitir feedback ao usuário.
4. **Histórico e Encadeamento de Renovação:** Ao renovar um treinamento, o registro anterior é marcado com `substituidoPor` e o novo registro aponta para `registroTreinamentoOrigemId`.
5. **Bloqueio de Coleções Raiz:** Novas gravações nas coleções globais legadas (`/pessoa`, `/licenca`, `/treinamento`, etc.) foram bloqueadas em `firestore.rules`, garantindo isolamento multi-tenant absoluto.

---

### 4. Execução de Testes e Homologação
Para rodar a bateria de testes de integração:
```bash
npm run test:integration
```
Para verificar a integridade de compilação TypeScript:
```bash
npm run lint
npm run build
```
