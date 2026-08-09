'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import RoundsHistory, { ObservationItem } from '@/components/RoundsHistory';
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
  reviewStatus: string;
  replacedAfterObservation: boolean;
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
  confirmedAt: string | null;
}

interface ApplicationDetail {
  id: string;
  status: string;
  formCode: string;
  formData: Record<string, string | number | boolean | undefined>;
  correctionRound: number;
  rejectedReason: string | null;
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
    maxCorrectionRounds: number;
    requirements: {
      id: string;
      code: string;
      name: string;
      stage: string;
      allowedMimeTypes: string[];
    }[];
  };
  documents: CurrentDocument[];
  observations: ObservationItem[];
  inspections: InspectionItem[];
  payment: PaymentInfo | null;
}

const INSPECTION_TYPE_LABEL: Record<string, string> = {
  ALINEACION: 'Alineación territorial',
  INTERMEDIA: 'Inspección intermedia',
  RECEPCION_OBRA: 'Recepción de obra',
};

const INSPECTION_STATUS_LABEL: Record<string, string> = {
  SOLICITADA: 'Pendiente de propuesta de fechas',
  FECHAS_PROPUESTAS: 'Fechas propuestas — esperando solicitante',
  CONFIRMADA: 'Visita confirmada',
  REALIZADA: 'Realizada',
  CANCELADA: 'Cancelada',
};

const REVIEW_BADGE: Record<string, string> = {
  CONFORME: 'bg-green-100 text-green-800',
  CON_OBSERVACION: 'bg-orange-100 text-orange-800',
  REQUIERE_REEMPLAZO: 'bg-red-100 text-red-800',
  PENDIENTE: 'bg-gray-100 text-gray-600',
};

const REVIEW_LABEL: Record<string, string> = {
  CONFORME: 'Conforme',
  CON_OBSERVACION: 'Con observación',
  REQUIERE_REEMPLAZO: 'Requiere reemplazo',
  PENDIENTE: 'Sin revisar',
};

