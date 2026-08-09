/**
 * Genera un PDF mínimo válido (una página, texto Helvetica) sin dependencias.
 * Suficiente para el comprobante de pago simulado del MVP; la licencia de la
 * Fase 5 usará un generador formal.
 */

function escapePdfText(text: string): string {
  return text
    .replace(/[^\x20-\x7E\xA1-\xFF]/g, '') // solo Latin-1 imprimible
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

export function buildSimplePdf(title: string, lines: string[]): Buffer {
  const contentLines = [
    'BT /F1 16 Tf 50 780 Td (' + escapePdfText(title) + ') Tj ET',
    ...lines.map(
      (line, i) => `BT /F1 11 Tf 50 ${745 - i * 18} Td (${escapePdfText(line)}) Tj ET`,
    ),
  ];
  const content = contentLines.join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, 'binary');
}
