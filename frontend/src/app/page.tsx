'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';

/** Redirige según la sesión y el rol del usuario. */
export default function HomePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    switch (user.role) {
      case 'ADMIN':
        router.replace('/admin/usuarios');
        break;
      case 'SOLICITANTE':
        router.replace('/solicitante');
        break;
      case 'REVISOR':
        router.replace('/revisor');
        break;
      default:
        // INSPECTOR: su agenda llega en la Fase 4
        break;
    }
  }, [user, router]);

  if (user && user.role === 'INSPECTOR') {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md rounded-lg border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Hola, {user.fullName}</h1>
          <p className="mt-2 text-gray-600">
            Su cuenta está activa. La agenda de inspecciones estará disponible en
            una siguiente fase del MVP.
          </p>
        </div>
      </main>
    );
  }

  return null;
}
