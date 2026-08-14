'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import CheckPill from '@/components/CheckPill';
import { api, ApiError } from '@/lib/api';
import { FormValidation } from '@/lib/content-check';
import { useAuthStore } from '@/lib/auth-store';
import {
  classifyProject,
  ClassifyResult,
  UsoInmueble,
} from '@/lib/classification';
import { PRE_TRAMITE_LINKS, ZONAS_GUATEMALA } from '@/lib/constants';

interface LicenseType {
  id: string;
  code: string;
  name: string;
  formCode: string;
}

type Step = 'onboarding' | 'clasificacion' | 'formulario';

const OBRA_TIPOS_F02 = [
  { id: 'CONSTRUCCION_NUEVA', label: 'Construcción nueva' },
  { id: 'AMPLIACION', label: 'Ampliación' },
  { id: 'REMODELACION', label: 'Remodelación' },
  { id: 'DEMOLICION', label: 'Demolición' },
  { id: 'MOVIMIENTO_TIERRAS', label: 'Movimiento de tierras / excavación' },
  { id: 'CAMBIO_USO_SUELO', label: 'Cambio de uso de suelo' },
] as const;

export default function NuevaSolicitudPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState<Step>('onboarding');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [licenseTypes, setLicenseTypes] = useState<LicenseType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingForm, setCheckingForm] = useState(false);
  const [formValidation, setFormValidation] = useState<FormValidation | null>(null);

  const [uso, setUso] = useState<UsoInmueble>('RESIDENCIAL');
  const [area, setArea] = useState('');
  const [centroHistorico, setCentroHistorico] = useState(false);
  const [cambioUsoSuelo, setCambioUsoSuelo] = useState(false);
  const [classification, setClassification] = useState<ClassifyResult | null>(null);

  const [form, setForm] = useState({
    direccionExacta: '',
    zona: '1',
    niveles: '1',
    finca: '',
    folio: '',
    libro: '',
    nitPropietario: '',
    presupuestoEstimadoQ: '',
    areaTerrenoM2: '',
    descripcionTrabajos: '',
    tiempoEjecucionAnios: '1',
    talaArboles: false,
    talaMotivo: '',
    informeIndustrial: 'NONE' as 'NONE' | 'SIMPLE' | 'COMPLETO',
    obraTipos: [] as string[],
    aceptaConfidencialidadCom21: false,
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
      .then((types) => setLicenseTypes(types))
      .catch(() => setError('No se pudo cargar el catálogo de licencias'));
  }, [user, router]);

  const selectedLicenseType = useMemo(() => {
    if (!classification?.licenseTypeCode) return null;
    return licenseTypes.find((t) => t.code === classification.licenseTypeCode) ?? null;
  }, [classification, licenseTypes]);

  function onClassify(e: FormEvent) {
    e.preventDefault();
    const result = classifyProject({
      uso,
      areaConstruccionM2: Number(area),
      centroHistorico,
      cambioUsoSuelo,
    });
    setClassification(result);
    if (result.available) setStep('formulario');
  }

  function toggleObraTipo(id: string) {
    setForm((f) => ({
      ...f,
      obraTipos: f.obraTipos.includes(id)
        ? f.obraTipos.filter((x) => x !== id)
        : [...f.obraTipos, id],
    }));
  }

  async function runFormValidation(): Promise<FormValidation | null> {
    setCheckingForm(true);
    try {
      const result = await api<FormValidation>('/applications/validate-form', {
        method: 'POST',
        body: JSON.stringify({
          direccionExacta: form.direccionExacta,
          zona: form.zona,
          nitPropietario: form.nitPropietario,
          finca: form.finca,
          folio: form.folio,
          libro: form.libro,
        }),
      });
      setFormValidation(result);
      return result;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo validar el formulario');
      return null;
    } finally {
      setCheckingForm(false);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!selectedLicenseType || !classification?.formCode) return;
    setError(null);
    setLoading(true);
    try {
      const preview = await runFormValidation();
      if (preview?.overall === 'fail') {
        setError(
          [preview.nit, preview.address, preview.rgp]
            .filter((f) => f.status === 'fail')
            .map((f) => f.message)
            .join(' '),
        );
        setLoading(false);
        return;
      }
      const isF02 = classification.formCode === 'F02';
      const created = await api<{ id: string }>('/applications', {
        method: 'POST',
        body: JSON.stringify({
          licenseTypeId: selectedLicenseType.id,
          formData: {
            direccionExacta: form.direccionExacta,
            zona: form.zona,
            areaConstruccionM2: Number(area),
            niveles: Number(form.niveles),
            uso,
            centroHistorico,
            cambioUsoSuelo,
            finca: form.finca,
            folio: form.folio,
            libro: form.libro,
            nitPropietario: form.nitPropietario,
            ...(form.presupuestoEstimadoQ
              ? { presupuestoEstimadoQ: Number(form.presupuestoEstimadoQ) }
              : {}),
            ...(form.areaTerrenoM2 !== ''
              ? { areaTerrenoM2: Number(form.areaTerrenoM2) }
              : {}),
            ...(isF02
              ? {
                  descripcionTrabajos: form.descripcionTrabajos,
                  tiempoEjecucionAnios: Number(form.tiempoEjecucionAnios),
                  talaArboles: form.talaArboles,
                  ...(form.talaArboles && form.talaMotivo
                    ? { talaMotivo: form.talaMotivo }
                    : {}),
                  informeIndustrial: form.informeIndustrial,
                  obraTipos: form.obraTipos,
                  aceptaConfidencialidadCom21: form.aceptaConfidencialidadCom21,
                }
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
  const formCode = classification?.formCode;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold">Nueva solicitud de licencia</h1>
        <p className="mt-1 text-sm text-gray-600">
          {selectedLicenseType
            ? `${selectedLicenseType.code} — ${selectedLicenseType.name}`
            : 'Clasificación automática F08 / F02'}
        </p>

        {step === 'onboarding' && (
          <section className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Paso 1 — Antes de iniciar</h2>
            <p className="mt-1 text-sm text-gray-600">
              Estos trámites son <strong>externos a la municipalidad</strong> y deben estar
              listos antes de crear el expediente. La lista es orientativa y no bloquea el avance.
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

        {step === 'clasificacion' && (
          <form onSubmit={onClassify} className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Paso 2 — Clasificación del proyecto</h2>
            <p className="mt-1 text-sm text-gray-600">
              El sistema determina el formulario municipal aplicable (F08 o F02) según estos datos.
              Proyectos mayores a 700 m² o en Centro Histórico requieren trámite presencial.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium">Uso del inmueble</label>
                <select
                  value={uso}
                  onChange={(e) => setUso(e.target.value as UsoInmueble)}
                  className="mt-1 w-full rounded border px-3 py-2"
                >
                  <option value="RESIDENCIAL">Residencial unifamiliar</option>
                  <option value="MIXTO">Mixto</option>
                  <option value="COMERCIAL">Comercial</option>
                  <option value="INDUSTRIAL">Industrial</option>
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
                El inmueble está ubicado en Centro Histórico / conjunto histórico / amortiguamiento
              </label>
              {uso === 'RESIDENCIAL' && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={cambioUsoSuelo}
                    onChange={(e) => setCambioUsoSuelo(e.target.checked)}
                    className="h-4 w-4"
                  />
                  El proyecto incluye cambio de uso de suelo
                </label>
              )}
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

        {step === 'formulario' && formCode && (
          <form onSubmit={onCreate} className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Paso 3 — Datos del proyecto</h2>
            <p className="mt-1 text-sm text-gray-600">
              Formulario {formCode}
              {selectedLicenseType ? ` · ${selectedLicenseType.code}` : ''} · Profesional
              responsable: {user.fullName}
            </p>
            {formCode === 'F02' && (
              <p className="mt-2 rounded bg-blue-50 px-3 py-2 text-xs text-blue-900">
                Arancel provisional L-02 (base + % sobre presupuesto). Los documentos D-16…D-21 son
                opcionales según el proyecto.
              </p>
            )}

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
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void runFormValidation()}
                    disabled={checkingForm}
                    className="rounded border px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-50"
                  >
                    {checkingForm ? 'Verificando…' : 'Verificar dirección y NIT'}
                  </button>
                  {formValidation?.address && (
                    <CheckPill
                      status={formValidation.address.status}
                      label={formValidation.address.message}
                    />
                  )}
                </div>
                {formValidation?.address.status !== 'ok' && formValidation?.address.message && (
                  <p className="mt-1 text-xs text-yellow-800">{formValidation.address.message}</p>
                )}
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
                <label className="block text-sm font-medium">Área del terreno (m², según RGP)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required={formCode === 'F02'}
                  value={form.areaTerrenoM2}
                  onChange={(e) => setForm((f) => ({ ...f, areaTerrenoM2: e.target.value }))}
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
                  onBlur={() => {
                    if (form.nitPropietario.trim()) void runFormValidation();
                  }}
                  className="mt-1 w-full rounded border px-3 py-2"
                  placeholder="Ej. 1234567-8 o CF"
                />
                {formValidation?.nit && (
                  <p
                    className={`mt-1 text-xs ${
                      formValidation.nit.status === 'fail' ? 'text-red-700' : 'text-gray-600'
                    }`}
                  >
                    {formValidation.nit.message}
                  </p>
                )}
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

              {formCode === 'F02' && (
                <>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium">
                      Describa brevemente los trabajos, el uso y la solicitud
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={form.descripcionTrabajos}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, descripcionTrabajos: e.target.value }))
                      }
                      className="mt-1 w-full rounded border px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Tiempo estimado de ejecución (años)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      required
                      value={form.tiempoEjecucionAnios}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, tiempoEjecucionAnios: e.target.value }))
                      }
                      className="mt-1 w-full rounded border px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Informe industrial</label>
                    <select
                      value={form.informeIndustrial}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          informeIndustrial: e.target.value as 'NONE' | 'SIMPLE' | 'COMPLETO',
                        }))
                      }
                      className="mt-1 w-full rounded border px-3 py-2"
                    >
                      <option value="NONE">No aplica</option>
                      <option value="SIMPLE">Informe industrial simple</option>
                      <option value="COMPLETO">Informe industrial completo</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm font-medium">Tipo(s) de obra (F02 §5)</p>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {OBRA_TIPOS_F02.map((t) => (
                        <label key={t.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.obraTipos.includes(t.id)}
                            onChange={() => toggleObraTipo(t.id)}
                            className="h-4 w-4"
                          />
                          {t.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.talaArboles}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, talaArboles: e.target.checked }))
                        }
                        className="h-4 w-4"
                      />
                      El proyecto incluye tala de árboles
                    </label>
                    {form.talaArboles && (
                      <input
                        value={form.talaMotivo}
                        onChange={(e) => setForm((f) => ({ ...f, talaMotivo: e.target.value }))}
                        placeholder="Motivo de la tala"
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    )}
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.aceptaConfidencialidadCom21}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            aceptaConfidencialidadCom21: e.target.checked,
                          }))
                        }
                        className="h-4 w-4"
                      />
                      Entrego la información bajo garantía de confidencialidad (Acuerdo COM-21-2026)
                    </label>
                  </div>
                </>
              )}
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
                disabled={loading || !selectedLicenseType}
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
