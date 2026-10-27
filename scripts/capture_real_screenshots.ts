import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

interface ScreenCaptureDef {
  key: string;
  buttonText: string;
  label: string;
  description: string;
  waitForSelector?: string;
}

const captureList: ScreenCaptureDef[] = [
  {
    key: 'dashboard_overview',
    buttonText: 'Dashboard Executivo',
    label: 'Painel Executivo & Dashboard da Qualidade',
    description: 'Monitoramento executivo de Não Conformidades (RNC F 001-29), Matriz de Avaliação de Risco 5x5 (MOMQ / RBAC 145), incidências por setor e alertas normativos.',
  },
  {
    key: 'colaboradores_lista',
    buttonText: 'Lista de colaboradores',
    label: 'Gestão de Pessoas & Colaboradores (Rooster MRO)',
    description: 'Cadastro mestre de colaboradores integrado ao Rooster MRO, com matrícula, CANAC, cargo, base operacional (Hubs e Estações) e situação cadastral.',
  },
  {
    key: 'ficha_mecanico',
    buttonText: 'Perfil do colaborador',
    label: 'Dossiê do Colaborador & Ficha Técnica',
    description: 'Ficha completa do colaborador com qualificações CHT ANAC (CEL/GMP/AVI), habilitações por frota/motor (CFM56, LEAP-1B) e histórico de capacitações.',
  },
  {
    key: 'treinamentos_qualificacoes',
    buttonText: 'Registros de treinamento',
    label: 'Registros de Treinamentos e Qualificações',
    description: 'Histórico auditável de treinamentos concluídos com datas de realização, validades, número de certificado, instrutor e rastreabilidade de reciclagens.',
  },
  {
    key: 'catalogo_cursos',
    buttonText: 'Catálogo de treinamentos',
    label: 'Catálogo de Treinamentos e Cursos',
    description: 'Catálogo canônico de cursos organizados por frota e doutrinação, com cargas horárias, modalidades e periodicidades em meses de calendário.',
  },
  {
    key: 'matriz_treinamento',
    buttonText: 'Matriz de treinamento',
    label: 'Matrizes de Treinamento & Requisitos de Frota',
    description: 'Matriz cruzada de capacitação técnica por frota (B737, A320, E190), motores e doutrinação, cruzando postos e requisitos operacionais.',
  },
  {
    key: 'modelos_capacitacao',
    buttonText: 'Modelos de capacitação',
    label: 'Modelos de Capacitação Operacional',
    description: 'Modelos padronizados de capacitação para atribuição de requisitos de treinamento por cargo e função técnica.',
  },
  {
    key: 'vencimentos_gaps',
    buttonText: 'Vencimentos',
    label: 'Central Preditiva de Vencimentos & Gaps',
    description: 'Central de controle preditivo de validades de treinamentos e CHTs, distinguindo os 5 estados canônicos de validade com alertas aos 60, 30 e 15 dias.',
  },
  {
    key: 'cadastros_bases',
    buttonText: 'Bases e locais operacionais',
    label: 'Bases & Locais Operacionais (Mestre)',
    description: 'Gestão unificada de bases permanentes (Hubs), estações de linha e sites de atendimento com códigos IATA/ICAO e auditoria de transferência.',
  },
  {
    key: 'relatorio_rnc',
    buttonText: 'Não Conformidades (RNC)',
    label: 'Gestão de Não Conformidades (RNC F 001-29)',
    description: 'Gestão do ciclo completo de RNCs com triagem de risco, investigação de causa raiz (Ishikawa 6M + 5 Porquês) e planos de ação CAPA 5W2H.',
  },
  {
    key: 'controle_documental',
    buttonText: 'Acervo & Revisões (SGQ)',
    label: 'Controle Documental & Acervo Técnico',
    description: 'Acervo de manuais técnicos (AMM, CMM, MOE, POP) com controle de revisões vigentes e motor de consulta temporal na data da Ordem de Serviço.',
  },
  {
    key: 'apresentacao_gerencial',
    buttonText: 'Apresentação Gerencial',
    label: 'Apresentação Gerencial Oficial 70/30',
    description: 'Espelho executivo com 20 slides corporativos SSoT em proporção 70/30 (70% Situação Real, 30% Evolução), auto-fit widescreen e exportação PPTX.',
  },
];

