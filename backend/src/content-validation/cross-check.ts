import { CrossCheckIssue } from './types';
import { normalizeCui, normalizeNit } from './nit';

function asStr(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function digits(value: string): string {
  return value.replace(/\D/g, '');
}

function closeAmount(a: number, b: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return Math.abs(a - b) < 1;
  return Math.abs(a - b) / Math.abs(b) <= 0.05;
}

/**
 * Cruza campos extraídos de documentos con el formulario (Fase C / C1).
 * Los mismatches son warn salvo NIT/CUI claramente distinto (fail).
 */
export function crossCheckFormAndDocuments(input: {
  formData: Record<string, unknown>;
  documents: {
    code: string;
    extracted?: Record<string, string | number | boolean | null>;
  }[];
  collegeNumber?: string | null;
  paymentAmount?: number | null;
}): CrossCheckIssue[] {
  const issues: CrossCheckIssue[] = [];
  const formNit = normalizeNit(asStr(input.formData.nitPropietario));
  const formFinca = asStr(input.formData.finca).toLowerCase();
  const formFolio = asStr(input.formData.folio).toLowerCase();
  const formLibro = asStr(input.formData.libro).toLowerCase();
  const formDir = asStr(input.formData.direccionExacta).toLowerCase();
  const formPresupuesto = Number(input.formData.presupuestoEstimadoQ ?? NaN);

  const byCode = new Map(input.documents.map((d) => [d.code, d.extracted ?? {}]));
  const dpi = byCode.get('D-01') ?? {};
  const d14 = byCode.get('D-14') ?? {};
  const d02 = byCode.get('D-02') ?? {};
  const d03 = byCode.get('D-03') ?? {};
  const d12 = byCode.get('D-12') ?? {};
  const d15 = byCode.get('D-15') ?? {};

  const dpiCui = normalizeCui(asStr(dpi.cui));
  if (formNit && formNit !== 'CF' && dpiCui && digits(formNit) === dpiCui) {
    // NIT a veces se confunde con CUI; no es error.
  } else if (formNit && formNit !== 'CF' && dpiCui && digits(formNit) !== dpiCui && formNit.length >= 8) {
    issues.push({
      severity: 'warn',
      fields: ['nitPropietario', 'D-01.cui'],
      message: `El NIT del formulario (${formNit}) no coincide con el CUI leído del DPI (${dpiCui})`,
    });
  }

  const d14Nit = normalizeNit(asStr(d14.nit));
  if (formNit && d14Nit && formNit !== 'CF' && d14Nit !== 'CF' && formNit !== d14Nit) {
    issues.push({
      severity: 'fail',
      fields: ['nitPropietario', 'D-14.nit'],
      message: `El NIT del formulario (${formNit}) no coincide con el del D-14 (${d14Nit})`,
    });
  }

  for (const [code, extracted] of [
    ['D-02', d02],
    ['D-03', d03],
    ['D-14', d14],
  ] as const) {
    const finca = asStr(extracted.finca).toLowerCase();
    const folio = asStr(extracted.folio).toLowerCase();
    const libro = asStr(extracted.libro).toLowerCase();
    if (finca && formFinca && finca !== formFinca) {
      issues.push({
        severity: 'warn',
        fields: ['finca', `${code}.finca`],
        message: `Finca del formulario (${formFinca}) distinta a la de ${code} (${finca})`,
      });
    }
    if (folio && formFolio && folio !== formFolio) {
      issues.push({
        severity: 'warn',
        fields: ['folio', `${code}.folio`],
        message: `Folio del formulario distinto al de ${code}`,
      });
    }
    if (libro && formLibro && libro !== formLibro) {
      issues.push({
        severity: 'warn',
        fields: ['libro', `${code}.libro`],
        message: `Libro del formulario distinto al de ${code}`,
      });
    }
  }

  const d14Dir = asStr(d14.direccion).toLowerCase();
  if (formDir && d14Dir && formDir.length > 8 && d14Dir.length > 8) {
    const a = formDir.replace(/\s+/g, ' ');
    const b = d14Dir.replace(/\s+/g, ' ');
    if (!a.includes(b.slice(0, 12)) && !b.includes(a.slice(0, 12))) {
      issues.push({
        severity: 'warn',
        fields: ['direccionExacta', 'D-14.direccion'],
        message: 'La dirección del formulario no se parece a la del D-14',
      });
    }
  }

  const presupuestoDoc = Number(d12.totalQuetzales ?? NaN);
  if (Number.isFinite(formPresupuesto) && Number.isFinite(presupuestoDoc) && formPresupuesto > 0) {
    if (!closeAmount(formPresupuesto, presupuestoDoc)) {
      issues.push({
        severity: 'warn',
        fields: ['presupuestoEstimadoQ', 'D-12.totalQuetzales'],
        message: `Presupuesto del formulario (Q ${formPresupuesto}) distinto al del D-12 (Q ${presupuestoDoc})`,
      });
    }
  }

  const paid = Number(d15.montoQuetzales ?? NaN);
  if (input.paymentAmount != null && Number.isFinite(paid) && paid > 0) {
    if (!closeAmount(input.paymentAmount, paid)) {
      issues.push({
        severity: 'warn',
        fields: ['payment.amount', 'D-15.montoQuetzales'],
        message: `El monto del comprobante D-15 (Q ${paid}) no coincide con la tasa (Q ${input.paymentAmount})`,
      });
    }
  }

  const college = asStr(input.collegeNumber);
  if (college && asStr(d14.fullName) && college.length >= 3) {
    // no-op: el nombre del profesional en D-14 rara vez incluye el número de colegiado de forma fiable
  }

  return issues;
}
