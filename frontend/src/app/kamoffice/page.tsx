"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KamOfficeRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/kamoffice/overview');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
    </div>
  );
}
