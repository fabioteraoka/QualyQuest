import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREEN_DIR = path.resolve(process.cwd(), 'tmp_screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

let passed = 0;
let failed = 0;

function assert(cond: boolean, label: string, detail?: string) {
  if (cond) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function main() {
  console.log('======================================================================');
  console.log('QUALYQUEST SGQ — FASE 1.4.6 — VALIDAÇÃO VISUAL NO CHROMIUM REAL');
  console.log('======================================================================\n');

  const preinstalledExe = '/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell';
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(preinstalledExe) ? preinstalledExe : undefined
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    // 1. Acessar Preparação para Auditorias pelo menu lateral
    const sidebarBtn = page.getByRole('button', { name: /Preparação para Auditorias/i }).first();
    const sidebarVisible = await sidebarBtn.isVisible();
    assert(sidebarVisible, 'Menu lateral exibe item "Preparação para Auditorias"');
    await sidebarBtn.click();
    await page.waitForTimeout(800);

    const headingVisible = await page.getByText('Painel de Preparação de Respostas & Evidências').isVisible();
    assert(headingVisible, 'Painel de Preparação para Auditorias renderiza corretamente');

    const countText = await page.getByText(/Exibindo\s+177\s+de\s+177\s+requisitos catalogados/i).isVisible();
    assert(countText, 'Painel carrega os 177 requisitos originais preservados');

    const internalRuleBanner = await page.getByText(/Regras Internas SGQ \(Sem Alteração Normativa\)/i).isVisible();
    assert(internalRuleBanner, 'Painel explicita que modalidades são regras internas do SGQ sem alterar normas');

    await page.screenshot({ path: path.join(SCREEN_DIR, '01_dashboard.png') });

    // 2. Filtrar por modalidade de comprovação
    const modalidadeSelect = page.locator('select').filter({ hasText: 'Todas as Modalidades de Comprovação' }).first();
    await modalidadeSelect.selectOption('CERTIFICADO_CALIBRACAO');
    await page.waitForTimeout(300);
    const filteredCalibText = await page.locator('text=/Exibindo\\s+\\d+\\s+de\\s+177/').textContent();
    const matchCalib = filteredCalibText?.match(/Exibindo\s+(\d+)\s+de\s+177/);
    const calibCount = matchCalib ? parseInt(matchCalib[1], 10) : 0;
    assert(calibCount > 0 && calibCount < 177, `Filtro por modalidade Certificado de Calibração funciona (${calibCount} requisitos)`);

    await modalidadeSelect.selectOption('DOCUMENTAL_PURO');
    await page.waitForTimeout(300);
    const filteredDocText = await page.locator('text=/Exibindo\\s+\\d+\\s+de\\s+177/').textContent();
    const matchDoc = filteredDocText?.match(/Exibindo\s+(\d+)\s+de\s+177/);
    const docCount = matchDoc ? parseInt(matchDoc[1], 10) : 0;
    assert(docCount > 0 && docCount < 177, `Filtro por modalidade Documental Puro funciona (${docCount} requisitos)`);

    await modalidadeSelect.selectOption('TODAS');
    await page.waitForTimeout(300);

    // 3. Abrir um requisito específico via botão Tratar
    const tratarBtn = page.getByRole('button', { name: /Tratar/i }).first();
    await tratarBtn.click();
    await page.waitForTimeout(500);

    const modalHeaderVisible = await page.getByText('Alterar Modalidade de Comprovação').isVisible();
    assert(modalHeaderVisible, 'Modal de tratamento individual do requisito abre com controle de modalidade');

    // 4. Alterar modalidade com validação de justificativa e histórico
    await page.getByRole('button', { name: /Alterar Modalidade de Comprovação/i }).click();
    await page.waitForTimeout(200);

    const disclaimerVisible = await page.getByText(/Diretriz interna SGQ: não substitui nem reinterpreta o texto normativo oficial/i).isVisible();
    assert(disclaimerVisible, 'Painel de alteração exibe aviso claro de regra interna SGQ');

    const modalModSelect = page.locator('select').filter({ hasText: 'Documental Puro' }).last();
    await modalModSelect.selectOption('VERIFICACAO_IN_LOCO');

    const justInput = page.getByPlaceholder(/Justificativa técnica obrigatória para a modalidade/i);
    await justInput.fill('curta');
    await page.getByRole('button', { name: /Salvar Modalidade e Recalcular Prontidão/i }).click();
    await page.waitForTimeout(200);
    const shortErrVisible = await page.getByText(/mínimo 10 caracteres/i).isVisible();
    assert(shortErrVisible, 'UI bloqueia alteração manual de modalidade com justificativa < 10 caracteres');

    await justInput.fill('Validação operacional em hangar conforme rotina interna SGQ-146.');
    await page.getByRole('button', { name: /Salvar Modalidade e Recalcular Prontidão/i }).click();
    await page.waitForTimeout(500);

    const updatedSuccessVisible = await page.getByText(/Modalidade atualizada para Verificação In Loco/i).isVisible();
    assert(updatedSuccessVisible, 'Alteração de modalidade com justificativa recalcula prontidão e exibe feedback');

    await page.getByRole('button', { name: /Alterar Modalidade de Comprovação/i }).click();
    await page.waitForTimeout(200);
    const histVisible = await page.getByText(/Histórico de Alterações de Modalidade/i).isVisible();
    assert(histVisible, 'Histórico de alterações de modalidade é exibido no modal');
    await page.screenshot({ path: path.join(SCREEN_DIR, '02_modalidade_historico.png') });

    // 5. Aba Validação da Qualidade (5 regras e gating por modalidade)
    await page.getByRole('button', { name: /Validação da Qualidade/i }).click();
    await page.waitForTimeout(300);
    const gatingVisible = await page.getByText(/Gating de Prontidão para Auditoria/i).isVisible();
    const modRule4Visible = await page.getByText(/4\. Comprovação por Modalidade/i).isVisible();
    assert(gatingVisible && modRule4Visible, 'Aba Validação da Qualidade exibe as 5 regras e critério da modalidade');

    // 6. Aba Texto Original & Metadados (preservação ipsis litteris)
    await page.getByRole('button', { name: /Texto Original & Metadados/i }).click();
    await page.waitForTimeout(300);
    const originalTextHeading = await page.getByText(/Texto Original do Requisito \(Ipsis Litteris/i).isVisible();
    assert(originalTextHeading, 'Aba Texto Original & Metadados preserva texto ipsis litteris');

    // 7. Aba Evidências Objetivas: testar tentativa de upload PDF sem sessão Firebase -> deve acusar 401 explicitamente (sem mascarar)
    await page.getByRole('button', { name: /Evidências Objetivas/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /\+ Nova Evidência/i }).click();
    await page.waitForTimeout(200);

    const tmpPdf = path.join(SCREEN_DIR, 'teste_evidencia_ui.pdf');
    fs.writeFileSync(tmpPdf, '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');

    await page.getByPlaceholder(/Ex: Certificado RBC Torquímetro T-045/i).fill('Certificado PDF Teste Segurança UI');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(tmpPdf);
    await page.getByRole('button', { name: /Salvar e Anexar/i }).click();
    await page.waitForTimeout(800);

    const authBlockedBanner = await page.getByText(/Token de autenticação ausente|Bearer obrigatório|não autenticado|401/i).isVisible();
    assert(
      authBlockedBanner,
      'Upload na UI sem sessão Firebase autenticada é bloqueado pelo servidor (401) e exibido claramente sem fallback falso'
    );
    await page.screenshot({ path: path.join(SCREEN_DIR, '03_evidencia_upload_401_real.png') });

    // Fechar modal
    const closeFooterBtn = page.getByRole('button', { name: /^Fechar$/i }).last();
    await closeFooterBtn.click();
    await page.waitForTimeout(200);

    assert(pageErrors.length === 0, `Zero exceções JS não tratadas no navegador (${pageErrors.length})`, pageErrors.join('; '));

    console.log(`\nConsole errors observados (esperado 401 do teste de upload sem login): ${consoleErrors.length}`);
    console.log('\n======================================================================');
    console.log(`RESUMO BROWSER REAL: ${passed} APROVADOS | ${failed} REPROVADOS`);
    console.log('======================================================================');
    if (failed > 0) process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Erro Playwright:', err);
  process.exit(1);
});
