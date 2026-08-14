import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { FieldCheck } from './types';

const MIN_IMAGE_EDGE = 500;
const MIN_SHARPNESS = 12;
const MIN_PDF_BYTES = 1500;

async function imageSharpness(buffer: Buffer): Promise<{ width: number; height: number; sharpness: number }> {
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const raw = await sharp(buffer)
    .greyscale()
    .resize(400, 400, { fit: 'inside' })
    .convolve({
      width: 3,
      height: 3,
      kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0],
    })
    .raw()
    .toBuffer();
  const n = raw.length || 1;
  let mean = 0;
  for (let i = 0; i < raw.length; i++) mean += raw[i];
  mean /= n;
  let variance = 0;
  for (let i = 0; i < raw.length; i++) {
    const d = raw[i] - mean;
    variance += d * d;
  }
  variance /= n;
  return { width, height, sharpness: Math.round(Math.sqrt(variance) * 10) / 10 };
}

/** Calidad local: resolución/nitidez en JPG y páginas en PDF. DWG se omite. */
export async function assessQuality(buffer: Buffer, mimeType: string): Promise<FieldCheck> {
  if (mimeType === 'image/vnd.dwg') {
    return {
      status: 'skip',
      message: 'Los planos DWG no se analizan por visión; el revisor validará el archivo',
    };
  }

  if (mimeType === 'application/pdf') {
    if (buffer.length < MIN_PDF_BYTES) {
      return { status: 'fail', message: 'El PDF es demasiado pequeño; parece vacío o corrupto' };
    }
    try {
      const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pages = pdf.getPageCount();
      if (pages < 1) {
        return { status: 'fail', message: 'El PDF no tiene páginas' };
      }
      return {
        status: 'ok',
        message: `PDF con ${pages} página(s)`,
        evidence: { pages, bytes: buffer.length },
      };
    } catch {
      return { status: 'fail', message: 'No se pudo leer el PDF; el archivo puede estar dañado' };
    }
  }

  if (mimeType === 'image/jpeg' || mimeType === 'image/png') {
    try {
      const { width, height, sharpness } = await imageSharpness(buffer);
      if (width < MIN_IMAGE_EDGE || height < MIN_IMAGE_EDGE) {
        return {
          status: 'fail',
          message: `La imagen es demasiado pequeña (${width}×${height} px). Use un escaneo o foto más nítida.`,
          evidence: { width, height, sharpness },
        };
      }
      if (sharpness < MIN_SHARPNESS) {
        return {
          status: 'fail',
          message: 'La imagen está borrosa o poco legible. Vuelva a fotografiar ambas caras con mejor luz.',
          evidence: { width, height, sharpness },
        };
      }
      return {
        status: 'ok',
        message: `Imagen nítida (${width}×${height} px)`,
        evidence: { width, height, sharpness },
      };
    } catch {
      return { status: 'fail', message: 'No se pudo analizar la imagen; verifique que no esté corrupta' };
    }
  }

  return { status: 'skip', message: `Sin chequeo de calidad para ${mimeType}` };
}
