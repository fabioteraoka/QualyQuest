# QualiGest SGQ — Manual do Administrador
## Governança, RBAC, Multi-Tenancy e Gestão da Qualidade (Fase 12.2)

### 1. Papéis e Controle de Acesso Baseado em Função (RBAC)

O QualiGest opera sob o princípio da segregação de funções e menor privilégio, em conformidade com o RBAC 145 e ISO 9001:

| Papel | Permissões no Sistema | Escopo na Apresentação Gerencial |
| :--- | :--- | :--- |
| **Administrador / Super Admin** | Gestão de tenants, usuários, configurações globais e segurança. | Acesso irrestrito a todos os dados e exportação total. |
| **Gestor da Qualidade / SGQ** | Aprovação de RNCs, homologação de planos CAPA, validação de N5 e encerramento de auditorias. | Visualização, filtragem, exportação e emissão do Certificado de Paridade. |
| **Auditor Líder** | Abertura de RNCs, emissão de constatações e apontamentos de auditoria. | Visualização dos relatórios gerenciais e acompanhamento de eficácia. |
| **Inspetor Técnico / Mecânico** | Registro de não conformidades preliminares e leitura obrigatória de manuais. | Acesso aos dados do próprio setor e tarefas delegadas. |
| **Consulta / Diretoria** | Visualização em modo leitura de indicadores e relatórios. | Acesso de leitura e apresentação na Web (sem permissão de alteração). |

---

### 2. Governança Multi-Tenant e Isolamento Organizacional

Cada empresa cliente ou base de manutenção opera com isolamento rigoroso:
- **Coleção Raiz:** `/organizations/{organizationId}/...`
- **Regras Firestore:** Nenhuma consulta sem autenticação ou com `orgId` divergente do token JWT é permitida.
- **Apresentação Gerencial:** A função `construirRelatorioApresentacao` recebe os registros estritamente filtrados pelo tenant ativo.
- **Risco de Vazamento Cruzado:** Totalmente mitigado pelas regras de segurança em `firestore.rules`.

---

### 3. Gestão da Aprendizagem N1 a N5 (Knowledge Base)

O sistema possui motor de inteligência e base de conhecimento estruturado em 5 níveis de maturidade:
- **N1 - Registro Inicial:** Hipótese preliminar inserida pelo inspetor.
- **N2 - Investigado:** 5 Porquês e Ishikawa consolidados.
- **N3 - Ação em Implementação:** CAPA em andamento na oficina.
- **N4 - Eficácia Comprovada:** Verificação de eficácia concluída com sucesso após período de quarentena.
- **N5 - Conhecimento Homologado:** Padrão institucionalizado para prevenir recorrências em toda a frota.

> **Regra Crítica de Segurança:** O autor original da Não Conformidade **não pode autoaprovar** a promoção para N5. É obrigatória a assinatura digital independente de um Gestor da Qualidade.

---

### 4. Manutenção de Acervo e Políticas de Retenção
- Os relatórios gerenciais gerados podem ser auditados a qualquer tempo.
- O histórico de auditorias e trilha imutável (`auditTrails`) não permite exclusão física (`delete`) nem modificação (`update`), garantindo conformidade perante inspeções da ANAC ou FAA.

---

### 5. Bloco de Administração na Nova Navegação

Na nova arquitetura em 8 blocos, o módulo **ADMINISTRAÇÃO** consolida:
1. **Organização:** Dados cadastrais, logotipo, sigla aeronáutica e parâmetros do tenant.
2. **Usuários & Permissões:** Vínculo de colaboradores com papéis RBAC (`ADMIN`, `GESTOR_SGQ`, `AUDITOR`, `MANUTENCAO`, `TREINAMENTO`, `CONSULTA`).
3. **Auditoria do Sistema:** Trilha imutável de eventos (`audit_trails`) com filtros por usuário e severidade.
4. **Implantação e Onboarding:** Assistente de setup para ativação de novas organizações e bases de manutenção.
5. **Centro de Diagnósticos Técnicos:** Painel exclusivo de governança de TI com:
   - Visão Geral de Infraestrutura e conectividade;
   - Arquitetura do Sistema e Topologia;
   - System Designer Oficial e catálogo vivo de ADRs (ADR-001 a ADR-008);
   - Auditoria Técnica e Hardening de Segurança;
   - Diagnóstico em Tempo Real do Firebase Firestore & Auth.

