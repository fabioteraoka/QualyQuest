import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { NCRecord, OrganizationRecord } from '../types';
import { getFullOfficialDocumentHTML } from './officialFormTemplate';

/**
 * Downloads the official F 001-29 Non-Conformity form as a high-resolution,
 * pixel-perfect A4 PDF with all borders, headers, tables, and typography intact.
 */
export async function downloadOfficialNCPDF(nc: NCRecord, organization?: OrganizationRecord | null): Promise<boolean> {
  try {
    // 1. Create a temporary off-screen container with the full styled HTML
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '820px';
    container.style.backgroundColor = '#ffffff';
    container.style.zIndex = '-1000';
    container.innerHTML = getFullOfficialDocumentHTML(nc, organization);

    // Remove the no-print button from container
    const noPrintBtn = container.querySelector('.no-print');
    if (noPrintBtn) {
      noPrintBtn.remove();
    }

    document.body.appendChild(container);

    const formElement = container.querySelector('.rnc-official-form') as HTMLElement || container;

    // 2. Render to high-DPI canvas
    const canvas = await html2canvas(formElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 850,
    });

    // Cleanup container immediately
    document.body.removeChild(container);

    const imgData = canvas.toDataURL('image/png');

    // 3. Create A4 PDF (210mm x 297mm)
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const margin = 8;
    const imgWidth = pdfWidth - (margin * 2);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    // First page
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= (pdfHeight - (margin * 2));

    // Multi-page if necessary
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - (margin * 2));
    }

    // 4. Save file
    const filename = `Ficha_RNC_${nc.numeroNC || 'registro'}.pdf`;
    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Erro ao gerar PDF oficial:', error);
    return false;
  }
}

/**
 * Opens the fully formatted official F 001-29 form in a new tab with complete styling
 * and auto-print trigger. If popups are blocked, downloads as a self-contained HTML file.
 */
export function openOfficialNCPrintWindow(nc: NCRecord, organization?: OrganizationRecord | null): void {
  const fullHtml = getFullOfficialDocumentHTML(nc, organization);
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  const win = window.open(blobUrl, '_blank');
  if (!win || win.closed || typeof win.closed === 'undefined') {
    // If popup is blocked by browser, trigger direct file download
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `Ficha_RNC_${nc.numeroNC || 'registro'}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Generic PDF downloader for any HTML element
 */
export async function downloadElementAsPDF(
  element: HTMLElement,
  filename = 'Relatorio'
): Promise<boolean> {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const margin = 10;
    const imgWidth = pdfWidth - (margin * 2);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= (pdfHeight - (margin * 2));

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - (margin * 2));
    }

    const cleanName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(cleanName);
    return true;
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return false;
  }
}

/**
 * Generic print handler
 */
export async function printElement(
  element: HTMLElement | null,
  documentTitle = 'Relatorio_SGQ'
): Promise<void> {
  if (!element) {
    window.print();
    return;
  }

  try {
    await downloadElementAsPDF(element, documentTitle);
  } catch (e) {
    window.print();
  }
}
