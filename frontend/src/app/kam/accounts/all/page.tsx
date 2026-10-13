"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useKamContext } from '@/components/kam/KamContext';
import KamAccountsTable from '@/components/kam/KamAccountsTable';
import Pagination from '@/components/kam/Pagination';
import { Icons } from '@/components/shared/Icons';

const PAGE_SIZE = 12;

function AccountsDirectory() {
  const { visits, searchQuery, activeFilter, setActiveFilter, setFilterOptions, setFilterCategoryLabel, loading, error, loadAssignedAccounts } = useKamContext();
  const [requestedPage, setRequestedPage] = useState(1);

  useEffect(() => {
    setActiveFilter('ALL');
    setFilterCategoryLabel('SECTEUR D’ACTIVITÉ');
    const miningCount = visits.filter((a) => (a.briefing?.industry || '').toLowerCase().includes('mine')).length;
    const bankingCount = visits.filter((a) => (a.briefing?.industry || '').toLowerCase().includes('banque') || (a.briefing?.industry || '').toLowerCase().includes('financ')).length;
    const otherCount = visits.length - miningCount - bankingCount;
    setFilterOptions([
      { id: 'ALL', label: 'Tous les secteurs', count: visits.length },
      { id: 'MINING', label: 'Mines & Métallurgie', count: miningCount },
      { id: 'BANKING', label: 'Banques & Finance', count: bankingCount },
      { id: 'OTHER', label: 'Autres industries', count: Math.max(0, otherCount) },
    ]);
    return () => {
      setFilterOptions([]);
    };
  }, [visits, setActiveFilter, setFilterCategoryLabel, setFilterOptions]);

  const query = searchQuery.trim().toLocaleLowerCase('fr');

  let filteredVisits = visits;
  if (activeFilter === 'MINING') {
    filteredVisits = filteredVisits.filter((a) => (a.briefing?.industry || '').toLowerCase().includes('mine'));
  } else if (activeFilter === 'BANKING') {
    filteredVisits = filteredVisits.filter((a) => (a.briefing?.industry || '').toLowerCase().includes('banque') || (a.briefing?.industry || '').toLowerCase().includes('financ'));
  } else if (activeFilter === 'OTHER') {
    filteredVisits = filteredVisits.filter((a) => !(a.briefing?.industry || '').toLowerCase().includes('mine') && !(a.briefing?.industry || '').toLowerCase().includes('banque') && !(a.briefing?.industry || '').toLowerCase().includes('financ'));
  }

  const accounts = filteredVisits.filter((account) => [account.account_name, account.briefing?.industry, account.contact_name, account.current_operator]
    .some((value) => value?.toLocaleLowerCase('fr').includes(query)));
  const totalPages = Math.ceil(accounts.length / PAGE_SIZE);
  const currentPage = Math.min(requestedPage, Math.max(1, totalPages));

  return (
    <div className="flex-1 flex flex-col gap-6 p-6 md:p-8 overflow-y-auto">
      <div className="pb-2 border-b border-black/5 dark:border-white/5">
        <Link
          href="/kam/accounts"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors mb-2"
        >
          <Icons.ArrowLeft size={13} />
          <span>Retour au Portefeuille</span>
        </Link>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
          Tous mes comptes B2B
        </h1>
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
          {accounts.length} compte{accounts.length > 1 ? 's' : ''} {query ? 'correspondant à votre recherche' : 'dans votre portefeuille'}
        </p>
      </div>
      <section className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-5 md:p-6">
        <KamAccountsTable accounts={accounts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)} loading={loading} error={error} />
        {!loading && !error && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setRequestedPage} totalItems={accounts.length} pageSize={PAGE_SIZE} itemName="comptes B2B" />}
        {error && <button type="button" onClick={() => void loadAssignedAccounts()} className="mt-4 text-sm text-zinc-700 dark:text-zinc-200 hover:underline">Réessayer</button>}
      </section>
    </div>
  );
}

export default function AllKamAccountsPage() {
  const { searchQuery } = useKamContext();
  return <AccountsDirectory key={searchQuery} />;
}
