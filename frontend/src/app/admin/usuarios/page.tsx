'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface UserRow {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'DISABLED';
  collegeType: string | null;
  collegeNumber: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<UserRow['status'], string> = {
  PENDING_APPROVAL: 'Pendiente de aprobación',
  ACTIVE: 'Activo',
  DISABLED: 'Desactivado',
};

const ROLE_LABEL: Record<string, string> = {
  SOLICITANTE: 'Solicitante',
  REVISOR: 'Revisor',
  INSPECTOR: 'Inspector',
  ADMIN: 'Admin',
};

export default function AdminUsuariosPage() {
  const router = useRouter();
  const { user, clearSession } = useAuthStore();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setUsers(await api<UserRow[]>('/users'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'ADMIN') {
      router.replace('/');
      return;
    }
    loadUsers();
  }, [user, router, loadUsers]);

  async function action(path: string) {
    setError(null);
    try {
      await api(path, { method: 'PATCH' });
      await loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }

  if (!user || user.role !== 'ADMIN') return null;

  const pending = users.filter((u) => u.status === 'PENDING_APPROVAL');
  const others = users.filter((u) => u.status !== 'PENDING_APPROVAL');

  return (
    <main className="mx-auto max-w-5xl p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-700">PermisoGT — Administración</h1>
          <p className="text-sm text-gray-600">Gestión de usuarios · {user.fullName}</p>
        </div>
        <button
          onClick={() => {
            clearSession();
            router.replace('/login');
          }}
          className="rounded border px-4 py-2 text-sm hover:bg-gray-100"
        >
          Cerrar sesión
        </button>
      </header>

      {error && (
        <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {pending.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">
            Solicitantes pendientes de aprobación ({pending.length})
          </h2>
          <div className="mt-3 overflow-hidden rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Correo</th>
                  <th className="p-3">Colegiado</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {pending.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="p-3">{u.fullName}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">
                      {u.collegeType} {u.collegeNumber}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => action(`/users/${u.id}/approve`)}
                        className="rounded bg-green-600 px-3 py-1.5 text-white hover:bg-green-700"
                      >
                        Aprobar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Usuarios ({others.length})</h2>
          <button
            onClick={() => setShowCreateForm((v) => !v)}
            className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            {showCreateForm ? 'Cancelar' : '+ Crear usuario interno'}
          </button>
        </div>

        {showCreateForm && (
          <CreateInternalUserForm
            onCreated={() => {
              setShowCreateForm(false);
              loadUsers();
            }}
            onError={setError}
          />
        )}

        <div className="mt-3 overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">Nombre</th>
                <th className="p-3">Correo</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Estado</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {others.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3">{u.fullName}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{ROLE_LABEL[u.role] ?? u.role}</td>
                  <td className="p-3">
                    <span
                      className={
                        u.status === 'ACTIVE'
                          ? 'rounded bg-green-100 px-2 py-0.5 text-green-800'
                          : 'rounded bg-gray-200 px-2 py-0.5 text-gray-700'
                      }
                    >
                      {STATUS_LABEL[u.status]}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {u.role !== 'ADMIN' &&
                      (u.status === 'ACTIVE' ? (
                        <button
                          onClick={() => action(`/users/${u.id}/deactivate`)}
                          className="rounded border border-red-300 px-3 py-1.5 text-red-700 hover:bg-red-50"
                        >
                          Desactivar
                        </button>
                      ) : (
                        <button
                          onClick={() => action(`/users/${u.id}/activate`)}
                          className="rounded border px-3 py-1.5 hover:bg-gray-100"
                        >
                          Activar
                        </button>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function CreateInternalUserForm({
  onCreated,
  onError,
}: {
  onCreated: () => void;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'REVISOR',
  });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/users/internal', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      onCreated();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 grid grid-cols-1 gap-3 rounded-lg border bg-white p-4 sm:grid-cols-2"
    >
      <input
        required
        placeholder="Nombre completo"
        value={form.fullName}
        onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
        className="rounded border px-3 py-2 focus:border-primary-600 focus:outline-none"
      />
      <input
        type="email"
        required
        placeholder="Correo electrónico"
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        className="rounded border px-3 py-2 focus:border-primary-600 focus:outline-none"
      />
      <input
        type="password"
        required
        minLength={8}
        placeholder="Contraseña temporal (mín. 8)"
        value={form.password}
        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        className="rounded border px-3 py-2 focus:border-primary-600 focus:outline-none"
      />
      <select
        value={form.role}
        onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
        className="rounded border px-3 py-2 focus:border-primary-600 focus:outline-none"
      >
        <option value="REVISOR">Revisor Municipal</option>
        <option value="INSPECTOR">Inspector</option>
      </select>
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-primary-600 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-50 sm:col-span-2"
      >
        {loading ? 'Creando…' : 'Crear usuario'}
      </button>
    </form>
  );
}
