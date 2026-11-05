export interface SectorAccount {
  id: string;
  name: string;
  sector: string;
  status: string;
  needs: string[];
  offers: { category: string; end_date: string | null }[];
}

export interface SectorAnalyticsData {
  accounts: SectorAccount[];
  generated_at: string;
  today: string;
}

export const serviceCategories = [
  { id: 'CONNECTIVITY', label: 'Connectivité' },
  { id: 'CLOUD', label: 'Cloud' },
  { id: 'SECURITY', label: 'Cybersécurité' },
  { id: 'COLLABORATIVE', label: 'Collaboration' },
  { id: 'PAYMENT', label: 'Paiement' },
];

// Calendar dates from the API; UTC prevents DST shifts in renewal buckets.
export function renewalDays(endDate: string | null, today: string): number | null {
  if (!endDate) return null;
  const days = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000;
  return Number.isFinite(days) ? days : null;
}

export function sectorGroups(accounts: SectorAccount[]) {
  const groups = new Map<string, SectorAccount[]>();
  for (const account of accounts) {
    const label = account.sector;
    const key = label.toLocaleLowerCase('fr');
    const existing = groups.get(key);
    if (existing) existing.push(account);
    else groups.set(key, [account]);
  }
  return [...groups.values()].map(rows => ({ label: rows[0].sector, accounts: rows }))
    .sort((a, b) => b.accounts.length - a.accounts.length || a.label.localeCompare(b.label, 'fr'));
}

export function confirmedNeedGroups(accounts: SectorAccount[]) {
  const groups = new Map<string, SectorAccount[]>();
  for (const account of accounts) {
    for (const need of new Set(account.needs)) {
      const rows = groups.get(need) || [];
      rows.push(account);
      groups.set(need, rows);
    }
  }
  return [...groups].map(([label, rows]) => ({ label, accounts: rows }))
    .sort((a, b) => b.accounts.length - a.accounts.length || a.label.localeCompare(b.label, 'fr'));
}
