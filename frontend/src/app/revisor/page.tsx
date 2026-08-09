'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
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

export default function RevisorPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-bold">Bandeja de expedientes</h1>
        <p className="mt-1 text-sm text-gray-600">
          Expedientes de la municipalidad con filtros por estado y fecha.
        </p>

        {/* Filtros */}
        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4 text-sm">
          <div>
            <label className="block text-xs text-gray-500">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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
              setStatusFilter('');
              setFrom('');
              setTo('');
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
            <p className="p-6 text-sm text-gray-500">
              No hay expedientes con los filtros seleccionados.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Solicitante</th>
                  <th className="p-3">Dirección</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Revisor asignado</th>
                  <th className="p-3">Enviado</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{a.licenseType.code}</td>
                    <td className="p-3">{a.applicant.fullName}</td>
                    <td className="p-3">{a.formData?.direccionExacta ?? '—'}</td>
                    <td className="p-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="p-3 text-gray-600">{a.reviewer?.fullName ?? 'Sin asignar'}</td>
                    <td className="p-3 text-gray-600">
                      {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString('es-GT') : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/revisor/expedientes/${a.id}`}
                        className="text-primary-600 hover:underline"
                      >
                        Revisar
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
