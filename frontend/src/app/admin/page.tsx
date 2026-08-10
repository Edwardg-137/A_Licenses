'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { STATUS_META } from '@/lib/constants';

interface DashboardData {
  generatedAt: string;
  summary: {
    totalApplications: number;
    licensesIssued: number;
    inReview: number;
    inCorrection: number;
    pendingPayment: number;
    pendingUserApprovals: number;
  };
  byStatus: { status: string; count: number }[];
  avgDaysByPhase: { status: string; avgDays: number | null; samples: number }[];
  topObservedDocuments: { code: string; name: string; count: number }[];
  recentActivity: {
    id: string;
    action: string;
    fromStatus: string | null;
    toStatus: string | null;
    createdAt: string;
    userName: string | null;
    applicationId: string | null;
    formCode: string | null;
  }[];
}

function Kpi({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const inner = (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
  return href ? (
    <Link href={href} className="block transition hover:ring-2 hover:ring-primary-200">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<DashboardData>('/reports/dashboard'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'ADMIN') {
      router.replace('/');
      return;
    }
    load();
  }, [user, router, load]);

  if (!user || user.role !== 'ADMIN') return null;

  const maxStatusCount = Math.max(1, ...(data?.byStatus.map((s) => s.count) ?? [1]));

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-6xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Resumen operativo del tenant ·{' '}
              {data
                ? new Date(data.generatedAt).toLocaleString('es-GT')
                : 'cargando…'}
            </p>
          </div>
          <button
            onClick={load}
            className="rounded border bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Actualizar
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {!data && !error && (
          <p className="mt-6 text-sm text-gray-500">Cargando métricas…</p>
        )}

        {data && (
          <>
            <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Kpi label="Expedientes" value={data.summary.totalApplications} href="/revisor" />
              <Kpi label="Licencias" value={data.summary.licensesIssued} />
              <Kpi label="En revisión" value={data.summary.inReview} href="/revisor" />
              <Kpi label="En corrección" value={data.summary.inCorrection} href="/revisor" />
              <Kpi label="Pend. pago" value={data.summary.pendingPayment} href="/revisor" />
              <Kpi
                label="Usuarios pend."
                value={data.summary.pendingUserApprovals}
                href="/admin/usuarios"
              />
            </section>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-lg border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Expedientes por estado</h2>
                <ul className="mt-4 space-y-2">
                  {data.byStatus
                    .filter((s) => s.count > 0)
                    .map((s) => {
                      const meta = STATUS_META[s.status];
                      const pct = Math.round((s.count / maxStatusCount) * 100);
                      return (
                        <li key={s.status}>
                          <div className="mb-0.5 flex justify-between text-sm">
                            <span>{meta?.label ?? s.status}</span>
                            <span className="font-medium">{s.count}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded bg-gray-100">
                            <div
                              className="h-full rounded bg-primary-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  {data.byStatus.every((s) => s.count === 0) && (
                    <li className="text-sm text-gray-500">Sin expedientes aún.</li>
                  )}
                </ul>
              </section>

              <section className="rounded-lg border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Tiempo promedio por fase</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Días promedio que un expediente permanece en cada estado (según auditoría).
                </p>
                {data.avgDaysByPhase.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-500">
                    Aún no hay suficientes transiciones para calcular promedios.
                  </p>
                ) : (
                  <table className="mt-4 w-full text-left text-sm">
                    <thead>
                      <tr className="border-b text-xs text-gray-500">
                        <th className="pb-2 font-medium">Fase</th>
                        <th className="pb-2 font-medium">Promedio (días)</th>
                        <th className="pb-2 font-medium">Muestras</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.avgDaysByPhase.map((row) => (
                        <tr key={row.status} className="border-b border-gray-100">
                          <td className="py-2">{STATUS_META[row.status]?.label ?? row.status}</td>
                          <td className="py-2 font-medium">{row.avgDays ?? '—'}</td>
                          <td className="py-2 text-gray-500">{row.samples}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-lg border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Documentos más observados</h2>
                {data.topObservedDocuments.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-500">Sin observaciones registradas.</p>
                ) : (
                  <ol className="mt-4 space-y-2">
                    {data.topObservedDocuments.map((doc, i) => (
                      <li
                        key={doc.code}
                        className="flex items-center justify-between rounded border border-gray-100 px-3 py-2 text-sm"
                      >
                        <span>
                          <span className="mr-2 text-gray-400">{i + 1}.</span>
                          <strong>{doc.code}</strong> — {doc.name}
                        </span>
                        <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                          {doc.count}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="rounded-lg border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Actividad reciente</h2>
                <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                  {data.recentActivity.map((a) => (
                    <li key={a.id} className="border-b border-gray-100 pb-2 text-sm last:border-0">
                      <p className="text-gray-800">{a.action}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {a.userName ?? 'Sistema'}
                        {a.formCode ? ` · ${a.formCode}` : ''}
                        {a.applicationId ? (
                          <>
                            {' · '}
                            <Link
                              href={`/revisor/expedientes/${a.applicationId}`}
                              className="text-primary-600 hover:underline"
                            >
                              ver
                            </Link>
                          </>
                        ) : null}
                        {' · '}
                        {new Date(a.createdAt).toLocaleString('es-GT')}
                      </p>
                    </li>
                  ))}
                  {data.recentActivity.length === 0 && (
                    <li className="text-sm text-gray-500">Sin actividad registrada.</li>
                  )}
                </ul>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
