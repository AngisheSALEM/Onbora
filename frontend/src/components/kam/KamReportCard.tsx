import React from 'react';

export default function KamReportCard({ title, description, icon, children, className = '' }: {
  title: string; description?: string; icon?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return <section className={`rounded-3xl bg-white dark:bg-[#2F2C30] p-5 sm:p-6 shadow-xs ${className}`}>
    <header className="mb-5 flex items-start gap-3">
      {icon && <span className="mt-1 text-zinc-500 dark:text-zinc-400" aria-hidden="true">{icon}</span>}
      <div><h3 className="text-[16px] leading-[26px] font-semibold">{title}</h3>
        {description && <p className="mt-1 text-[13px] leading-[21px] text-zinc-500 dark:text-zinc-400">{description}</p>}
      </div>
    </header>
    {children}
  </section>;
}
