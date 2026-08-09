/** Etiquetas y colores de los estados del expediente (ApplicationStatus del backend). */
export const STATUS_META: Record<string, { label: string; classes: string }> = {
  BORRADOR: { label: 'Borrador', classes: 'bg-gray-200 text-gray-800' },
  EN_VALIDACION: { label: 'En validación automática', classes: 'bg-blue-100 text-blue-800' },
  OBSERVADO_FORMATO: { label: 'Observado (formato)', classes: 'bg-orange-100 text-orange-800' },
  EN_REVISION_TECNICA: { label: 'En revisión técnica', classes: 'bg-blue-100 text-blue-800' },
  EN_CORRECCION: { label: 'En corrección', classes: 'bg-orange-100 text-orange-800' },
  ALINEACION_PROGRAMADA: { label: 'Alineación territorial', classes: 'bg-purple-100 text-purple-800' },
  PENDIENTE_DE_PAGO: { label: 'Pendiente de pago', classes: 'bg-yellow-100 text-yellow-800' },
  LICENCIA_EMITIDA: { label: 'Licencia emitida', classes: 'bg-green-100 text-green-800' },
  RECHAZADO: { label: 'Rechazado', classes: 'bg-red-100 text-red-800' },
  RECEPCION_DE_OBRA: { label: 'Recepción de obra', classes: 'bg-teal-100 text-teal-800' },
  CERRADO: { label: 'Cerrado', classes: 'bg-gray-200 text-gray-800' },
};

export const ROLE_LABEL: Record<string, string> = {
  SOLICITANTE: 'Solicitante',
  REVISOR: 'Revisor',
  INSPECTOR: 'Inspector',
  ADMIN: 'Administrador',
  SUPERADMIN: 'Superadministrador',
};

export const ZONAS_GUATEMALA = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '24', '25',
];

/** Enlaces del onboarding pre-trámite (mvp_docs/03-flujo §2). */
export const PRE_TRAMITE_LINKS = [
  {
    id: 'pot',
    label: 'Verifiqué la zonificación POT del predio (G0–G5)',
    url: 'https://vu.muniguate.com',
    urlLabel: 'vu.muniguate.com',
  },
  {
    id: 'uso_suelo',
    label: 'Confirmé que el uso de suelo es compatible con el proyecto',
    url: 'https://www.muniguate.com',
    urlLabel: 'Portal municipal',
  },
  {
    id: 'marn',
    label: 'Obtuve la resolución ambiental del MARN (BIAWEB, Categoría C/CR)',
    url: 'https://app.vac.com.gt',
    urlLabel: 'app.vac.com.gt / BIAWEB',
  },
  {
    id: 'solvencias',
    label: 'Tengo las solvencias: IUSI, agua, certificación RGP y NIT/RTU',
    url: 'https://declaraguate.sat.gob.gt',
    urlLabel: 'Agencia Virtual SAT',
  },
];
