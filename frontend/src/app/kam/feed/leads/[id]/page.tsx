import KamCommercialActionView from '@/components/kam/KamCommercialActionView';

export default async function KamCommercialActionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <KamCommercialActionView key={id} newsId={id} />;
}
