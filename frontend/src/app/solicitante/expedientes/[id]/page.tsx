'use client';

import { useParams, useRouter } from 'next/navigation';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import StatusBadge from '@/components/StatusBadge';
import { api, apiUpload, ApiError, openDocumentPreview } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface Requirement {
  id: string;
  code: string;
  name: string;
  helpText: string | null;
  allowedMimeTypes: string[];
  required: boolean;
  stage: string;
}

interface CurrentDocument {
  id: string;
  requirementId: string;
  version: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

interface ValidationItem {
  requirementId: string;
  code: string;
  valid: boolean;
  issues: string[];
  stage: string;
}

interface ApplicationDetail {
  id: string;
  status: string;
  formCode: string;
  formData: Record<string, string | number | boolean | undefined>;
  correctionRound: number;
  licenseType: { code: string; name: string; requirements: Requirement[] };
  documents: CurrentDocument[];
  validationReport: ValidationItem[];
}

const EDITABLE_STATES = ['BORRADOR', 'OBSERVADO_FORMATO'];

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function ExpedienteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

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
    if (user.role !== 'SOLICITANTE') {
      router.replace('/');
      return;
    }
    load();
  }, [user, router, load]);

  if (!user || user.role !== 'SOLICITANTE') return null;

  const editable = detail ? EDITABLE_STATES.includes(detail.status) : false;

  async function onUpload(requirementId: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setNotice(null);
    setUploadingId(requirementId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await apiUpload(`/applications/${params.id}/documents?requirementId=${requirementId}`, formData);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al subir el archivo');
    } finally {
      setUploadingId(null);
      if (fileInputs.current[requirementId]) fileInputs.current[requirementId]!.value = '';
    }
  }

  async function onValidate() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api(`/applications/${params.id}/validate`, { method: 'POST' });
      await load();
      setNotice('Verificación ejecutada. Revise el estado de cada documento.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api<{ status: string }>(`/applications/${params.id}/submit`, {
        method: 'POST',
      });
      await load();
      setNotice(
        result.status === 'EN_REVISION_TECNICA'
          ? 'Expediente enviado. Pasó la validación automática y está en revisión técnica.'
          : 'El expediente fue observado por formato. Corrija los documentos indicados y reenvíe.',
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  if (!detail && !error) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-5xl p-6 text-sm text-gray-500">Cargando…</main>
      </div>
    );
  }

  const docByRequirement = new Map(detail?.documents.map((d) => [d.requirementId, d]));
  const reportByRequirement = new Map(detail?.validationReport.map((v) => [v.requirementId, v]));
  const ingresoRequirements =
    detail?.licenseType.requirements.filter((r) => r.stage === 'INGRESO') ?? [];
  const pagoRequirements =
    detail?.licenseType.requirements.filter((r) => r.stage === 'PAGO') ?? [];
  const ingresoValid = ingresoRequirements.every(
    (r) => reportByRequirement.get(r.id)?.valid,
  );

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl p-6">
        {error && (
          <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p className="mb-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            {notice}
          </p>
        )}

        {detail && (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">
                  Expediente {detail.licenseType.code} · {detail.formCode}
                </h1>
                <p className="mt-1 text-sm text-gray-600">{detail.licenseType.name}</p>
              </div>
              <StatusBadge status={detail.status} />
            </div>

            {/* Datos del proyecto */}
            <section className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Datos del proyecto</h2>
              <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-gray-500">Dirección</dt>
                  <dd className="font-medium">{String(detail.formData.direccionExacta ?? '—')}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Zona / Municipio</dt>
                  <dd className="font-medium">Zona {String(detail.formData.zona)}, Guatemala</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Área de construcción</dt>
                  <dd className="font-medium">{String(detail.formData.areaConstruccionM2)} m²</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Niveles</dt>
                  <dd className="font-medium">{String(detail.formData.niveles)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Uso</dt>
                  <dd className="font-medium">{String(detail.formData.uso)}</dd>
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
                <div>
                  <dt className="text-gray-500">Profesional responsable</dt>
                  <dd className="font-medium">
                    {user.fullName} ({String(detail.formData.colegiadoTipo)}{' '}
                    {String(detail.formData.colegiadoNumero)})
                  </dd>
                </div>
              </dl>
            </section>

            {/* Documentos */}
            <section className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Documentos requeridos ({ingresoRequirements.length})
                </h2>
                {editable && (
                  <div className="flex gap-2">
                    <button
                      onClick={onValidate}
                      disabled={busy}
                      className="rounded border px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
                    >
                      Verificar antes de enviar
                    </button>
                    <button
                      onClick={onSubmit}
                      disabled={busy || !ingresoValid}
                      title={ingresoValid ? '' : 'Cargue todos los documentos y verifique antes de enviar'}
                      className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      Enviar expediente
                    </button>
                  </div>
                )}
              </div>

              <ul className="mt-4 space-y-3">
                {[...ingresoRequirements, ...pagoRequirements].map((req) => {
                  const doc = docByRequirement.get(req.id);
                  const report = reportByRequirement.get(req.id);
                  const isPagoStage = req.stage === 'PAGO';
                  return (
                    <li
                      key={req.id}
                      className={`rounded border p-4 ${
                        report && !report.valid && !isPagoStage
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium">
                            {req.code} — {req.name}
                            {isPagoStage && (
                              <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                                Se carga en la fase de pago
                              </span>
                            )}
                          </p>
                          {req.helpText && (
                            <p className="mt-0.5 text-xs text-gray-500">{req.helpText}</p>
                          )}
                          <p className="mt-0.5 text-xs text-gray-400">
                            Formatos: {req.allowedMimeTypes.join(', ')}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {report && !isPagoStage && (
                            <span className="text-lg" title={report.valid ? 'Conforme' : report.issues.join('; ')}>
                              {report.valid ? '✅' : '⚠️'}
                            </span>
                          )}
                          {editable && !isPagoStage && (
                            <>
                              <input
                                ref={(el) => {
                                  fileInputs.current[req.id] = el;
                                }}
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.dwg"
                                onChange={(e) => onUpload(req.id, e)}
                              />
                              <button
                                onClick={() => fileInputs.current[req.id]?.click()}
                                disabled={uploadingId === req.id}
                                className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50"
                              >
                                {uploadingId === req.id
                                  ? 'Subiendo…'
                                  : doc
                                    ? 'Reemplazar'
                                    : 'Cargar archivo'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {doc && (
                        <div className="mt-2 flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-xs text-gray-700">
                          <span>
                            📄 {doc.fileName} · {formatSize(doc.sizeBytes)} · v{doc.version} ·{' '}
                            {new Date(doc.uploadedAt).toLocaleString('es-GT')}
                          </span>
                          <button
                            onClick={() => openDocumentPreview(doc.id)}
                            className="text-primary-600 hover:underline"
                          >
                            Ver / Descargar
                          </button>
                        </div>
                      )}

                      {report && !report.valid && !isPagoStage && (
                        <ul className="mt-2 list-inside list-disc text-xs text-red-700">
                          {report.issues.map((issue) => (
                            <li key={issue}>{issue}</li>
                          ))}
                        </ul>
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
