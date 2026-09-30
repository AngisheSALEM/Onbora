"use client";

import Link from 'next/link';
import { StrategicVisit } from './kamTypes';

interface Props {
  accounts: StrategicVisit[];
  loading: boolean;
  error: string | null;
  onSelectAccount?: (account: StrategicVisit) => void;
}

export default function KamAccountsTable({ accounts, loading, error, onSelectAccount }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-left border-collapse" aria-label="Comptes B2B attribués">
        <thead>
          <tr className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {['Compte', 'Secteur', 'Contact principal', 'Opérateur actuel', 'Fin du contrat'].map((label) => (
              <th key={label} scope="col" className="pb-4 pr-4 font-semibold">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} className="py-10 text-center text-sm text-zinc-500" role="status">Chargement des comptes…</td></tr>
          ) : error ? (
            <tr><td colSpan={5} className="py-8 text-center text-sm text-zinc-600 dark:text-zinc-300" role="alert">{error}</td></tr>
          ) : accounts.length === 0 ? (
            <tr><td colSpan={5} className="py-10 text-center text-sm text-zinc-500">Aucun compte à afficher. Vérifiez votre recherche ou les comptes attribués à votre portefeuille.</td></tr>
          ) : accounts.map((account) => (
            <tr key={account.id} className="hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
              <td className="py-4 pr-4 text-xs font-semibold text-zinc-900 dark:text-white">
                {onSelectAccount ? (
                  <button type="button" onClick={() => onSelectAccount(account)} className="text-left hover:underline focus-visible:underline cursor-pointer">{account.account_name}</button>
                ) : (
                  <Link href={`/kam/briefing?id=${encodeURIComponent(account.id)}`} className="hover:underline focus-visible:underline">{account.account_name}</Link>
                )}
              </td>
              <td className="py-4 pr-4 text-xs text-zinc-700 dark:text-zinc-300">{account.briefing?.industry || 'Non renseigné'}</td>
              <td className="py-4 pr-4 text-xs text-zinc-700 dark:text-zinc-300">{account.contact_name || 'Non renseigné'}</td>
              <td className="py-4 pr-4 text-xs text-zinc-600 dark:text-zinc-400">{account.current_operator || 'Non renseigné'}</td>
              <td className="py-4 text-xs text-zinc-500 dark:text-zinc-400">{account.orange_contract_end_date || 'Non renseignée'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
