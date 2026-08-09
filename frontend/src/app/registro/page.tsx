'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { api, ApiError } from '@/lib/api';

export default function RegistroPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    collegeType: 'CIG',
    collegeNumber: '',
    phone: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await api<{ message: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...form, phone: form.phone || undefined }),
      });
      setSuccessMessage(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  }

  if (successMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md rounded-lg border border-green-200 bg-green-50 p-8 text-center">
          <h1 className="text-lg font-semibold text-green-800">Registro recibido</h1>
          <p className="mt-2 text-sm text-green-700">{successMessage}</p>
          <Link
            href="/login"
            className="mt-4 inline-block text-sm text-primary-600 hover:underline"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md">
        <h1 className="text-center text-2xl font-bold text-primary-700">PermisoGT</h1>

        <form
          onSubmit={onSubmit}
          className="mt-6 space-y-4 rounded-lg border bg-white p-8 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-semibold">Registro de profesional</h2>
            <p className="mt-1 text-sm text-gray-600">
              Para arquitectos e ingenieros civiles colegiados activos. Su cuenta
              será aprobada manualmente por el Administrador Municipal.
            </p>
          </div>

          {error && (
            <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium">Nombre completo</label>
            <input
              required
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 focus:border-primary-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Correo electrónico</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 focus:border-primary-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              Contraseña (mínimo 8 caracteres)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 focus:border-primary-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Colegio</label>
              <select
                value={form.collegeType}
                onChange={(e) => update('collegeType', e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 focus:border-primary-600 focus:outline-none"
              >
                <option value="CIG">CIG — Ingenieros</option>
                <option value="CAG">CAG — Arquitectos</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">No. de colegiado</label>
              <input
                required
                value={form.collegeNumber}
                onChange={(e) => update('collegeNumber', e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 focus:border-primary-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Teléfono (opcional)</label>
            <input
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 focus:border-primary-600 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-primary-600 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Enviando…' : 'Registrarme'}
          </button>

          <p className="text-center text-sm text-gray-600">
            ¿Ya tiene cuenta?{' '}
            <Link href="/login" className="text-primary-600 hover:underline">
              Inicie sesión
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
