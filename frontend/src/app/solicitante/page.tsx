'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import StatusBadge from '@/components/StatusBadge';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface ApplicationRow {
  id: string;
  status: string;
  formCode: string;
  formData: { direccionExacta?: string };
  createdAt: string;
  updatedAt: string;
  licenseType: { code: string; name: string };
}

export default function SolicitantePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setApplications(await api<ApplicationRow[]>('/applications'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'SOLICITANTE') {
      router.replace('/');
      return;
    }
    load();
  }, [user, router, load]);

  if (!user || user.role !== 'SOLICITANTE') return null;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mis expedientes</h1>
            <p className="text-sm text-gray-600">
              Licencias de construcción — Obra Mayor, Vivienda Unifamiliar (F08)
            </p>
          </div>
          <Link
            href="/solicitante/nueva"
            className="rounded bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
          >
            + Nueva solicitud
          </Link>
        </div>

        {error && (
          <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 overflow-hidden rounded-lg border bg-white">
          {loading ? (
            <p className="p-6 text-sm text-gray-500">Cargando…</p>
          ) : applications.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-600">Aún no tiene expedientes.</p>
              <Link
                href="/solicitante/nueva"
                className="mt-2 inline-block text-primary-600 hover:underline"
              >
                Crear la primera solicitud de licencia
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Dirección del inmueble</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Última actualización</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <span className="font-medium">{a.licenseType.code}</span>{' '}
                      <span className="text-gray-500">({a.formCode})</span>
                    </td>
                    <td className="p-3">{a.formData?.direccionExacta ?? '—'}</td>
                    <td className="p-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="p-3 text-gray-600">
                      {new Date(a.updatedAt).toLocaleDateString('es-GT')}
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/solicitante/expedientes/${a.id}`}
                        className="text-primary-600 hover:underline"
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
