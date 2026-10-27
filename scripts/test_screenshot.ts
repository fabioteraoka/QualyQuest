import { chromium } from 'playwright';
import path from 'path';

async function testClickCapture() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 }
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  console.log('Clicando em "Lista de colaboradores"...');
  await page.click('button:has-text("Lista de colaboradores")');
  await page.waitForTimeout(2000);

  const filePath = path.resolve('public/screenshots_real/test_colab.png');
  await page.screenshot({ path: filePath, fullPage: false });
  console.log('Salvo em:', filePath);

  await browser.close();
}

testClickCapture().catch(console.error);
