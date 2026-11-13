# QUALYQUEST SGQ — FASE 1.4.7
## Runbook de Armazenamento Persistente, Versionamento, Retenção, Backup e Restauração

Este documento estabelece a configuração operacional obrigatória para o bucket de evidências de auditoria no **Google Cloud Storage / Firebase Storage** (`ai-studio-applet-webapp-bdbf6.firebasestorage.app`).

---

## 1. Modelo de Segurança e Divisão de Responsabilidades

### A. Controles nas Firebase Storage Security Rules (`storage.rules`)
- **Bloqueio total de acesso direto do cliente (`allow read, write: if false`)** para `organizations/{organizationId}/evidences/{allPaths=**}` e catch-all global.
- **Justificativa técnica:**
  1. O banco Firestore do QualyQuest utiliza database nomeado (`ai-studio-qualigestgestode-97a188de-6117-44a7-be8d-44d92563ba38`), não consultável nativamente via `firestore.get()` nas Storage Rules padrão.
  2. Os tokens Firebase Auth não carregam custom claims de `role` ou `organizationId`.
  3. Nenhuma URL pública permanente (`getDownloadURL` público ou objeto `allUsers`) é permitida.

### B. Controles no Backend Autenticado (`/api/evidence-storage/*`)
- Verificação criptográfica RS256 do Firebase ID Token contra chaves públicas Google X.509 (`securetoken@system.gserviceaccount.com`).
- Consulta em tempo real ao perfil `users/{uid}` no Firestore nomeado para determinar autoritativamente `organizationId`, `role` e status ativo (o navegador nunca escolhe livremente a organização).
- Bloqueio multi-tenant (`403 CROSS_ORGANIZATION_ACCESS_DENIED`).
- Bloqueio RBAC de escrita para `CONSULTA` e `VIEWER` (`403 ROLE_READONLY_DENIED`).
- Validação de extensão, MIME, tamanho máximo (25 MB), proteção contra path traversal e inspeção de **magic bytes** contra executáveis (`MZ`, `ELF`, Mach-O, `#!`, HTML/SVG).
- Deduplicação idempotente por `hashSha256` em `organizations/{organizationId}/evidences/{hashSha256}` usando precondição `ifGenerationMatch=0`.
- Revalidação SHA-256 na leitura e headers `X-Content-Type-Options: nosniff` + `Cache-Control: private, no-store`.

---

## 2. Ativação do Bucket, Versionamento, Retenção e Proteção contra Exclusão

Após ativar o Firebase Storage no console do projeto `ai-studio-applet-webapp-bdbf6`, executar os comandos de infraestrutura abaixo:

```bash
# 1. Definir projeto alvo
export PROJECT_ID="ai-studio-applet-webapp-bdbf6"
export EVIDENCE_BUCKET="gs://ai-studio-applet-webapp-bdbf6.firebasestorage.app"
export BACKUP_BUCKET="gs://qualyquest-sgq-backup-bdbf6"

# 2. Habilitar Object Versioning (preserva gerações anteriores em sobrescritas/exclusões)
gcloud storage buckets update "$EVIDENCE_BUCKET" --versioning

# 3. Habilitar Soft Delete (janela mínima de recuperação contra exclusão acidental: 30 dias)
gcloud storage buckets update "$EVIDENCE_BUCKET" --soft-delete-duration=30d

# 4. Política de Retenção Regulatória SGQ Aeronáutico (ex: 5 anos = 157680000s em modo auditado)
# ATENÇÃO: Avaliar com a Gerência da Qualidade antes de aplicar --lock-retention-policy (irreversível).
gcloud storage buckets update "$EVIDENCE_BUCKET" --retention-period=157680000s

# 5. Conceder IAM mínimo à Service Account do Cloud Run (sem Storage Admin global)
gcloud storage buckets add-iam-policy-binding "$EVIDENCE_BUCKET" \
  --member="serviceAccount:<RUNTIME_SERVICE_ACCOUNT_EMAIL>" \
  --role="roles/storage.objectAdmin"
```

---

## 3. Política de Backup Independente (Object Versioning NÃO Substitui Backup)

**Regra operacional:** Object Versioning protege contra sobrescrita ou exclusão lógica no mesmo bucket, mas **não protege contra exclusão do projeto/bucket, falha regional ou comprometimento de conta**. Portanto, manter backup separado:

1. **Bucket de Backup Secundário em região distinta (`$BACKUP_BUCKET`):**
   - Configurar Storage Transfer Service diário (sincronização incremental unidirecional sem propagação imediata de exclusões — *delete-protection*).
2. **Exportação Diária Sincronizada do Firestore:**
   ```bash
   gcloud firestore export "$BACKUP_BUCKET/firestore-backups/$(date +%Y-%m-%d)" \
     --database="ai-studio-qualigestgestode-97a188de-6117-44a7-be8d-44d92563ba38" \
     --collection-ids="audit_readiness_preparations,evidence_files,users,organizations"
   ```
3. **Preservação do vínculo binário ↔ metadado:**
   - Todos os objetos são endereçados pelo conteúdo (`organizations/{orgId}/evidences/{hashSha256}`), garantindo que o backup de `evidence_files` + `audit_readiness_preparations` preserve 100% da correspondência com `historicoSubstituicoes` e `historicoModalidade`.

---

## 4. Procedimento de Restauração e Verificação Periódica de Integridade

### Restauração Controlada
1. Restaurar os documentos Firestore (`audit_readiness_preparations` e `evidence_files`) para ambiente isolado ou coleção alvo preservando IDs originais (`fileId`, `hashSha256`, `objectPath`).
2. Restaurar objetos do bucket de backup (`gcloud storage cp -r "$BACKUP_BUCKET/evidences/*" "$EVIDENCE_BUCKET/"`) sem sobrescrever objetos existentes com mesmo hash válido.
3. Para objetos deletados acidentalmente dentro da janela do Soft Delete ou Object Versioning, restaurar a geração específica (`gcloud storage objects list --all-versions` → `gcloud storage cp "gs://...#<generation>" ...`).

### Verificação Periódica de Integridade
- Executar semanalmente rotina de verificação autenticada chamando `GET /api/evidence-storage/verify-integrity/:organizationId/:hashSha256` para todos os registros ativos em `evidence_files`.
- Alertar imediatamente se qualquer item retornar `BINARY_MISSING`, `INTEGRITY_MISMATCH` (`integro: false`) ou `ORPHAN_BINARY`.
