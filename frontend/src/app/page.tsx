'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';

/** Redirige según la sesión: sin sesión → login; Admin → panel de usuarios. */
export default function HomePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    } else if (user.role === 'ADMIN') {
      router.replace('/admin/usuarios');
    }
    // Los demás roles verán sus paneles en las fases 2+.
  }, [user, router]);

  if (user && user.role !== 'ADMIN') {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md rounded-lg border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Hola, {user.fullName}</h1>
          <p className="mt-2 text-gray-600">
            Su cuenta está activa. El módulo de expedientes estará disponible en
            la siguiente fase del MVP.
          </p>
        </div>
      </main>
    );
  }

  return null;
}
