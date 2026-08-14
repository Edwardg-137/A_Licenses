/** Instrucciones por código de requisito para el modelo de visión. */

export function checklistFor(code: string, formCode: string): string {
  const common =
    'Responde SOLO JSON. Si no puedes ver algo, usa severity warn (no inventes datos). ' +
    'fail = problema evidente de alta confianza; warn = sospecha. ' +
    'extracted: usa null si no lees el dato.';

  const byCode: Record<string, string> = {
    'D-01':
      'Debe ser DPI de Guatemala (cédula). Comprueba: (1) se ven ANVERSO y REVERSO (foto + CUI), ' +
      'en una o dos páginas/fotos; (2) texto legible; (3) no recortado ni tapado; (4) extrae cui, ' +
      'fullName, fechaVencimiento si se ve. fail si falta una cara, no es un DPI, o es ilegible.',
    'D-02':
      'Certificación de Registro General de la Propiedad. Extrae finca, folio, libro y fechaEmision. ' +
      'warn si la fecha parece tener más de 3 meses. fail si no parece certificación RGP.',
    'D-03':
      'Escritura pública del inmueble. Busca notario, sello y finca/folio/libro. ' +
      'fail si es otro tipo de documento. warn si no se ve sello o firma.',
    'D-04':
      'Solvencia de IUSI municipal. fail si no parece solvencia de IUSI.',
    'D-05':
      'Solvencia de agua u otro servicio (EMPAGUA u similar). fail si el tipo no coincide.',
    'D-06':
      'Boleto de Ornato del año en curso (propietario y/o profesional). fail si no es boleto de ornato.',
    'D-07':
      'Resolución ambiental MARN / BIAWEB. Extrae categoria si aparece. fail si no parece resolución MARN.',
    'D-08':
      'Planos de arquitectura. Busca bloque de título, escala, sello o timbre profesional. ' +
      'warn si no se ve timbre. fail si es claramente otro documento (p. ej. foto de DPI).',
    'D-09':
      'Planos estructurales timbrados CIG/CAG. Igual que D-08, énfasis en sello estructural.',
    'D-10':
      'Planos de instalaciones (hidráulicas/eléctricas). fail si no parece un plano.',
    'D-11':
      'Memoria de cálculo estructural (texto técnico). fail si el PDF está vacío o es una imagen irrelevante.',
    'D-12':
      'Presupuesto estimado de obra. Extrae totalQuetzales (número). fail si no hay montos.',
    'D-13':
      'Cronograma de obra por etapas con fechas. warn si no hay fechas. fail si no parece cronograma.',
    'D-14':
      `Formulario municipal de solicitud ${formCode} (F08 vivienda o F02 comercial/mixto). ` +
      'Comprueba: (1) es ese formulario y no otro; (2) hay firma del propietario Y del profesional; ' +
      '(3) no hay tachones graves que impidan leer; (4) extrae nit, direccion, finca, folio, libro, cui si aparecen. ' +
      'fail si es otro formulario, faltan firmas o está ilegible/tachado de forma grave.',
    'D-15':
      'Comprobante de pago de tasa municipal. Extrae montoQuetzales y fecha. fail si no parece comprobante.',
    'D-16':
      'Factibilidad de Gestión Urbana (FGU). fail si el tipo no coincide.',
    'D-17':
      'Dictamen CONRED (NRD-1 / NRD-2). fail si no parece dictamen CONRED.',
    'D-18':
      'Planos de seguridad y evacuación. fail si no parece plano de seguridad.',
    'D-19':
      'Factibilidad de agua EMPAGUA. fail si el tipo no coincide.',
    'D-20':
      'Informe industrial. fail si no parece informe industrial.',
    'D-21':
      'Requisitos DMA por tala de árboles. fail si el tipo no coincide.',
  };

  return `${common}\nRequisito ${code}. ${byCode[code] ?? 'Clasifica si el archivo corresponde al requisito y lista issues.'}`;
}

export const VISION_JSON_SHAPE = `{
  "documentMatchesRequirement": boolean,
  "confidence": number,
  "issues": [{"severity": "fail" | "warn", "message": string}],
  "extracted": {
    "cui": string | null,
    "fullName": string | null,
    "nit": string | null,
    "direccion": string | null,
    "finca": string | null,
    "folio": string | null,
    "libro": string | null,
    "fechaEmision": string | null,
    "fechaVencimiento": string | null,
    "totalQuetzales": number | null,
    "montoQuetzales": number | null,
    "hasOwnerSignature": boolean | null,
    "hasProfessionalSignature": boolean | null,
    "bothDpiSides": boolean | null,
    "categoriaMarn": string | null
  }
}`;
