'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError, API_URL } from '@/lib/api';

interface VerifyPayload {
  valid: boolean;
  number: string;
  issuedAt: string;
  validUntil: string | null;
  status: string;
  tenant: string;
  licenseType: { code: string; name: string; formCode: string };
  project: {
    direccionExacta: string | null;
    zona: string | null;
    areaConstruccionM2: number | string | null;
    niveles: number | string | null;
    uso: string | null;
  };
  professional: {
    fullName: string;
    collegeType: string | null;
    collegeNumber: string | null;
  };
}

/** Vista pública de verificación de licencia (QR). Sin autenticación. */
export default function VerificarLicenciaPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<VerifyPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.token) return;
    (async () => {
      try {
        const response = await fetch(`${API_URL}/licenses/verify/${params.token}`);
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new ApiError(response.status, body?.message ?? 'Licencia no encontrada');
        }
        setData(body as VerifyPayload);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudo verificar la licencia');
      }
    })();
  }, [params.token]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 px-4 py-10">
      <div className="mx-auto max-w-xl rounded-xl border bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold tracking-wide text-primary-700">PermisoGT</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Verificación de licencia</h1>
        <p className="mt-1 text-sm text-gray-500">
          Consulta pública — no requiere iniciar sesión
        </p>

        {error && (
          <div className="mt-6 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {!data && !error && (
          <p className="mt-6 text-sm text-gray-500">Consultando…</p>
        )}

        {data && (
          <div className="mt-6 space-y-4">
            <div
              className={`rounded-lg border p-4 text-center ${
                data.valid
                  ? 'border-green-300 bg-green-50 text-green-900'
                  : 'border-red-300 bg-red-50 text-red-900'
              }`}
            >
              <p className="text-lg font-bold">
                {data.valid ? '✓ Licencia válida' : '✗ Licencia vencida o inválida'}
              </p>
              <p className="mt-1 font-mono text-sm">{data.number}</p>
            </div>

            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Municipalidad</dt>
                <dd className="font-medium">{data.tenant}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Tipo</dt>
                <dd className="font-medium">
                  {data.licenseType.code} · {data.licenseType.formCode}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Emitida</dt>
                <dd className="font-medium">
                  {new Date(data.issuedAt).toLocaleDateString('es-GT')}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Vigente hasta</dt>
                <dd className="font-medium">
                  {data.validUntil
                    ? new Date(data.validUntil).toLocaleDateString('es-GT')
                    : '—'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Proyecto</dt>
                <dd className="font-medium">
                  {String(data.project.direccionExacta ?? '—')}, Zona{' '}
                  {String(data.project.zona ?? '—')} ·{' '}
                  {String(data.project.areaConstruccionM2 ?? '—')} m² ·{' '}
                  {String(data.project.niveles ?? '—')} nivel(es) ·{' '}
                  {String(data.project.uso ?? '—')}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Profesional responsable</dt>
                <dd className="font-medium">
                  {data.professional.fullName}
                  {data.professional.collegeType
                    ? ` (${data.professional.collegeType} ${data.professional.collegeNumber ?? ''})`
                    : ''}
                </dd>
              </div>
            </dl>

            <p className="text-xs text-gray-400">
              Los datos mostrados corresponden al registro oficial en PermisoGT. Si el
              documento en papel no coincide, comuníquese con la municipalidad.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
