import Link from "next/link";
import { navigationGroups } from "@/lib/navigation";

type AppShellProps = {
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
};

export function AppShell({ title, description, badge, children }: AppShellProps) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="page-grid">
        <aside className="panel rounded-[28px] p-5">
          <div className="rounded-[24px] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(255,250,241,0.95),rgba(247,236,212,0.88))] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-strong)]">
              Guild Ledger
            </p>
            <h1 className="section-title mt-3 text-3xl font-semibold text-[var(--color-ink-900)]">
              西征数据管理中心
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              角色、背包、公共商店与玩家交易共用同一套数据账簿，当前以可读性、可追溯性与操作稳定性为优先。
            </p>
          </div>

          <nav className="mt-6 space-y-4">
            {navigationGroups.map((group) => (
              <section key={group.title}>
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-700)]">
                  {group.title}
                </p>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="focus-ring flex items-center justify-between rounded-2xl border border-transparent px-3 py-2 text-sm text-[var(--color-ink-700)] transition hover:border-[var(--border-soft)] hover:bg-[rgba(255,250,241,0.78)]"
                    >
                      <span>{item.label}</span>
                      <span className="text-xs text-[var(--muted)]">{item.badge}</span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </nav>
        </aside>

        <main className="flex min-w-0 flex-col gap-6">
          <header className="panel rounded-[28px] px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                {badge ? (
                  <span className="inline-flex rounded-full border border-[var(--border-soft)] bg-[rgba(127,92,47,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
                    {badge}
                  </span>
                ) : null}
                <h2 className="section-title mt-3 text-3xl font-semibold text-[var(--color-ink-900)] sm:text-4xl">
                  {title}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                  {description}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                    使用原则
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">
                    以页面实时数据为准
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                    当前阶段
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">
                    正式上线准备
                  </p>
                </div>
              </div>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
