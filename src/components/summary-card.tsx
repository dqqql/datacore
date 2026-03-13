import Link from "next/link";

type SummaryCardProps = {
  title: string;
  value: string;
  detail: string;
  href?: string;
};

export function SummaryCard({ title, value, detail, href }: SummaryCardProps) {
  const inner = (
    <>
      <p>{title}</p>
      <p className="metric-value">{value}</p>
      <p className="metric-detail">{detail}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="metric-card block transition hover:border-[var(--border-strong)] hover:bg-[var(--panel-strong)]">
        {inner}
      </Link>
    );
  }

  return <article className="metric-card">{inner}</article>;
}