async function captureAllRealScreenshots() {
  console.log('===============================================================');
  console.log('INICIANDO CAPTURA DE TELAS REAIS DO QUALYQUEST / ROOSTER');
  console.log('===============================================================\n');

  const docsDir = path.resolve('docs/screenshots');
  const publicDir = path.resolve('public/screenshots');

  [docsDir, publicDir].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  console.log('Carregando aplicação em http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Fecha banner inicial se presente
  try {
    const dismissBtn = await page.$('button[aria-label="Fechar"], button:has-text("Dispensar")');
    if (dismissBtn) await dismissBtn.click();
  } catch (_) {}

  const manifest: Array<{ key: string; label: string; filePng: string; fileJpg: string; description: string }> = [];

  for (const item of captureList) {
    console.log(`[Capturando] ${item.label} (Clicando em "${item.buttonText}")...`);
    try {
      // Localiza o botão pelo texto no menu lateral e clica
      const btn = await page.$(`button:has-text("${item.buttonText}")`);
      if (btn) {
        await btn.click();
      } else {
        console.warn(`  ! Botão "${item.buttonText}" não encontrado diretamente, tentando seletor mais flexível...`);
        await page.click(`text="${item.buttonText}"`);
      }

      await page.waitForTimeout(2500);

      const filePngDocs = path.join(docsDir, `${item.key}.png`);
      const fileJpgDocs = path.join(docsDir, `${item.key}.jpg`);
      const fileJpgPublic = path.join(publicDir, `${item.key}.jpg`);

      await page.screenshot({ path: filePngDocs, fullPage: false });
      await page.screenshot({ path: fileJpgDocs, quality: 92, type: 'jpeg', fullPage: false });
      await page.screenshot({ path: fileJpgPublic, quality: 92, type: 'jpeg', fullPage: false });

      // Sincroniza retrocompatibilidade dos nomes legados no public/screenshots
      if (item.key === 'dashboard_overview') {
        fs.copyFileSync(fileJpgDocs, path.join(publicDir, 'dashboard_overview.jpg'));
      } else if (item.key === 'controle_documental') {
        fs.copyFileSync(fileJpgDocs, path.join(publicDir, 'document_control.jpg'));
      } else if (item.key === 'relatorio_rnc') {
        fs.copyFileSync(fileJpgDocs, path.join(publicDir, 'rnc_report_preview.jpg'));
      } else if (item.key === 'matriz_treinamento') {
        fs.copyFileSync(fileJpgDocs, path.join(publicDir, 'competency_matrix.jpg'));
      } else if (item.key === 'vencimentos_gaps') {
        fs.copyFileSync(fileJpgDocs, path.join(publicDir, 'analytics_charts.jpg'));
      }

      console.log(`  ✓ Capturado com sucesso: ${item.key}.png / .jpg`);
      manifest.push({
        key: item.key,
        label: item.label,
        filePng: `docs/screenshots/${item.key}.png`,
        fileJpg: `docs/screenshots/${item.key}.jpg`,
        description: item.description,
      });
    } catch (err) {
      console.error(`  ✗ Erro ao capturar "${item.label}":`, err);
    }
  }

  await browser.close();

  const manifestPath = path.join(docsDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\n===============================================================`);
  console.log(`PROCESSO CONCLUÍDO: ${manifest.length}/${captureList.length} TELAS REAIS CAPTURADAS`);
  console.log(`Manifesto salvo em: ${manifestPath}`);
  console.log(`===============================================================\n`);
}

captureAllRealScreenshots().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
