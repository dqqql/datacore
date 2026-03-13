type SummaryCardProps = {
  title: string;
  value: string;
  detail: string;
};

export function SummaryCard({ title, value, detail }: SummaryCardProps) {
  return (
    <article className="metric-card">
      <p>{title}</p>
      <p className="metric-value">{value}</p>
      <p className="metric-detail">{detail}</p>
    </article>
  );
}
