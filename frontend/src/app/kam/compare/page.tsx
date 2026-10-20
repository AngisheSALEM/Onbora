"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KamComparePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/kam/accounts');
  }, [router]);

  return null;
}
