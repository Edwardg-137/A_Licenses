'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { SessionUser, useAuthStore } from '@/lib/auth-store';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSession(session);
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md">
        <h1 className="text-center text-2xl font-bold text-primary-700">PermisoGT</h1>
        <p className="mt-1 text-center text-sm text-gray-600">
          Expedientes digitales de licencias de construcción
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-6 space-y-4 rounded-lg border bg-white p-8 shadow-sm"
        >
          <h2 className="text-lg font-semibold">Iniciar sesión</h2>

          {error && (
            <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium">Correo electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 focus:border-primary-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 focus:border-primary-600 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-primary-600 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>

          <p className="text-center text-sm text-gray-600">
            ¿Es profesional colegiado y no tiene cuenta?{' '}
            <Link href="/registro" className="text-primary-600 hover:underline">
              Regístrese aquí
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
