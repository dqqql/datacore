type SummaryCardProps = {
  title: string;
  value: string;
  detail: string;
};

export function SummaryCard({ title, value, detail }: SummaryCardProps) {
  return (
    <article className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,250,241,0.86)] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
        {title}
      </p>
      <p className="mt-3 text-lg font-semibold text-[var(--color-ink-900)]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{detail}</p>
    </article>
  );
}
