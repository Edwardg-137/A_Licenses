'use client';

import { useParams, useRouter } from 'next/navigation';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import RoundsHistory, { ObservationItem } from '@/components/RoundsHistory';
import StatusBadge from '@/components/StatusBadge';
import { api, apiUpload, ApiError, downloadLicensePdf, openDocumentPreview } from '@/lib/api';
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
  reviewStatus: string;
}

interface ValidationItem {
  requirementId: string;
  code: string;
  valid: boolean;
  issues: string[];
  stage: string;
}

interface InspectionItem {
  id: string;
  type: string;
  status: string;
  proposedDates: string[];
  confirmedDate: string | null;
  result: string | null;
  resultNote: string | null;
  createdAt: string;
  inspector: { fullName: string } | null;
}

interface PaymentInfo {
  id: string;
  amount: string;
  breakdown: {
    base?: number;
    porcentajePresupuesto?: number;
    presupuestoEstimadoQ?: number;
    cargoVariable?: number;
    total?: number;
    nota?: string;
  };
  simulated: boolean;
  receiptPath: string | null;
  confirmedAt: string | null;
}

interface LicenseInfo {
  id: string;
  number: string;
  qrToken: string;
  issuedAt: string;
  validUntil: string | null;
  verifyUrl: string;
}

interface ApplicationDetail {
  id: string;
  status: string;
  formCode: string;
  formData: Record<string, string | number | boolean | undefined>;
  correctionRound: number;
  rejectedReason: string | null;
  licenseType: {
    code: string;
    name: string;
    maxCorrectionRounds: number;
    requirements: Requirement[];
  };
  documents: CurrentDocument[];
  observations: ObservationItem[];
  validationReport: ValidationItem[];
  inspections: InspectionItem[];
  payment: PaymentInfo | null;
  license: LicenseInfo | null;
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
  const inCorrection = detail?.status === 'EN_CORRECCION';

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

