"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useKamContext } from '@/components/kam/KamContext';
import KamAccountsTable from '@/components/kam/KamAccountsTable';
import Pagination from '@/components/kam/Pagination';

const PAGE_SIZE = 12;

function AccountsDirectory() {
  const { visits, searchQuery, loading, error, loadAssignedAccounts } = useKamContext();
  const [requestedPage, setRequestedPage] = useState(1);
  const query = searchQuery.trim().toLocaleLowerCase('fr');
  const accounts = visits.filter((account) => [account.account_name, account.briefing?.industry, account.contact_name, account.current_operator]
    .some((value) => value?.toLocaleLowerCase('fr').includes(query)));
  const totalPages = Math.ceil(accounts.length / PAGE_SIZE);
  const currentPage = Math.min(requestedPage, Math.max(1, totalPages));

  return (
    <div className="flex-1 flex flex-col gap-6 p-6 md:p-8 overflow-y-auto">
      <header>
        <Link href="/kam/accounts" className="text-xs text-zinc-500 dark:text-zinc-400 hover:underline">Retour au portefeuille</Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Tous mes comptes B2B</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{accounts.length} compte{accounts.length > 1 ? 's' : ''} {query ? 'correspondant à votre recherche' : 'dans votre portefeuille'}</p>
      </header>
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