export default function RevisorExpedientePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Formulario inline de observación por documento */
  const [obsForm, setObsForm] = useState<
    Record<string, { open: boolean; status: string; text: string; priority: string }>
  >({});
  const [rejectOpen, setRejectOpen] = useState(false);
  const [dictamen, setDictamen] = useState('');

  const canReview = user?.role === 'REVISOR' || user?.role === 'ADMIN';

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

  const inReview = detail?.status === 'EN_REVISION_TECNICA';
  const currentRound = (detail?.correctionRound ?? 0) + 1;
  const maxRounds = detail?.licenseType.maxCorrectionRounds ?? 3;
  const isFinalRound = currentRound >= maxRounds;
  /** Observaciones sin resolver de la ronda actual: habilitan "enviar a corrección". */
  const unresolvedRound =
    detail?.observations.filter((o) => o.round === currentRound && !o.resolvedAt).length ?? 0;
  /** Observaciones sin resolver de cualquier ronda: bloquean la aprobación. */
  const unresolvedAll = detail?.observations.filter((o) => !o.resolvedAt).length ?? 0;

  function openObsForm(docId: string, status: string) {
    setObsForm((prev) => ({
      ...prev,
      [docId]: { open: true, status, text: '', priority: 'MEDIA' },
    }));
  }

  async function markConforme(docId: string) {
    setError(null);
    try {
      await api(`/applications/${params.id}/review-document`, {
        method: 'POST',
        body: JSON.stringify({ documentId: docId, reviewStatus: 'CONFORME' }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }

  async function saveObservation(docId: string) {
    const form = obsForm[docId];
    if (!form || form.text.trim().length < 3) {
      setError('Escriba el texto de la observación (mínimo 3 caracteres).');
      return;
    }
    setError(null);
    try {
      await api(`/applications/${params.id}/review-document`, {
        method: 'POST',
        body: JSON.stringify({
          documentId: docId,
          reviewStatus: form.status,
          text: form.text.trim(),
          priority: form.priority,
        }),
      });
      setObsForm((prev) => ({ ...prev, [docId]: { ...form, open: false } }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }

  async function runAction(action: 'send-to-correction' | 'approve-review') {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api(`/applications/${params.id}/${action}`, { method: 'POST' });
      await load();
      setNotice(
        action === 'approve-review'
          ? 'Revisión técnica aprobada. El expediente avanza a alineación territorial.'
          : 'Expediente enviado a corrección. El solicitante fue notificado.',
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  async function onReject() {
    setBusy(true);
    setError(null);
    try {
      await api(`/applications/${params.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ dictamen: dictamen.trim() }),
      });
      setRejectOpen(false);
      await load();
      setNotice('Expediente rechazado con dictamen.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  const docByRequirement = new Map(detail?.documents.map((d) => [d.requirementId, d]));

  async function onRequestAlineacion() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api(`/applications/${params.id}/inspections`, { method: 'POST' });
      await load();
      setNotice('Inspección de alineación solicitada. Los inspectores fueron notificados.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmPayment() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api(`/applications/${params.id}/confirm-payment`, { method: 'POST' });
      await load();
      setNotice('Pago confirmado. El expediente avanza a emisión de licencia.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  const activeAlineacion = detail?.inspections.some(
    (i) =>
      i.type === 'ALINEACION' &&
      ['SOLICITADA', 'FECHAS_PROPUESTAS', 'CONFIRMADA'].includes(i.status),
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
                  {inReview && (
                    <span className="ml-2 text-gray-400">
                      · Ronda {currentRound} de {maxRounds}
                    </span>
                  )}
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
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Documentos del expediente</h2>
                {inReview && canReview && (
                  <p className="text-xs text-gray-500">
                    Marque cada documento; los observados quedarán desbloqueados para el
                    solicitante.
                  </p>
                )}
              </div>
              <ul className="mt-4 space-y-3">
                {detail.licenseType.requirements.map((req) => {
                  const doc = docByRequirement.get(req.id);
                  const form = doc ? obsForm[doc.id] : undefined;
                  return (
                    <li key={req.id} className="rounded border border-gray-200 p-4">
                      <div className="flex items-center justify-between gap-4 text-sm">
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
                            <p className="mt-0.5 text-xs text-gray-500">
                              {doc.fileName} · v{doc.version} ·{' '}
                              {new Date(doc.uploadedAt).toLocaleString('es-GT')}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-xs text-red-600">No cargado</p>
                          )}
                          {doc && (
                            <div className="mt-1 flex gap-2">
                              <span
                                className={`rounded px-2 py-0.5 text-xs font-medium ${REVIEW_BADGE[doc.reviewStatus]}`}
                              >
                                {REVIEW_LABEL[doc.reviewStatus]}
                              </span>
                              {doc.replacedAfterObservation && (
                                <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                  ✓ Reemplazado en esta ronda
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {doc && (
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              onClick={() => openDocumentPreview(doc.id)}
                              className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100"
                            >
                              {doc.mimeType === 'application/pdf' || doc.mimeType === 'image/jpeg'
                                ? 'Ver'
                                : 'Descargar'}
                            </button>
                            {inReview && canReview && (
                              <>
                                <button
                                  onClick={() => markConforme(doc.id)}
                                  title="Marcar como conforme"
                                  className="rounded border border-green-300 px-2 py-1.5 text-sm text-green-700 hover:bg-green-50"
                                >
                                  ✅
                                </button>
                                <button
                                  onClick={() => openObsForm(doc.id, 'CON_OBSERVACION')}
                                  title="Con observación"
                                  className="rounded border border-orange-300 px-2 py-1.5 text-sm text-orange-700 hover:bg-orange-50"
                                >
                                  ⚠️
                                </button>
                                <button
                                  onClick={() => openObsForm(doc.id, 'REQUIERE_REEMPLAZO')}
                                  title="Requiere reemplazo"
                                  className="rounded border border-red-300 px-2 py-1.5 text-sm text-red-700 hover:bg-red-50"
                                >
                                  ❌
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {form?.open && (
                        <div className="mt-3 rounded border border-orange-200 bg-orange-50 p-3">
                          <p className="text-sm font-medium text-orange-900">
                            {form.status === 'REQUIERE_REEMPLAZO'
                              ? '❌ Observación — requiere reemplazo'
                              : '⚠️ Observación'}
                          </p>
                          <textarea
                            value={form.text}
                            onChange={(e) =>
                              setObsForm((prev) => ({
                                ...prev,
                                [doc!.id]: { ...form, text: e.target.value },
                              }))
                            }
                            rows={2}
                            placeholder="Describa la observación para el solicitante…"
                            className="mt-2 w-full rounded border px-3 py-2 text-sm"
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <select
                              value={form.priority}
                              onChange={(e) =>
                                setObsForm((prev) => ({
                                  ...prev,
                                  [doc!.id]: { ...form, priority: e.target.value },
                                }))
                              }
                              className="rounded border px-2 py-1.5 text-sm"
                            >
                              <option value="ALTA">Prioridad alta</option>
                              <option value="MEDIA">Prioridad media</option>
                              <option value="BAJA">Prioridad baja</option>
                            </select>
                            <button
                              onClick={() => saveObservation(doc!.id)}
                              className="rounded bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
                            >
                              Guardar observación
                            </button>
                            <button
                              onClick={() =>
                                setObsForm((prev) => ({
                                  ...prev,
                                  [doc!.id]: { ...form, open: false },
                                }))
                              }
                              className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Acciones de revisión */}
              {inReview && canReview && (
                <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => runAction('approve-review')}
                      disabled={busy || unresolvedAll > 0}
                      title={
                        unresolvedAll > 0
                          ? `Hay ${unresolvedAll} observación(es) sin resolver; marque los documentos como conformes`
                          : ''
                      }
                      className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      ✅ Aprobar revisión técnica
                    </button>
                    {!isFinalRound && (
                      <button
                        onClick={() => runAction('send-to-correction')}
                        disabled={busy || unresolvedRound === 0}
                        title={
                          unresolvedRound === 0
                            ? 'Registre al menos una observación en esta ronda'
                            : ''
                        }
                        className="rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                      >
                        ⚠️ Enviar a corrección
                      </button>
                    )}
                    <button
                      onClick={() => setRejectOpen(true)}
                      disabled={busy}
                      className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      ❌ Rechazar con dictamen
                    </button>
                    <span className="text-xs text-gray-600">
                      Ronda {currentRound} de {maxRounds}
                      {isFinalRound &&
                        ' · última ronda: solo puede aprobar o rechazar'}
                      {unresolvedAll > 0 &&
                        ` · ${unresolvedAll} observación(es) pendiente(s)`}
                    </span>
                  </div>

                  {rejectOpen && (
                    <div className="mt-3 rounded border border-red-200 bg-red-50 p-3">
                      <p className="text-sm font-medium text-red-900">
                        Dictamen de rechazo (obligatorio)
                      </p>
                      <textarea
                        value={dictamen}
                        onChange={(e) => setDictamen(e.target.value)}
                        rows={3}
                        placeholder="Fundamente el rechazo del expediente (mínimo 20 caracteres)…"
                        className="mt-2 w-full rounded border px-3 py-2 text-sm"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={onReject}
                          disabled={busy || dictamen.trim().length < 20}
                          className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Confirmar rechazo
                        </button>
                        <button
                          onClick={() => setRejectOpen(false)}
                          className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Alineación territorial */}
            {detail.status === 'ALINEACION_PROGRAMADA' && canReview && (
              <section className="mt-6 rounded-lg border border-purple-200 bg-purple-50 p-6">
                <h2 className="text-lg font-semibold text-purple-900">Alineación territorial</h2>
                <p className="mt-1 text-sm text-purple-800">
                  La revisión técnica fue aprobada. Solicite la inspección de alineación para
                  coordinar la visita al predio.
                </p>
                <button
                  onClick={onRequestAlineacion}
                  disabled={busy || activeAlineacion}
                  title={activeAlineacion ? 'Ya existe una inspección activa' : ''}
                  className="mt-3 rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  📍 Solicitar inspección de alineación
                </button>
              </section>
            )}

            {/* Pago */}
            {detail.status === 'PENDIENTE_DE_PAGO' && (
              <section className="mt-6 rounded-lg border border-yellow-300 bg-yellow-50 p-6">
                <h2 className="text-lg font-semibold text-yellow-900">Cobro de tasa municipal</h2>
                {detail.payment ? (
                  <div className="mt-2 text-sm text-yellow-900">
                    <p>
                      Monto calculado:{' '}
                      <strong>Q {Number(detail.payment.amount).toFixed(2)}</strong>{' '}
                      {detail.payment.simulated && (
                        <span className="ml-1 rounded bg-orange-200 px-2 py-0.5 text-xs font-medium text-orange-900">
                          SIMULACIÓN
                        </span>
                      )}
                    </p>
                    {detail.payment.confirmedAt ? (
                      <p className="mt-1 text-green-800">
                        ✓ Pago confirmado el{' '}
                        {new Date(detail.payment.confirmedAt).toLocaleString('es-GT')}
                      </p>
                    ) : canReview ? (
                      <button
                        onClick={onConfirmPayment}
                        disabled={busy}
                        className="mt-3 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        ✓ Confirmar recepción del pago
                      </button>
                    ) : (
                      <p className="mt-1 text-xs text-yellow-700">
                        Esperando confirmación del pago por revisor/admin.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-yellow-800">
                    Aún no hay cobro calculado para este expediente.
                  </p>
                )}
              </section>
            )}

            {/* Historial de inspecciones */}
            {detail.inspections.length > 0 && (
              <section className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Inspecciones</h2>
                <ul className="mt-3 space-y-3">
                  {detail.inspections.map((insp) => (
                    <li key={insp.id} className="rounded border border-gray-200 bg-gray-50 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{INSPECTION_TYPE_LABEL[insp.type] ?? insp.type}</p>
                        <span className="text-xs text-gray-500">
                          {INSPECTION_STATUS_LABEL[insp.status] ?? insp.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Inspector: {insp.inspector?.fullName ?? 'sin asignar'} · solicitada el{' '}
                        {new Date(insp.createdAt).toLocaleDateString('es-GT')}
                      </p>
                      {insp.confirmedDate && (
                        <p className="mt-1 text-xs text-gray-700">
                          Fecha confirmada:{' '}
                          {new Date(insp.confirmedDate).toLocaleString('es-GT')}
                        </p>
                      )}
                      {insp.result && (
                        <p
                          className={`mt-2 rounded px-2 py-1 text-xs font-medium ${
                            insp.result === 'CONFORME'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {insp.result === 'CONFORME' ? '✅' : '❌'} {insp.result}: {insp.resultNote}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {detail.status === 'RECHAZADO' && detail.rejectedReason && (
              <section className="mt-6 rounded-lg border border-red-300 bg-red-50 p-6">
                <h2 className="text-lg font-semibold text-red-900">Dictamen de rechazo</h2>
                <p className="mt-2 text-sm text-red-800">{detail.rejectedReason}</p>
              </section>
            )}

            <RoundsHistory observations={detail.observations} />
          </>
        )}
      </main>
    </div>
  );
}
