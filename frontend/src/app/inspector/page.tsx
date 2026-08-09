'use client';

import { useRouter } from 'next/navigation';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import StatusBadge from '@/components/StatusBadge';
import { api, apiUpload, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface Inspection {
  id: string;
  type: string;
  status: string;
  proposedDates: string[];
  confirmedDate: string | null;
  result: string | null;
  resultNote: string | null;
  createdAt: string;
  inspector: { fullName: string } | null;
  application: {
    id: string;
    formCode: string;
    status: string;
    formData: Record<string, string | number | boolean | undefined>;
    applicant: { fullName: string; phone: string | null; email: string };
  };
}

const TYPE_LABEL: Record<string, string> = {
  ALINEACION: 'Alineación territorial',
  INTERMEDIA: 'Inspección intermedia',
  RECEPCION_OBRA: 'Recepción de obra',
};

const STATUS_LABEL: Record<string, string> = {
  SOLICITADA: 'Pendiente de propuesta',
  FECHAS_PROPUESTAS: 'Esperando confirmación del solicitante',
  CONFIRMADA: 'Confirmada — pendiente de visita',
  REALIZADA: 'Realizada',
  CANCELADA: 'Cancelada',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Convierte una fecha local del input datetime-local a ISO. */
function localToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function InspectorAgendaPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [inspections, setInspections] = useState<Inspection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [datesForm, setDatesForm] = useState<Record<string, string[]>>({});
  const [resultForm, setResultForm] = useState<
    Record<string, { open: boolean; result: string; note: string }>
  >({});

  const load = useCallback(async () => {
    try {
      setInspections(await api<Inspection[]>('/inspections'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'INSPECTOR') {
      router.replace('/');
      return;
    }
    load();
  }, [user, router, load]);

  if (!user || user.role !== 'INSPECTOR') return null;

  async function onPropose(inspectionId: string) {
    const raw = datesForm[inspectionId] ?? [];
    const dates = raw.map(localToIso).filter((d): d is string => Boolean(d));
    if (dates.length === 0) {
      setError('Ingrese al menos una fecha válida.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/inspections/${inspectionId}/propose-dates`, {
        method: 'POST',
        body: JSON.stringify({ dates }),
      });
      setNotice('Fechas propuestas. El solicitante fue notificado.');
      setDatesForm((prev) => ({ ...prev, [inspectionId]: [] }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  async function onResult(inspectionId: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const form = resultForm[inspectionId];
    if (!file || !form) return;
    if (form.note.trim().length < 5) {
      setError('Escriba la nota descriptiva del resultado (mínimo 5 caracteres).');
      e.target.value = '';
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('result', form.result);
      formData.append('note', form.note.trim());
      formData.append('photo', file);
      await apiUpload(`/inspections/${inspectionId}/result`, formData);
      setNotice('Resultado registrado con evidencia fotográfica.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al registrar el resultado');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  const pendientes = inspections?.filter((i) => i.status === 'SOLICITADA') ?? [];
  const porConfirmar = inspections?.filter((i) => i.status === 'FECHAS_PROPUESTAS') ?? [];
  const confirmadas = inspections?.filter((i) => i.status === 'CONFIRMADA') ?? [];
  const realizadas = inspections?.filter((i) => i.status === 'REALIZADA') ?? [];

  function InspectionCard({ inspection }: { inspection: Inspection }) {
    const app = inspection.application;
    const dates = datesForm[inspection.id] ?? [];
    const rForm = resultForm[inspection.id];
    return (
      <li className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium">
              {TYPE_LABEL[inspection.type]} · Expediente {app.formCode}
            </p>
            <p className="mt-0.5 text-sm text-gray-600">
              {app.applicant.fullName} · {app.applicant.phone ?? app.applicant.email}
            </p>
            <p className="text-sm text-gray-600">
              {String(app.formData.direccionExacta ?? '—')}, Zona {String(app.formData.zona)}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {STATUS_LABEL[inspection.status]} · solicitada el{' '}
              {new Date(inspection.createdAt).toLocaleDateString('es-GT')}
            </p>
          </div>
          <StatusBadge status={app.status} />
        </div>

        {inspection.status === 'SOLICITADA' && (
          <div className="mt-3 rounded border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm font-medium text-blue-900">Proponer hasta 3 fechas</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[0, 1, 2].map((idx) => (
                <input
                  key={idx}
                  type="datetime-local"
                  value={dates[idx] ?? ''}
                  onChange={(e) =>
                    setDatesForm((prev) => {
                      const next = [...(prev[inspection.id] ?? [])];
                      next[idx] = e.target.value;
                      return { ...prev, [inspection.id]: next };
                    })
                  }
                  className="rounded border px-2 py-1.5 text-sm"
                />
              ))}
            </div>
            <button
              onClick={() => onPropose(inspection.id)}
              disabled={busy}
              className="mt-2 rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              Enviar propuesta
            </button>
          </div>
        )}

        {inspection.status === 'FECHAS_PROPUESTAS' && (
          <p className="mt-3 rounded border border-yellow-200 bg-yellow-50 p-2 text-sm text-yellow-800">
            Fechas propuestas: {inspection.proposedDates.map(formatDate).join(' · ')}
          </p>
        )}

        {inspection.status === 'CONFIRMADA' && (
          <div className="mt-3 rounded border border-green-200 bg-green-50 p-3">
            <p className="text-sm font-medium text-green-900">
              Visita confirmada:{' '}
              {inspection.confirmedDate ? formatDate(inspection.confirmedDate) : '—'}
            </p>
            {!rForm?.open ? (
              <button
                onClick={() =>
                  setResultForm((prev) => ({
                    ...prev,
                    [inspection.id]: { open: true, result: 'CONFORME', note: '' },
                  }))
                }
                className="mt-2 rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
              >
                Registrar resultado de la visita
              </button>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="flex gap-3 text-sm">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      checked={rForm.result === 'CONFORME'}
                      onChange={() =>
                        setResultForm((prev) => ({
                          ...prev,
                          [inspection.id]: { ...rForm, result: 'CONFORME' },
                        }))
                      }
                    />
                    ✅ Conforme
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      checked={rForm.result === 'NO_CONFORME'}
                      onChange={() =>
                        setResultForm((prev) => ({
                          ...prev,
                          [inspection.id]: { ...rForm, result: 'NO_CONFORME' },
                        }))
                      }
                    />
                    ❌ No conforme
                  </label>
                </div>
                <textarea
                  value={rForm.note}
                  onChange={(e) =>
                    setResultForm((prev) => ({
                      ...prev,
                      [inspection.id]: { ...rForm, note: e.target.value },
                    }))
                  }
                  rows={2}
                  placeholder="Nota descriptiva del resultado…"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
                <label className="block rounded border border-dashed border-green-400 bg-white px-3 py-2 text-sm text-gray-700">
                  📷 Foto de evidencia (obligatoria):{' '}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    disabled={busy}
                    onChange={(e) => onResult(inspection.id, e)}
                    className="mt-1 block text-sm"
                  />
                </label>
                <button
                  onClick={() =>
                    setResultForm((prev) => ({
                      ...prev,
                      [inspection.id]: { ...rForm, open: false },
                    }))
                  }
                  className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {inspection.status === 'REALIZADA' && (
          <p className="mt-3 rounded border border-gray-200 bg-gray-50 p-2 text-sm text-gray-700">
            Resultado: <strong>{inspection.result}</strong> — {inspection.resultNote}
          </p>
        )}
      </li>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-bold">Agenda de inspecciones</h1>

        {error && (
          <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            {notice}
          </p>
        )}

        {!inspections && !error && <p className="mt-6 text-sm text-gray-500">Cargando…</p>}

        {inspections && inspections.length === 0 && (
          <p className="mt-6 rounded border bg-white p-6 text-sm text-gray-500">
            No hay inspecciones en su agenda por el momento.
          </p>
        )}

        {[
          { title: 'Pendientes de propuesta', items: pendientes },
          { title: 'Esperando confirmación del solicitante', items: porConfirmar },
          { title: 'Confirmadas — pendientes de visita', items: confirmadas },
          { title: 'Realizadas', items: realizadas },
        ].map(
          (section) =>
            section.items.length > 0 && (
              <section key={section.title} className="mt-6">
                <h2 className="text-lg font-semibold">{section.title}</h2>
                <ul className="mt-2 space-y-3">
                  {section.items.map((i) => (
                    <InspectionCard key={i.id} inspection={i} />
                  ))}
                </ul>
              </section>
            ),
        )}
      </main>
    </div>
  );
}
