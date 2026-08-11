/**
 * Clasificación municipal F08 vs F02 (Inc. A — ampliación de tipos).
 * Fuente: Docs/implementations/2026-08-ampliacion-tipos-formularios-mapeo.md
 */

export type UsoInmueble = 'RESIDENCIAL' | 'MIXTO' | 'COMERCIAL' | 'INDUSTRIAL';

export interface ClassifyInput {
  uso: UsoInmueble;
  areaConstruccionM2: number;
  centroHistorico?: boolean;
  cambioUsoSuelo?: boolean;
}

export interface ClassifyResult {
  formCode: 'F08' | 'F02' | null;
  licenseTypeCode: 'L-01' | 'L-02' | null;
  available: boolean;
  reasons: string[];
}

export function classifyProject(form: ClassifyInput): ClassifyResult {
  const reasons: string[] = [];
  const area = Number(form.areaConstruccionM2);

  if (!Number.isFinite(area) || area <= 0) {
    reasons.push('Ingrese un área de construcción válida');
    return { formCode: null, licenseTypeCode: null, available: false, reasons };
  }

  if (area > 700) {
    reasons.push(
      'El área de construcción supera los 700 m²; el trámite en línea no está disponible (debe proceder presencialmente)',
    );
    return { formCode: null, licenseTypeCode: null, available: false, reasons };
  }

  if (form.centroHistorico) {
    reasons.push(
      'Los inmuebles en Centro Histórico / conjuntos históricos requieren dictamen del IDAEH y trámite presencial',
    );
    return { formCode: null, licenseTypeCode: null, available: false, reasons };
  }

  // F08: vivienda unifamiliar residencial ≤ 700 m², sin cambio de uso de suelo
  if (form.uso === 'RESIDENCIAL' && !form.cambioUsoSuelo) {
    return { formCode: 'F08', licenseTypeCode: 'L-01', available: true, reasons: [] };
  }

  // F02 obra: mixto / comercial / industrial, o residencial con cambio de uso (31–700 m²)
  const isF02Uso =
    form.uso === 'MIXTO' ||
    form.uso === 'COMERCIAL' ||
    form.uso === 'INDUSTRIAL' ||
    (form.uso === 'RESIDENCIAL' && Boolean(form.cambioUsoSuelo));

  if (isF02Uso) {
    if (area < 31) {
      reasons.push(
        'Para este perfil, el F02 en línea aplica de 31 a 700 m². Bajo 31 m² use modificaciones ligeras (F11, próximamente) o Ventanilla Única presencial',
      );
      return { formCode: null, licenseTypeCode: null, available: false, reasons };
    }
    return { formCode: 'F02', licenseTypeCode: 'L-02', available: true, reasons: [] };
  }

  reasons.push('No se pudo clasificar el proyecto para trámite en línea');
  return { formCode: null, licenseTypeCode: null, available: false, reasons };
}
