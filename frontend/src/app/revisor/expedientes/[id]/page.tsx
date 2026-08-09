'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import StatusBadge from '@/components/StatusBadge';
import { api, ApiError, openDocumentPreview } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface CurrentDocument {
  id: string;
  requirementId: string;
  version: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

interface ApplicationDetail {
  id: string;
  status: string;
  formCode: string;
  formData: Record<string, string | number | boolean | undefined>;
  applicant: {
    fullName: string;
    email: string;
    collegeType: string | null;
    collegeNumber: string | null;
  };
  reviewer: { fullName: string } | null;
  licenseType: {
    code: string;
    name: string;
    requirements: {
      id: string;
      code: string;
      name: string;
      stage: string;
      allowedMimeTypes: string[];
    }[];
  };
  documents: CurrentDocument[];
}

export default function RevisorExpedientePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDetail(await api<ApplicationDetail>(`/applications/${params.id}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }, [params.id]);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!['REVISOR', 'ADMIN', 'INSPECTOR'].includes(user.role)) {
      router.replace('/');
      return;
    }
    load();
  }, [user, router, load]);

  if (!user) return null;

  const docByRequirement = new Map(detail?.documents.map((d) => [d.requirementId, d]));

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl p-6">
        {error && (
          <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {!detail && !error && <p className="text-sm text-gray-500">Cargando…</p>}

        {detail && (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">
                  Expediente {detail.licenseType.code} · {detail.formCode}
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  {detail.applicant.fullName} ({detail.applicant.collegeType}{' '}
                  {detail.applicant.collegeNumber}) · {detail.applicant.email}
                </p>
                <p className="text-sm text-gray-600">
                  Revisor asignado: {detail.reviewer?.fullName ?? 'Sin asignar'}
                </p>
              </div>
              <StatusBadge status={detail.status} />
            </div>

            <section className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Datos del proyecto</h2>
              <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-gray-500">Dirección</dt>
                  <dd className="font-medium">{String(detail.formData.direccionExacta ?? '—')}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Zona</dt>
                  <dd className="font-medium">Zona {String(detail.formData.zona)}, Guatemala</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Área / Niveles</dt>
                  <dd className="font-medium">
                    {String(detail.formData.areaConstruccionM2)} m² ·{' '}
                    {String(detail.formData.niveles)} nivel(es)
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">RGP (finca / folio / libro)</dt>
                  <dd className="font-medium">
                    {String(detail.formData.finca)} / {String(detail.formData.folio)} /{' '}
                    {String(detail.formData.libro)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">NIT del propietario</dt>
                  <dd className="font-medium">{String(detail.formData.nitPropietario)}</dd>
                </div>
              </dl>
            </section>

            <section className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Documentos del expediente</h2>
              <p className="mt-1 text-sm text-gray-500">
                Vista de solo lectura. El marcado de observaciones estará disponible en la
                siguiente fase.
              </p>
              <ul className="mt-4 divide-y">
                {detail.licenseType.requirements.map((req) => {
                  const doc = docByRequirement.get(req.id);
                  return (
                    <li key={req.id} className="flex items-center justify-between py-3 text-sm">
                      <div>
                        <p className="font-medium">
                          {req.code} — {req.name}
                          {req.stage === 'PAGO' && (
                            <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                              Fase de pago
                            </span>
                          )}
                        </p>
                        {doc ? (
                          <p className="text-xs text-gray-500">
                            {doc.fileName} · v{doc.version} ·{' '}
                            {new Date(doc.uploadedAt).toLocaleString('es-GT')}
                          </p>
                        ) : (
                          <p className="text-xs text-red-600">No cargado</p>
                        )}
                      </div>
                      {doc && (
                        <button
                          onClick={() => openDocumentPreview(doc.id)}
                          className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100"
                        >
                          {doc.mimeType === 'application/pdf' || doc.mimeType === 'image/jpeg'
                            ? 'Ver'
                            : 'Descargar'}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
