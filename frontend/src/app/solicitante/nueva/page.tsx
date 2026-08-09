'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import Header from '@/components/Header';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { PRE_TRAMITE_LINKS, ZONAS_GUATEMALA } from '@/lib/constants';

interface LicenseType {
  id: string;
  code: string;
  name: string;
}

interface ClassificationResult {
  formCode: string | null;
  available: boolean;
  reasons: string[];
}

type Step = 'onboarding' | 'clasificacion' | 'formulario';

export default function NuevaSolicitudPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState<Step>('onboarding');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [licenseType, setLicenseType] = useState<LicenseType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Clasificación
  const [uso, setUso] = useState<'RESIDENCIAL' | 'MIXTO'>('RESIDENCIAL');
  const [area, setArea] = useState('');
  const [centroHistorico, setCentroHistorico] = useState(false);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);

  // Formulario del proyecto
  const [form, setForm] = useState({
    direccionExacta: '',
    zona: '1',
    niveles: '1',
    finca: '',
    folio: '',
    libro: '',
    nitPropietario: '',
    presupuestoEstimadoQ: '',
  });

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'SOLICITANTE') {
      router.replace('/');
      return;
    }
    api<LicenseType[]>('/license-types')
      .then((types) => setLicenseType(types[0] ?? null))
      .catch(() => setError('No se pudo cargar el catálogo de licencias'));
  }, [user, router]);

  /** Evalúa la clasificación F08 con la misma regla que el servidor. */
  function evaluateClassification(): ClassificationResult {
    const reasons: string[] = [];
    const areaM2 = Number(area);
    if (uso !== 'RESIDENCIAL') {
      reasons.push('El uso del inmueble no es residencial unifamiliar (requiere formulario F02 u otro trámite)');
    }
    if (!areaM2 || areaM2 <= 0) {
      reasons.push('Ingrese un área de construcción válida');
    } else if (areaM2 > 700) {
      reasons.push('El área supera los 700 m² permitidos para el formulario F08');
    }
    if (centroHistorico) {
      reasons.push('Los inmuebles en Centro Histórico requieren dictamen del IDAEH y trámite presencial');
    }
    return { formCode: reasons.length === 0 ? 'F08' : null, available: reasons.length === 0, reasons };
  }

  function onClassify(e: FormEvent) {
    e.preventDefault();
    const result = evaluateClassification();
    setClassification(result);
    if (result.available) setStep('formulario');
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!licenseType) return;
    setError(null);
    setLoading(true);
    try {
      const created = await api<{ id: string }>('/applications', {
        method: 'POST',
        body: JSON.stringify({
          licenseTypeId: licenseType.id,
          formData: {
            direccionExacta: form.direccionExacta,
            zona: form.zona,
            areaConstruccionM2: Number(area),
            niveles: Number(form.niveles),
            uso,
            centroHistorico,
            finca: form.finca,
            folio: form.folio,
            libro: form.libro,
            nitPropietario: form.nitPropietario,
            ...(form.presupuestoEstimadoQ
              ? { presupuestoEstimadoQ: Number(form.presupuestoEstimadoQ) }
              : {}),
          },
        }),
      });
      router.replace(`/solicitante/expedientes/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
      setLoading(false);
    }
  }

  if (!user || user.role !== 'SOLICITANTE') return null;

  const allChecked = PRE_TRAMITE_LINKS.every((l) => checked[l.id]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold">Nueva solicitud de licencia</h1>
        <p className="mt-1 text-sm text-gray-600">
          {licenseType ? `${licenseType.code} — ${licenseType.name}` : 'Cargando…'}
        </p>

        {/* Paso 1: Onboarding pre-trámite */}
        {step === 'onboarding' && (
          <section className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Paso 1 — Antes de iniciar</h2>
            <p className="mt-1 text-sm text-gray-600">
              Estos trámites son <strong>externos a la municipalidad</strong> y deben estar
              listos antes de crear el expediente. La lista es orientativa y no bloquea el proceso.
            </p>
            <ul className="mt-4 space-y-3">
              {PRE_TRAMITE_LINKS.map((link) => (
                <li key={link.id} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id={link.id}
                    checked={Boolean(checked[link.id])}
                    onChange={(e) => setChecked((c) => ({ ...c, [link.id]: e.target.checked }))}
                    className="mt-1 h-4 w-4"
                  />
                  <label htmlFor={link.id} className="text-sm">
                    {link.label}{' '}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline"
                    >
                      {link.urlLabel} ↗
                    </a>
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => router.back()}
                className="rounded border px-4 py-2 text-sm hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => setStep('clasificacion')}
                className={`rounded px-4 py-2 text-sm font-medium text-white ${
                  allChecked ? 'bg-primary-600 hover:bg-primary-700' : 'bg-gray-400'
                }`}
                title={allChecked ? '' : 'Puede continuar sin completar la lista (es orientativa)'}
              >
                Continuar
              </button>
            </div>
            {!allChecked && (
              <p className="mt-2 text-right text-xs text-gray-500">
                La lista es orientativa; puede continuar aunque no marque todos los pasos.
              </p>
            )}
          </section>
        )}

        {/* Paso 2: Clasificación automática */}
        {step === 'clasificacion' && (
          <form onSubmit={onClassify} className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Paso 2 — Clasificación del proyecto</h2>
            <p className="mt-1 text-sm text-gray-600">
              El sistema determina el formulario municipal aplicable (F08) según estos datos.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium">Uso del inmueble</label>
                <select
                  value={uso}
                  onChange={(e) => setUso(e.target.value as 'RESIDENCIAL' | 'MIXTO')}
                  className="mt-1 w-full rounded border px-3 py-2"
                >
                  <option value="RESIDENCIAL">Residencial unifamiliar</option>
                  <option value="MIXTO">Comercial / mixto / industrial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Área de construcción (m²)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2"
                  placeholder="Ej. 180"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={centroHistorico}
                  onChange={(e) => setCentroHistorico(e.target.checked)}
                  className="h-4 w-4"
                />
                El inmueble está ubicado en el Centro Histórico
              </label>
            </div>

            {classification && !classification.available && (
              <div className="mt-4 rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">
                  Este trámite aún no está disponible en la plataforma
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {classification.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <p className="mt-2">
                  Debe proceder presencialmente en la Ventanilla Única de la Municipalidad
                  (Palacio Municipal, zona 1, lunes a jueves en horario de oficina).
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep('onboarding')}
                className="rounded border px-4 py-2 text-sm hover:bg-gray-100"
              >
                Atrás
              </button>
              <button
                type="submit"
                className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Clasificar proyecto
              </button>
            </div>
          </form>
        )}

        {/* Paso 3: Datos del proyecto */}
        {step === 'formulario' && (
          <form onSubmit={onCreate} className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Paso 3 — Datos del proyecto</h2>
            <p className="mt-1 text-sm text-gray-600">
              Formulario F08 · Profesional responsable: {user.fullName}
            </p>

            {error && (
              <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium">Dirección exacta del inmueble</label>
                <input
                  required
                  value={form.direccionExacta}
                  onChange={(e) => setForm((f) => ({ ...f, direccionExacta: e.target.value }))}
                  className="mt-1 w-full rounded border px-3 py-2"
                  placeholder="Ej. 8a. Avenida 12-34, zona 9"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Zona</label>
                <select
                  value={form.zona}
                  onChange={(e) => setForm((f) => ({ ...f, zona: e.target.value }))}
                  className="mt-1 w-full rounded border px-3 py-2"
                >
                  {ZONAS_GUATEMALA.map((z) => (
                    <option key={z} value={z}>
                      Zona {z}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Número de niveles</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  required
                  value={form.niveles}
                  onChange={(e) => setForm((f) => ({ ...f, niveles: e.target.value }))}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Número de finca (RGP)</label>
                <input
                  required
                  value={form.finca}
                  onChange={(e) => setForm((f) => ({ ...f, finca: e.target.value }))}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Folio (RGP)</label>
                <input
                  required
                  value={form.folio}
                  onChange={(e) => setForm((f) => ({ ...f, folio: e.target.value }))}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Libro (RGP)</label>
                <input
                  required
                  value={form.libro}
                  onChange={(e) => setForm((f) => ({ ...f, libro: e.target.value }))}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">NIT del propietario</label>
                <input
                  required
                  value={form.nitPropietario}
                  onChange={(e) => setForm((f) => ({ ...f, nitPropietario: e.target.value }))}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Presupuesto estimado de obra (Q){' '}
                  <span className="font-normal text-gray-400">— opcional, documento D-12</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.presupuestoEstimadoQ}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, presupuestoEstimadoQ: e.target.value }))
                  }
                  placeholder="Ej. 350000"
                  className="mt-1 w-full rounded border px-3 py-2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se usa para calcular la tasa municipal (base + % sobre presupuesto).
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep('clasificacion')}
                className="rounded border px-4 py-2 text-sm hover:bg-gray-100"
              >
                Atrás
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Creando…' : 'Crear borrador del expediente'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
