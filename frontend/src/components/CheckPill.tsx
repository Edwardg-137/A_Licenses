'use client';

import { CheckStatus, statusClasses, statusLabel } from '@/lib/content-check';

export default function CheckPill({
  status,
  label,
}: {
  status?: CheckStatus;
  label?: string;
}) {
  if (!status) return null;
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${statusClasses(status)}`}
      title={label}
    >
      {label ?? statusLabel(status)}
    </span>
  );
}
