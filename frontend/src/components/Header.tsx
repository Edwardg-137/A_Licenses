'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { ROLE_LABEL } from '@/lib/constants';

interface NavLink {
  href: string;
  label: string;
}

const NAV_BY_ROLE: Record<string, NavLink[]> = {
  SOLICITANTE: [{ href: '/solicitante', label: 'Mis expedientes' }],
  REVISOR: [{ href: '/revisor', label: 'Bandeja de expedientes' }],
  INSPECTOR: [{ href: '/inspector', label: 'Agenda de inspecciones' }],
  ADMIN: [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/usuarios', label: 'Usuarios' },
    { href: '/revisor', label: 'Expedientes' },
  ],
};

export default function Header() {
  const router = useRouter();
  const { user, clearSession } = useAuthStore();

  if (!user) return null;
  const links = NAV_BY_ROLE[user.role] ?? [];

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold text-primary-700">
            PermisoGT
          </Link>
          <nav className="flex gap-4 text-sm">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-gray-700 hover:text-primary-600">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            {user.fullName} · <span className="font-medium">{ROLE_LABEL[user.role]}</span>
          </span>
          <button
            onClick={() => {
              clearSession();
              router.replace('/login');
            }}
            className="rounded border px-3 py-1.5 hover:bg-gray-100"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
