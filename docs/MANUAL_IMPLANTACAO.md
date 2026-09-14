# QualiGest SGQ — Manual de Implantação e Homologação
## Procedimentos de Deploy, Homologação e Verificação Contínua (Fase 12.2)

### 1. Pré-Requisitos de Infraestrutura

- **Ambiente de Execução:** Node.js 18.x ou superior (suporte nativo a ES Modules).
- **Gerenciador de Pacotes:** `npm` ou `bun`.
- **Servidor Web / Reverse Proxy:** Porta padrão `3000` vinculada em `0.0.0.0`.
- **Banco de Dados:** Google Firebase Firestore configurado com autenticação e `firestore.rules`.
- **Gemini API:** Chave configurada como variável de ambiente server-side (`GEMINI_API_KEY`).

---

### 2. Passo a Passo de Instalação e Configuração

1. **Clonagem do Repositório:**
   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd qualigest-sgq
   ```

2. **Instalação das Dependências:**
   ```bash
   npm install
   ```

3. **Configuração de Variáveis de Ambiente:**
   Crie o arquivo `.env` baseado no `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Preencha com suas credenciais de desenvolvimento ou produção.

4. **Regras de Segurança Firestore:**
   Faça o deploy das regras atualizadas:
   ```bash
   firebase deploy --only firestore:rules
   ```

---

### 3. Pipeline de Homologação e Testes

Antes de liberar qualquer release em produção, execute obrigatoriamente a suíte de homologação e testes de regressão:

```bash
# 1. Checagem estrita de integridade TypeScript (linter)
npm run lint

# 2. Execução da Homologação da Fase 12.2 (Teste de Espelho SSoT e Resiliência)
npx tsx scripts/homologation-fase12-2.ts

# 3. Execução da Homologação Adversarial Global (Matriz 5x5, RBAC, Multi-Tenant, Red Team)
npx tsx scripts/homologation-fase6-3.ts

# 4. Compilação do build de produção (Vite + esbuild server.cjs)
npm run build
```

---

### 4. Critérios de Aceite para Go-Live

| Teste | Critério de Aceite |
| :--- | :--- |
| **Teste de Espelho (Web vs PPTX)** | 100% de paridade nos dados estatísticos e ausência de divergências. |
| **Auto-Fit Geométrico** | Zero colisão de texto com o rodapé dos slides PPTX (tolerância > 0.20"). |
| **Modo Sem Dados** | Comportamento limpo com 0 registros, sem gráficos quebrados nem valores `NaN`. |
| **Segurança Multi-Tenant** | Tentativas de acesso entre tenants bloqueadas com `403 Forbidden`. |
| **Build de Produção** | Saída estática em `dist/` e backend compilado em `dist/server.cjs`. |
