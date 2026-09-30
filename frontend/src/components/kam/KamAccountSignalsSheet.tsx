"use client";

export interface AccountRadarDetail {
  enterprise_id: number;
  health_score: number;
  churn_risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priority_level: string;
  risk_reasons: string[];
  retention_plan: { urgency?: string; action?: string; email_draft?: string } | null;
  upsell_opportunities: { solution?: string; trigger?: string; estimated_value?: string; talking_point?: string }[];
  days_without_action: number;
  renewal_days: number | null;
  next_action_at: string | null;
}

export default function KamAccountSignalsSheet({ data, kind }: { data: AccountRadarDetail; kind: 'churn' | 'upsell' }) {
  return (
    <section aria-label={kind === 'churn' ? 'Risques de churn' : 'Opportunités d’upsell'} className="max-w-4xl mx-auto w-full rounded-2xl bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 md:p-9 text-zinc-800 dark:text-zinc-200">
      {kind === 'churn' ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Risques de churn</h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{data.risk_level === 'CRITICAL' ? 'Risque critique' : data.risk_level === 'HIGH' ? 'Risque élevé' : 'Compte sous surveillance'} · Priorité {data.priority_level}</p>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Santé du compte <strong className="ml-2 text-xl tabular-nums text-zinc-900 dark:text-white">{data.health_score}/100</strong></p>
          </div>
          <dl className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            <div><dt className="text-zinc-500 dark:text-zinc-400">Risque de churn</dt><dd className="mt-1 font-semibold tabular-nums">{data.churn_risk_score}/100</dd></div>
            <div><dt className="text-zinc-500 dark:text-zinc-400">Sans interaction</dt><dd className="mt-1 font-semibold">{data.days_without_action} jours</dd></div>
            <div><dt className="text-zinc-500 dark:text-zinc-400">Échéance du contrat</dt><dd className="mt-1 font-semibold">{data.renewal_days === null ? 'Non renseignée' : data.renewal_days < 0 ? `Dépassée de ${Math.abs(data.renewal_days)} jours` : `Dans ${data.renewal_days} jours`}</dd></div>
          </dl>
          <h3 className="mt-10 text-sm font-semibold">Signaux détectés</h3>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed">
            {data.risk_reasons.map((reason, index) => <li key={`${index}-${reason}`} className="flex gap-3"><span className="text-zinc-400 tabular-nums">{String(index + 1).padStart(2, '0')}</span><span>{reason}</span></li>)}
          </ul>
          {data.retention_plan?.action && <div className="mt-10"><h3 className="text-sm font-semibold">Plan de rétention</h3><p className="mt-3 text-sm leading-relaxed max-w-[70ch]">{data.retention_plan.action}</p></div>}
          {data.retention_plan?.email_draft && <div className="mt-8"><h3 className="text-sm font-semibold">Brouillon de suivi client</h3><p className="mt-3 text-sm leading-relaxed whitespace-pre-line max-w-[70ch]">{data.retention_plan.email_draft}</p></div>}
        </>
      ) : (
        <>
          <h2 className="text-xl font-bold tracking-tight">Opportunités d’upsell</h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{data.upsell_opportunities.length} opportunité{data.upsell_opportunities.length > 1 ? 's' : ''} identifiée{data.upsell_opportunities.length > 1 ? 's' : ''} pour ce compte</p>
          <div className="mt-8 space-y-10">
            {data.upsell_opportunities.map((opportunity, index) => (
              <article key={`${index}-${opportunity.solution}`}>
                <h3 className="text-base font-semibold">{opportunity.solution || 'Solution à préciser'}</h3>
                <dl className="mt-4 space-y-4 text-sm leading-relaxed max-w-[70ch]">
                  {opportunity.trigger && <div><dt className="text-zinc-500 dark:text-zinc-400">Besoin identifié</dt><dd className="mt-1">{opportunity.trigger}</dd></div>}
                  {opportunity.estimated_value && <div><dt className="text-zinc-500 dark:text-zinc-400">Valeur estimée</dt><dd className="mt-1 font-semibold">{opportunity.estimated_value}</dd></div>}
                  {opportunity.talking_point && <div><dt className="text-zinc-500 dark:text-zinc-400">Argument commercial</dt><dd className="mt-1">{opportunity.talking_point}</dd></div>}
                </dl>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
