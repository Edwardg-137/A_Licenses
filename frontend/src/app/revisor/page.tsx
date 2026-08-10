'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import StatusBadge from '@/components/StatusBadge';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { STATUS_META } from '@/lib/constants';

interface ApplicationRow {
  id: string;
  status: string;
  formCode: string;
  formData: { direccionExacta?: string };
  createdAt: string;
  submittedAt: string | null;
  applicant: { fullName: string; email: string };
  reviewer: { fullName: string } | null;
  licenseType: { code: string; name: string };
}

function RevisorBandeja() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Sincroniza el filtro si se llega desde el dashboard con ?status=
  useEffect(() => {
    setStatusFilter(searchParams.get('status') ?? '');
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    try {
      setApplications(await api<ApplicationRow[]>(`/applications?${params.toString()}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, from, to]);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!['REVISOR', 'ADMIN'].includes(user.role)) {
      router.replace('/');
      return;
    }
    load();
  }, [user, router, load]);

  if (!user || !['REVISOR', 'ADMIN'].includes(user.role)) return null;

  function updateStatusFilter(value: string) {
    setStatusFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('status', value);
    else params.delete('status');
    const qs = params.toString();
    router.replace(qs ? `/revisor?${qs}` : '/revisor');
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-bold">Bandeja de expedientes</h1>
        <p className="mt-1 text-sm text-gray-600">
          Expedientes de la municipalidad con filtros por estado y fecha.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4 text-sm">
          <div>
            <label className="block text-xs text-gray-500">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => updateStatusFilter(e.target.value)}
              className="mt-1 rounded border px-3 py-2"
            >
              <option value="">Todos</option>
              {Object.entries(STATUS_META).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 rounded border px-3 py-2"
            />
          </div>
          <button
            onClick={() => {
              setFrom('');
              setTo('');
              updateStatusFilter('');
            }}
            className="rounded border px-3 py-2 hover:bg-gray-100"
          >
            Limpiar
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 overflow-hidden rounded-lg border bg-white">
          {loading ? (
            <p className="p-6 text-sm text-gray-500">Cargando…</p>
          ) : applications.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No hay expedientes con estos filtros.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Expediente</th>
                  <th className="px-4 py-3 font-medium">Solicitante</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Enviado</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {app.licenseType.code} · {app.formCode}
                      </p>
                      <p className="text-xs text-gray-500">
                        {app.formData?.direccionExacta ?? 'Sin dirección'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{app.applicant.fullName}</p>
                      <p className="text-xs text-gray-500">{app.applicant.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {app.submittedAt
                        ? new Date(app.submittedAt).toLocaleDateString('es-GT')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/revisor/expedientes/${app.id}`}
                        className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

export default function RevisorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <Header />
          <main className="mx-auto max-w-6xl p-6 text-sm text-gray-500">Cargando…</main>
        </div>
      }
    >
      <RevisorBandeja />
    </Suspense>
  );
}
