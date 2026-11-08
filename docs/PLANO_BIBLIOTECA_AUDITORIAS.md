# Biblioteca de Auditorias, Requisitos e Respostas — Plano de Implementação

## Objetivo

Evoluir a gestão de auditorias já existente no QualyQuest para uma biblioteca institucional reutilizável de requisitos, checklists, respostas e evidências, sem duplicar constatações externas ou RNCs.

## Diagnóstico inicial do repositório

Estruturas existentes identificadas na branch main:

- `ClientAuditsManagementView.tsx`: programas/checklists de clientes, requisitos, avaliações e matriz de cobertura.
- `AuditsManagementView.tsx`: gestão de auditorias externas.
- `AuditFindingsView.tsx`: constatações externas, respostas oficiais, evidências e retorno do auditor.
- `AuditLessonsLearnedView.tsx`: lições aprendidas.
- `src/types/auditRequirements.ts`: `RequisitoAuditoriaExterna` e `RequisitoOrganizacionalReutilizavel`.
- `src/services/firebase/auditRequirementsFirestore.ts`: persistência de requisitos associados a auditorias, incluindo importação em lote.
- `useAppSubscriptions.ts` e `useAuditActions.ts`: assinaturas e ações existentes para auditorias/requisitos/constatações/lições.

## Decisões arquiteturais

1. **Biblioteca-mestra separada da execução da auditoria.** Requisitos reutilizáveis ficam em uma coleção própria. Ao abrir uma auditoria, o sistema cria uma instância/snapshot dos requisitos selecionados, preservando edição e revisão usadas naquela auditoria.
2. **Não duplicar a RNC.** A constatação externa permanece em `ConstatacaoExternaRecord`; quando necessário, vincula-se a uma única RNC interna por ID.
3. **Não confundir checklist com constatação.** Uma questão pode ser conforme, não aplicável, não auditada ou observação sem gerar NC.
4. **Reaproveitar o banco de requisitos organizacionais existente**, após validar se o modelo atende à biblioteca multiorigem (ANAC, IOSA, EASA e cliente). Evitar uma terceira estrutura paralela de requisitos.
5. **Respostas institucionais e evidências são objetos controlados**, com estado de aprovação, responsável, revisão/data de validação e histórico de uso. Resposta aprovada não autoriza envio automático.
6. **IOSA preliminar não é fonte normativa oficial.** Guardar metadados de edição e status de validação; não apresentar paráfrases como ISARPs oficiais.
7. **Isolamento por organização obrigatório.** Toda leitura/escrita usa organizationId do contexto autenticado; não usar organização IMPACTO fixa em componentes.

## Lacunas e riscos observados para tratar

- A avaliação de requisitos em `ClientAuditsManagementView.tsx` preenche automaticamente resultado inicial como CONFORME. Rever para iniciar como EM_AVALIACAO/Não avaliado e exigir evidência/justificativa antes de concluir.
- O formulário de evidência em `AuditFindingsView.tsx` inicia `statusValidacao` como `VALIDADA`. Alterar para pendente/aguardando validação e exigir validação explícita.
- `AuditLessonsLearnedView.tsx` grava `organizationId: 'org_impacto_aviation'` e seleciona auditoria/constatação padrão quando não informadas. Corrigir para receber organizationId autenticado e exigir vínculo explícito ou classificar a lição como transversal sem origem.
- Requisitos de cliente (`RequisitoClienteItem`) e requisitos de auditoria externa (`RequisitoAuditoriaExterna`) coexistem. Definir migração/compatibilidade para não duplicar requisitos nem quebrar telas atuais.
- Conferir regras do Firestore e índices antes de criar novas coleções.

## Fases propostas

### Fase 1 — Biblioteca-mestra de requisitos
- Consolidar modelo reutilizável com fonte, tipo (regulatório, padrão, contratual, interno), código, título, texto original, pergunta de auditoria, edição/revisão, vigência, aplicabilidade, evidência esperada, processos/documentos relacionados e status de validação.
- Fontes iniciais: ANAC RBAC 145/Portfólio de Inspeções; IOSA ISM (MNT e interfaces ORG); EASA Part-145; requisitos específicos de clientes.
- Importar/exportar XLSX/CSV com pré-visualização, validação, detecção de duplicidade e relatório de erros.
- Versionar requisitos; alterações não podem modificar snapshots de auditorias já iniciadas.

### Fase 2 — Banco de respostas e evidências
- Resposta-modelo com tema, pergunta, texto, documentos relacionados, evidências requeridas, responsável, aprovador, status e revisão.
- Estados: RASCUNHO, EM_VALIDACAO, APROVADA, DESATUALIZADA, SUSPENSA.
- Evidência real vinculada a documento/arquivo, revisão, validade, responsável e estado de validação.
- Alertar quando documento relacionado for revisado, vencido ou substituído.

### Fase 3 — Preparação pré-auditoria
- Selecionar cliente, fonte, escopo, edição do checklist e bases envolvidas.
- Gerar cópia controlada dos requisitos selecionados.
- Mostrar respostas aprovadas anteriores, evidências existentes e validade.
- Criar tarefas de preparação com responsável/prazo e relatório de prontidão.

### Fase 4 — Integração e inteligência
- Mapear requisitos equivalentes entre fontes.
- Relacionar constatações de clientes diferentes a uma ação corretiva compartilhada.
- Sugestões de IA sempre como rascunho, com origem e nível de confiança; proibir afirmação de execução/conformidade sem evidência.
- Indicadores de recorrência, respostas aceitas/rejeitadas, evidências vencidas e eficácia.

## Critérios de aceite mínimos

1. Cadastrar requisitos de diferentes fontes sem duplicação.
2. Controlar edição/revisão e aplicabilidade com justificativa.
3. Criar auditoria a partir de checklist versionado.
4. Registrar resultados diversos sem obrigar geração de NC.
5. Reutilizar resposta aprovada sem copiar evidência desatualizada.
6. Vincular evidência pendente e validar explicitamente.
7. Vincular constatação externa à RNC existente sem duplicar tratamento.
8. Isolar dados por organizationId.
9. Preservar auditorias históricas após revisão da biblioteca.
10. Importar/exportar checklist com validação e relatório de erros.

## Cenários de homologação

- Kalitta: auditoria com uma constatação já corrigida.
- Swiss ID 6508: 11 questões, 10 conformes, 1 não aplicável, nenhuma NC.
- Placar: checklist baseado na ANAC e constatação de acesso aos manuais.
- Avion Express: seis constatações MNT-2026-023 a MNT-2026-028, incluindo IOSA e ação corretiva compartilhada com Placar para acesso aos manuais.

## Próximo passo técnico

Implementar primeiro a Fase 1 em branch isolada, após confirmar o modelo `RequisitoOrganizacionalReutilizavel`, os fluxos de importação existentes e as regras Firestore. Não iniciar alterações destrutivas ou migração automática de registros existentes.
