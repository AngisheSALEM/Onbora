export type SignalFocus = Partial<Record<'focus_sector' | 'focus_category' | 'focus_priority' | 'focus_confidence' | 'focus_state' | 'focus_day', string>>;
export interface SignalOptions {
  categories: Record<string, string>;
  confidences: Record<string, string>;
  priorities: Record<string, string>;
  states: Record<string, string>;
  sectors: string[];
}
export interface AnalysisSignal {
  id: string;
  enterprise_id: number;
  company: string;
  sector: string;
  title: string;
  category: string;
  confidence: string;
  priority: string;
  state: string;
  first_seen: string;
  last_seen: string;
  event_date: string | null;
  actioned_at: string | null;
}
export interface SignalDashboard {
  period: { start: string; end: string };
  generated_at: string;
  available_history: { signals: number; research_runs: number };
  options: SignalOptions;
  stats: { new_signals: number; companies: number; priority_pending: number; actioned: number; analyzed_companies: number; research_runs: number };
  timeline: { day: string; count: number }[];
  categories: Record<string, number>;
  states: Record<string, number>;
  sector_matrix: { sector: string; analyzed_companies: number; categories: Record<string, number> }[];
  priority_matrix: { review_priority: string; confidence: string; count: number }[];
  list: { count: number; page: number; page_size: number; results: AnalysisSignal[] };
}
export interface SignalSource {
  url: string;
  title: string;
  publisher: string;
  relationship: string;
  collected_at: string | null;
  published_at: string | null;
}
export interface SignalDetail extends AnalysisSignal {
  note: string;
  history: { count: number; page: number; page_size: number; results: {
    observed_at: string; recorded_at: string; confidence: string; identity_status: string;
    fact: { statement: string; attribution: string; support_status: string; valid_at: string | null };
    sources: SignalSource[];
  }[] };
  followup: { state: string; priority: string; note: string; created_at: string }[];
  followup_count: number;
}

export function signalQuery(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== '' && value !== undefined) params.set(key, String(value));
  });
  return params.toString();
}

export function signalDate(value: string | null, withTime = false) {
  if (!value) return 'Non renseignée';
  const date = new Date(value.length === 10 ? `${value}T00:00:00+01:00` : value);
  if (!Number.isFinite(date.getTime())) return 'Non renseignée';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Kinshasa', day: '2-digit', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } as const : {}),
  }).format(date);
}

export function safeSourceUrl(value: string) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function trendPoints(timeline: { day: string; count: number }[]) {
  const max = Math.max(1, ...timeline.map(point => point.count));
  return timeline.map((point, index) => ({ ...point,
    x: timeline.length <= 1 ? 300 : 16 + index / (timeline.length - 1) * 568,
    y: 158 - point.count / max * 132,
  }));
}
