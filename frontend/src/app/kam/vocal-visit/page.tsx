import { redirect } from 'next/navigation';

export default async function LegacyVocalVisitPage({ searchParams }: {
  searchParams: Promise<{ appointmentId?: string; id?: string }>;
}) {
  const params = await searchParams;
  const id = params.appointmentId || params.id;
  redirect(id ? `/kam/meeting-report?appointmentId=${encodeURIComponent(id)}` : '/kam/agenda');
}
