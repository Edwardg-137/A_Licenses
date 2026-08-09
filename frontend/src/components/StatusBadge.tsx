import { STATUS_META } from '@/lib/constants';

export default function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, classes: 'bg-gray-200 text-gray-800' };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${meta.classes}`}>
      {meta.label}
    </span>
  );
}
