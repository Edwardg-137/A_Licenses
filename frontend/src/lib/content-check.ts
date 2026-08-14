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
  engines?: { nit: string; address: string };
}

export interface ContentIssue {
  severity: 'fail' | 'warn';
  code: string;
  message: string;
}

export interface ContentCheck {
  overall?: CheckStatus;
  quality?: FieldCheck;
  semantic?: FieldCheck;
  extracted?: Record<string, string | number | boolean | null>;
  issues?: ContentIssue[];
  engine?: string;
  analyzedAt?: string;
}

export interface CrossCheckIssue {
  severity: 'fail' | 'warn';
  message: string;
  fields: string[];
}

export function statusLabel(status: CheckStatus | undefined): string {
  switch (status) {
    case 'ok':
      return 'Válido';
    case 'warn':
      return 'Revisar';
    case 'fail':
      return 'Rechazado';
    case 'skip':
      return 'Sin análisis';
    default:
      return 'Pendiente';
  }
}

export function statusClasses(status: CheckStatus | undefined): string {
  switch (status) {
    case 'ok':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'warn':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'fail':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'skip':
      return 'bg-gray-100 text-gray-600 border-gray-200';
    default:
      return 'bg-gray-50 text-gray-500 border-gray-200';
  }
}
