import { fetchAPI } from './api';

export interface CompanyResearchStatus {
  id: string;
  state: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  status_url: string;
  retry_after: number;
  outcome?: string | null;
  error_code?: string;
  application_status?: string;
}

export function companyResearchNotice(job?: CompanyResearchStatus | null): string | null {
  if (job?.state !== 'completed') return null;
  if (job.application_status === 'preserved_manual_edits') {
    return 'Recherche terminée. Vos corrections ont été conservées dans la synthèse.';
  }
  if (job.outcome === 'ambiguous') {
    return 'Plusieurs entreprises peuvent correspondre. Précisez le site ou l’identifiant de l’entreprise avant de relancer la recherche.';
  }
  if (job.outcome === 'no_information') {
    return 'La recherche n’a trouvé aucune nouvelle information étayée. Votre fiche a été conservée.';
  }
  if (job.outcome === 'partial') {
    return 'Certaines informations restent à vérifier. Consultez les faits, les sources et les points de vigilance.';
  }
  return null;
}

function pause(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}

export async function waitForCompanyResearch(job: CompanyResearchStatus, signal: AbortSignal) {
  const deadline = Date.now() + 310_000;
  while (job.state === 'queued' || job.state === 'running') {
    if (Date.now() >= deadline) {
      throw new Error('La recherche prend plus de temps que prévu. Revenez sur ce compte pour consulter son avancement.');
    }
    // Poll only the authenticated Onbora endpoint, never a provider URL from a response.
    await pause(Math.min(60, Math.max(1, job.retry_after || 2)) * 1000, signal);
    job = await fetchAPI(`/api/ai/research/jobs/${encodeURIComponent(job.id)}/`, { signal });
  }
  if (job.state === 'failed' || job.state === 'cancelled') {
    throw new Error('La recherche n’a pas abouti. Votre fiche est conservée. Réessayez l’actualisation dans quelques instants.');
  }
  return job;
}
