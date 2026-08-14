/** Resultados de validación de contenido (formulario y documentos). */

export type CheckStatus = 'ok' | 'warn' | 'fail' | 'skip';

export interface FieldCheck {
  status: CheckStatus;
  message: string;
  evidence?: Record<string, unknown>;
}

export interface FormValidation {
  overall: CheckStatus;
  nit: FieldCheck;
  address: FieldCheck;
  rgp: FieldCheck;
  engines: {
    nit: string;
    address: string;
  };
}

export interface ContentIssue {
  severity: 'fail' | 'warn';
  code: string;
  message: string;
}

export interface ContentCheck {
  overall: CheckStatus;
  quality: FieldCheck;
  semantic: FieldCheck;
  extracted: Record<string, string | number | boolean | null>;
  issues: ContentIssue[];
  engine: string;
  analyzedAt: string;
}

export interface CrossCheckIssue {
  severity: 'fail' | 'warn';
  message: string;
  fields: string[];
}

export function worstStatus(statuses: CheckStatus[]): CheckStatus {
  if (statuses.includes('fail')) return 'fail';
  if (statuses.includes('warn')) return 'warn';
  if (statuses.every((s) => s === 'skip')) return 'skip';
  return 'ok';
}
