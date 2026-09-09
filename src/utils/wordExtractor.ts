import mammoth from 'mammoth';

/**
 * Extracts plain text content from a Word document (.docx) file.
 * Compatible with modern browser runtime and Node.js.
 */
export async function extractTextFromWordFile(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value?.trim() || '';
  } catch (error) {
    console.warn('Mammoth in-browser docx extraction failed, attempting fallback:', error);
    // If it's a binary doc or complex xml, try reading as text or returning empty to let server handle it
    try {
      const text = await file.text();
      // Remove binary garbage characters
      const clean = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');
      if (clean.length > 50 && (clean.includes('NÃO CONFORMIDADE') || clean.includes('REGISTRO') || clean.includes('NC'))) {
        return clean.trim();
      }
    } catch {
      // ignore
    }
    return '';
  }
}

/**
 * Checks if a file is a Word document (.docx, .doc).
 */
export function isWordDocument(fileName: string, mimeType?: string): boolean {
  const lowerName = (fileName || '').toLowerCase();
  const lowerMime = (mimeType || '').toLowerCase();

  return (
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.doc') ||
    lowerName.endsWith('.dotx') ||
    lowerMime.includes('wordprocessingml') ||
    lowerMime.includes('msword') ||
    lowerMime.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  );
}
