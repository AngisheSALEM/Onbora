"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BackofficeSohoDirectoryRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/backoffice/directory');
  }, [router]);

  return null;
}
