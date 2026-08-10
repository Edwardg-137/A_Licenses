import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as QRCode from 'qrcode';

export interface LicensePdfInput {
  number: string;
  tenantName: string;
  formCode: string;
  licenseTypeName: string;
  applicantName: string;
  collegeType: string | null;
  collegeNumber: string | null;
  direccion: string;
  zona: string;
  areaM2: string;
  niveles: string;
  uso: string;
  finca: string;
  folio: string;
  libro: string;
  nitPropietario: string;
  issuedAt: Date;
  validUntil: Date;
  verifyUrl: string;
  amountPaid: string;
}

/** Genera el PDF oficial de la licencia con QR de verificación embebido. */
export async function buildLicensePdf(input: LicensePdfInput): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]); // Letter
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const draw = (text: string, x: number, y: number, size = 11, bold = false) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
  };

  // Encabezado
  draw(input.tenantName.toUpperCase(), 50, 740, 14, true);
  draw('DIRECCIÓN DE OBRAS — LICENCIA DE CONSTRUCCIÓN', 50, 720, 12, true);
  draw(`Formulario ${input.formCode} · ${input.licenseTypeName}`, 50, 702, 10);

  page.drawLine({
    start: { x: 50, y: 690 },
    end: { x: 400, y: 690 },
    thickness: 1,
    color: rgb(0.2, 0.2, 0.2),
  });

  draw(`No. ${input.number}`, 50, 665, 16, true);
  draw(`Emitida: ${formatGt(input.issuedAt)}`, 50, 645, 10);
  draw(`Vigente hasta: ${formatGt(input.validUntil)}`, 50, 630, 10);

  // Datos del proyecto
  let y = 595;
  draw('DATOS DEL PROYECTO', 50, y, 12, true);
  y -= 20;
  const rows: [string, string][] = [
    ['Dirección', input.direccion],
    ['Zona / Municipio', `Zona ${input.zona}, Guatemala`],
    ['Área de construcción', `${input.areaM2} m²`],
    ['Niveles', input.niveles],
    ['Uso', input.uso],
    ['RGP (finca / folio / libro)', `${input.finca} / ${input.folio} / ${input.libro}`],
    ['NIT del propietario', input.nitPropietario],
    [
      'Profesional responsable',
      `${input.applicantName}${input.collegeType ? ` (${input.collegeType} ${input.collegeNumber ?? ''})` : ''}`,
    ],
    ['Tasa municipal pagada', `Q ${input.amountPaid}`],
  ];
  for (const [label, value] of rows) {
    draw(`${label}:`, 50, y, 9, true);
    draw(sanitize(value).slice(0, 70), 200, y, 9);
    y -= 16;
  }

  // QR
  const qrPng = await QRCode.toBuffer(input.verifyUrl, {
    type: 'png',
    width: 160,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
  const qrImage = await pdf.embedPng(qrPng);
  page.drawImage(qrImage, { x: 420, y: 620, width: 140, height: 140 });
  draw('Verificación pública', 430, 605, 8);
  draw('(escanee el código QR)', 430, 593, 8);

  // Pie
  page.drawLine({
    start: { x: 50, y: 120 },
    end: { x: 562, y: 120 },
    thickness: 0.5,
    color: rgb(0.5, 0.5, 0.5),
  });
  draw('Documento emitido digitalmente por PermisoGT.', 50, 100, 8);
  draw(`Verifique en: ${input.verifyUrl}`, 50, 88, 8);
  draw(
    'Este documento acredita la autorización municipal de construcción conforme al expediente aprobado.',
    50,
    72,
    8,
  );

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

function formatGt(date: Date): string {
  return date.toLocaleDateString('es-GT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** pdf-lib StandardFonts no soporta todos los caracteres; se normaliza a ASCII seguro. */
function sanitize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?');
}
