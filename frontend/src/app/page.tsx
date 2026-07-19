"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        switch (user.role) {
          case 'CLIENT_B2B': router.push('/client'); break;
          case 'SALESPERSON': router.push('/sales'); break;
          case 'KAM': router.push('/kam'); break;
          case 'ADMIN': router.push('/admin'); break;
          default: router.push('/login');
        }
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin dark:border-zinc-700 dark:border-t-zinc-100" />
    </div>
  );
}
