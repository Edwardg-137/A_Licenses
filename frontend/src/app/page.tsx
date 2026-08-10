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
        router.replace('/admin');
        break;
      case 'SOLICITANTE':
        router.replace('/solicitante');
        break;
      case 'REVISOR':
        router.replace('/revisor');
        break;
      case 'INSPECTOR':
        router.replace('/inspector');
        break;
      default:
        break;
    }
  }, [user, router]);

  return null;
}
