import { AppShell } from "@/components/app-shell";
import { TablePreview } from "@/components/table-preview";

type FeaturePageProps = {
  title: string;
  badge: string;
  description: string;
  bullets: string[];
  columns: string[];
  rows: string[][];
};

export function FeaturePage({
  title,
  badge,
  description,
  bullets,
  columns,
  rows,
}: FeaturePageProps) {
  return (
    <AppShell title={title} description={description} badge={badge}>
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="panel rounded-[28px] p-6">
          <h3 className="section-title text-2xl font-semibold text-[var(--color-ink-900)]">
            当前已锁定的规则
          </h3>
          <div className="mt-4 space-y-3">
            {bullets.map((bullet) => (
              <div
                key={bullet}
                className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.84)] px-4 py-3 text-sm leading-6 text-[var(--color-ink-700)]"
              >
                {bullet}
              </div>
            ))}
          </div>
        </article>

        <article className="panel rounded-[28px] p-6">
          <div className="mb-4">
            <h3 className="section-title text-2xl font-semibold text-[var(--color-ink-900)]">
              页面预览表
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              这里先用可读性优先的表格预览结构，等接口接入后替换成真实数据。
            </p>
          </div>
          <TablePreview columns={columns} rows={rows} />
        </article>
      </section>
    </AppShell>
  );
}
