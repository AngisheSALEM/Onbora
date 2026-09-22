"use client";

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function KamOfficeAliasRedirectPage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const slug = params?.slug;
    const subpath = Array.isArray(slug) ? slug.join('/') : slug || 'overview';
    router.replace(`/kamoffice/${subpath}`);
  }, [router, params]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
    </div>
  );
}
