import { fetchAPI } from '@/lib/api';
import type { VisitReportData } from '@/components/kam/KamVisitReportView';
import type { EnterpriseItem, VisitReportItem, VisitSubmissionItem } from './backofficeTypes';

export type BackofficeReportSource = Partial<VisitReportItem & VisitSubmissionItem> & {
  id: number;
  type?: string;
  raw_transcript?: string;
  preparation_details?: {
    enterprise_details?: EnterpriseItem;
    salesperson_username?: string;
  };
};

export function getBackofficeReportHref(report: BackofficeReportSource, from: string) {
  const kind = report.type === 'SUBMISSION' ? 'submission' : 'report';
  return `/backoffice/daily-report/${kind}/${report.id}?from=${encodeURIComponent(from)}`;
}

export function normalizeBackofficeReport(report: BackofficeReportSource, kind: string): VisitReportData {
  const isSubmission = kind === 'submission';
  const enterprise = report.preparation_details?.enterprise_details;

  return {
    id: report.id,
    enterprise_name: report.enterprise_name || enterprise?.name || 'Rapport de visite',
    created_at: report.created_at || '',
    executive_summary: report.ai_summary || report.executive_summary || '',
    confirmed_needs: report.detected_needs?.length ? report.detected_needs : report.confirmed_needs || [],
    objections_raised: report.objections_noted ? [report.objections_noted] : report.objections_raised || [],
    actions_todo: report.next_action ? [report.next_action] : report.actions_todo || [],
    follow_up_email_draft: report.follow_up_email_draft || '',
    raw_transcript: report.raw_transcript,
    source_label: isSubmission ? 'Formulaire de qualification guidé' : 'Compte-rendu de visite',
    salesperson_name: report.salesperson_name || report.preparation_details?.salesperson_username,
    plaque_code: report.plaque_code || enterprise?.plaque_code,
    target_offer_name: report.target_offer_name,
    qualification_score: report.qualification_score,
    answers: report.answers,
  };
}

export async function fetchBackofficeReport(kind: string, id: number, signal?: AbortSignal): Promise<VisitReportData> {
  if (kind !== 'report' && kind !== 'submission') throw new Error('Rapport de visite introuvable.');

  let report: BackofficeReportSource | undefined;
  if (kind === 'submission') {
    const submissions: VisitSubmissionItem[] = await fetchAPI('/api/sales/visit-form/submissions/', { signal });
    report = submissions.find((submission) => submission.id === id);
  } else {
    report = await fetchAPI(`/api/sales/visit-reports/${id}/`, { signal });
  }
  if (!report?.id) throw new Error('Rapport de visite introuvable.');
  return normalizeBackofficeReport(report, kind);
}
