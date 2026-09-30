import BackofficeVisitReportDetail from '@/components/backoffice/BackofficeVisitReportDetail';

export default async function BackofficeVisitReportPage({ params, searchParams }: {
  params: Promise<{ reportType: string; reportId: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const { reportType, reportId } = await params;
  const { from } = await searchParams;

  return (
    <BackofficeVisitReportDetail
      reportId={Number(reportId)}
      reportType={reportType}
      from={typeof from === 'string' ? from : undefined}
    />
  );
}