  async function onResubmit() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api(`/applications/${params.id}/resubmit`, { method: 'POST' });
      await load();
      setNotice('Correcciones enviadas. Su expediente vuelve a revisión técnica.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmDate(inspectionId: string, date: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api(`/inspections/${inspectionId}/confirm-date`, {
        method: 'POST',
        body: JSON.stringify({ date }),
      });
      await load();
      setNotice('Fecha de visita confirmada. El inspector fue notificado.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  async function onPaySimulated() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api(`/applications/${params.id}/pay-simulated`, { method: 'POST' });
      await load();
      setNotice('Pago simulado registrado. El comprobante quedó adjunto como D-15 y la municipalidad lo confirmará.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  async function onRequestRecepcion() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api(`/applications/${params.id}/request-recepcion`, { method: 'POST' });
      await load();
      setNotice('Recepción de obra solicitada. Los inspectores fueron notificados.');
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
  const pendingObservations =
    detail?.observations.filter((o) => !o.resolvedAt) ?? [];
  /** Documentos que aún están marcados y deben reemplazarse antes de reenviar. */
  const stillMarkedCount =
    detail?.documents.filter((d) =>
      ['CON_OBSERVACION', 'REQUIERE_REEMPLAZO'].includes(d.reviewStatus),
    ).length ?? 0;

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

            {/* Avisos de estado */}
            {inCorrection && (
              <div className="mt-4 rounded-lg border border-orange-300 bg-orange-50 p-4">
                <p className="text-sm font-semibold text-orange-900">
                  ⚠️ Su expediente tiene {pendingObservations.length} observación(es) — Ronda{' '}
                  {detail.correctionRound} de {detail.licenseType.maxCorrectionRounds}
                </p>
                <p className="mt-1 text-sm text-orange-800">
                  Reemplace únicamente los documentos marcados (el resto está bloqueado) y luego
                  reenvíe las correcciones.
                </p>
                <ul className="mt-2 list-inside list-disc text-sm text-orange-800">
                  {pendingObservations.map((obs) => (
                    <li key={obs.id}>
                      <strong>{obs.document?.requirement.code}</strong> [{obs.priority}]: {obs.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {detail.status === 'EN_REVISION_TECNICA' && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                Su expediente está siendo revisado por el personal municipal. Le notificaremos
                cualquier novedad.
              </div>
            )}
            {detail.status === 'ALINEACION_PROGRAMADA' && (
              <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-800">
                ✅ Su expediente fue aprobado técnicamente. La municipalidad coordinará la visita
                de alineación territorial; le notificaremos cuando haya fechas propuestas.
              </div>
            )}
            {detail.status === 'RECEPCION_DE_OBRA' && (
              <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">
                🏗️ Recepción de obra en curso. El inspector coordinará la visita final; confirme
                la fecha cuando reciba la propuesta.
              </div>
            )}
            {detail.status === 'CERRADO' && (
              <div className="mt-4 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
                🎉 Recepción de obra conforme: su expediente está cerrado. La obra quedó registrada
                conforme a los planos aprobados.
              </div>
            )}
            {detail.status === 'RECHAZADO' && (
              <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-900">Expediente rechazado</p>
                <p className="mt-1 text-sm text-red-800">
                  Dictamen: {detail.rejectedReason ?? 'Sin dictamen registrado.'}
                </p>
              </div>
            )}

            {/* Inspecciones (alineación / recepción de obra) */}
            {detail.inspections.length > 0 && (
              <section className="mt-4 rounded-lg border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Visitas de inspección</h2>
                <ul className="mt-3 space-y-3">
                  {detail.inspections.map((insp) => (
                    <li key={insp.id} className="rounded border border-gray-200 p-4 text-sm">
                      <p className="font-medium">
                        {insp.type === 'ALINEACION'
                          ? '📍 Alineación territorial'
                          : '🏗️ Recepción de obra'}{' '}
                        <span className="ml-1 text-xs font-normal text-gray-500">
                          · Inspector: {insp.inspector?.fullName ?? 'por asignar'}
                        </span>
                      </p>

                      {insp.status === 'SOLICITADA' && (
                        <p className="mt-1 text-gray-600">
                          Esperando que el inspector proponga fechas.
                        </p>
                      )}

                      {insp.status === 'FECHAS_PROPUESTAS' && (
                        <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-3">
                          <p className="font-medium text-blue-900">
                            Elija y confirme una de las fechas propuestas:
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {insp.proposedDates.map((d) => (
                              <button
                                key={d}
                                onClick={() => onConfirmDate(insp.id, d)}
                                disabled={busy}
                                className="rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-800 hover:bg-blue-100 disabled:opacity-50"
                              >
                                {new Date(d).toLocaleString('es-GT', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {insp.status === 'CONFIRMADA' && insp.confirmedDate && (
                        <p className="mt-2 rounded border border-green-200 bg-green-50 p-2 text-green-800">
                          ✓ Visita confirmada para el{' '}
                          {new Date(insp.confirmedDate).toLocaleString('es-GT', {
                            dateStyle: 'full',
                            timeStyle: 'short',
                          })}
                        </p>
                      )}

                      {insp.status === 'REALIZADA' && (
                        <p
                          className={`mt-2 rounded px-2 py-1 ${
                            insp.result === 'CONFORME'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {insp.result === 'CONFORME' ? '✅' : '❌'} Resultado:{' '}
                          <strong>{insp.result}</strong> — {insp.resultNote}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Pago de la tasa municipal */}
            {detail.status === 'PENDIENTE_DE_PAGO' && detail.payment && (
              <section className="mt-4 rounded-lg border border-yellow-300 bg-yellow-50 p-6">
                <h2 className="text-lg font-semibold text-yellow-900">Pago de tasa municipal</h2>
                <div className="mt-3 rounded border border-orange-300 bg-orange-100 p-2 text-center text-xs font-bold uppercase tracking-wide text-orange-900">
                  ⚠ Simulación — sin transacción monetaria real
                </div>
                <dl className="mt-3 space-y-1 text-sm text-yellow-900">
                  <div className="flex justify-between">
                    <dt>Base (tarifa provisional)</dt>
                    <dd>Q {Number(detail.payment.breakdown.base ?? 0).toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>
                      Cargo variable ({(Number(detail.payment.breakdown.porcentajePresupuesto ?? 0) * 100).toFixed(2)}%
                      sobre presupuesto de Q{' '}
                      {Number(detail.payment.breakdown.presupuestoEstimadoQ ?? 0).toLocaleString('es-GT')})
                    </dt>
                    <dd>Q {Number(detail.payment.breakdown.cargoVariable ?? 0).toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-yellow-300 pt-1 text-base font-bold">
                    <dt>Total a pagar</dt>
                    <dd>Q {Number(detail.payment.amount).toFixed(2)}</dd>
                  </div>
                </dl>

                {detail.payment.confirmedAt ? (
                  <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">
                    ✓ Pago confirmado por la municipalidad el{' '}
                    {new Date(detail.payment.confirmedAt).toLocaleString('es-GT')}
                  </p>
                ) : detail.payment.receiptPath ? (
                  <p className="mt-3 rounded bg-blue-100 p-2 text-sm text-blue-800">
                    Comprobante registrado (D-15). La municipalidad confirmará su pago.
                  </p>
                ) : (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      onClick={onPaySimulated}
                      disabled={busy}
                      className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      💳 Pagar en línea (simulado)
                    </button>
                    <span className="text-xs text-yellow-800">
                      o suba abajo el comprobante externo (D-15) si pagó en caja municipal
                    </span>
                  </div>
                )}
              </section>
            )}

            {/* Licencia emitida → descarga + recepción de obra */}
            {(detail.status === 'LICENCIA_EMITIDA' ||
              detail.status === 'RECEPCION_DE_OBRA' ||
              detail.status === 'CERRADO') &&
              detail.license && (
              <section className="mt-4 rounded-lg border border-green-300 bg-green-50 p-6">
                <h2 className="text-lg font-semibold text-green-900">🎉 Licencia emitida</h2>
                <p className="mt-1 text-sm text-green-800">
                  Número: <strong className="font-mono">{detail.license.number}</strong>
                  {detail.license.validUntil && (
                    <>
                      {' '}
                      · Vigente hasta{' '}
                      {new Date(detail.license.validUntil).toLocaleDateString('es-GT')}
                    </>
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await downloadLicensePdf(
                          detail.id,
                          `licencia-${detail.license!.number}.pdf`,
                        );
                      } catch (err) {
                        setError(err instanceof ApiError ? err.message : 'Error al descargar');
                      }
                    }}
                    className="rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
                  >
                    📄 Descargar licencia (PDF)
                  </button>
                  <a
                    href={detail.license.verifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-green-600 px-4 py-2 text-sm text-green-800 hover:bg-green-100"
                  >
                    🔗 Abrir verificación pública
                  </a>
                </div>
                {detail.status === 'LICENCIA_EMITIDA' && (
                  <button
                    onClick={onRequestRecepcion}
                    disabled={busy}
                    className="mt-3 rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    🏗️ Solicitar recepción de obra (al finalizar la construcción)
                  </button>
                )}
              </section>
            )}

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
                {detail.formData.areaTerrenoM2 != null && (
                  <div>
                    <dt className="text-gray-500">Área del terreno</dt>
                    <dd className="font-medium">{String(detail.formData.areaTerrenoM2)} m²</dd>
                  </div>
                )}
                {detail.formData.descripcionTrabajos != null &&
                  String(detail.formData.descripcionTrabajos).trim() !== '' && (
                  <div className="sm:col-span-2">
                    <dt className="text-gray-500">Descripción de trabajos</dt>
                    <dd className="font-medium whitespace-pre-wrap">
                      {String(detail.formData.descripcionTrabajos)}
                    </dd>
                  </div>
                )}
                {detail.formData.tiempoEjecucionAnios != null && (
                  <div>
                    <dt className="text-gray-500">Tiempo de ejecución</dt>
                    <dd className="font-medium">
                      {String(detail.formData.tiempoEjecucionAnios)} año(s)
                    </dd>
                  </div>
                )}
                {detail.formData.informeIndustrial != null &&
                  detail.formData.informeIndustrial !== 'NONE' && (
                  <div>
                    <dt className="text-gray-500">Informe industrial</dt>
                    <dd className="font-medium">{String(detail.formData.informeIndustrial)}</dd>
                  </div>
                )}
                {detail.formData.talaArboles === true && (
                  <div className="sm:col-span-2">
                    <dt className="text-gray-500">Tala de árboles</dt>
                    <dd className="font-medium">
                      Sí
                      {detail.formData.talaMotivo
                        ? ` — ${String(detail.formData.talaMotivo)}`
                        : ''}
                    </dd>
                  </div>
                )}
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
                {inCorrection && (
                  <button
                    onClick={onResubmit}
                    disabled={busy || stillMarkedCount > 0}
                    title={
                      stillMarkedCount > 0
                        ? `Quedan ${stillMarkedCount} documento(s) observado(s) por reemplazar`
                        : ''
                    }
                    className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    Reenviar correcciones
                    {stillMarkedCount > 0 && ` (faltan ${stillMarkedCount})`}
                  </button>
                )}
              </div>

              <ul className="mt-4 space-y-3">
                {[...ingresoRequirements, ...pagoRequirements].map((req) => {
                  const doc = docByRequirement.get(req.id);
                  const report = reportByRequirement.get(req.id);
                  const isPagoStage = req.stage === 'PAGO';
                  const marked =
                    doc && ['CON_OBSERVACION', 'REQUIERE_REEMPLAZO'].includes(doc.reviewStatus);
                  const pagoUploadable =
                    isPagoStage &&
                    detail.status === 'PENDIENTE_DE_PAGO' &&
                    !detail.payment?.confirmedAt;
                  const canUpload =
                    pagoUploadable ||
                    (!isPagoStage &&
                      detail.status !== 'PENDIENTE_DE_PAGO' &&
                      ((editable && !inCorrection) || (inCorrection && marked)));
                  return (
                    <li
                      key={req.id}
                      className={`rounded border p-4 ${
                        report && !report.valid && !isPagoStage
                          ? 'border-red-300 bg-red-50'
                          : marked
                            ? 'border-orange-300 bg-orange-50'
                            : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium">
                            {req.code} — {req.name}
                            {!req.required && (
                              <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                                Opcional
                              </span>
                            )}
                            {isPagoStage && (
                              <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                                Se carga en la fase de pago
                              </span>
                            )}
                            {marked && (
                              <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                                {doc.reviewStatus === 'REQUIERE_REEMPLAZO'
                                  ? '❌ Debe reemplazarlo'
                                  : '⚠️ Observado'}
                              </span>
                            )}
                            {doc?.reviewStatus === 'CONFORME' && (
                              <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                ✓ Conforme
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
                          {report && !isPagoStage && !inCorrection && (
                            <span className="text-lg" title={report.valid ? 'Conforme' : report.issues.join('; ')}>
                              {report.valid ? '✅' : '⚠️'}
                            </span>
                          )}
                          {canUpload && (
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
                          {inCorrection && doc && !marked && !isPagoStage && (
                            <span className="text-xs text-gray-400" title="Solo puede reemplazar los documentos observados">
                              🔒 Bloqueado
                            </span>
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

                      {report && !report.valid && !isPagoStage && !inCorrection && (
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

            <RoundsHistory observations={detail.observations} />
          </>
        )}
      </main>
    </div>
  );
}
