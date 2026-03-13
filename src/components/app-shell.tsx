"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationGroups } from "@/lib/navigation";

type AppShellProps = {
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
};

export function AppShell({ title, description, badge, children }: AppShellProps) {
  const pathname = usePathname();

  const isActiveLink = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="page-grid">
        <aside className="panel h-fit rounded-[32px] p-5 lg:sticky lg:top-6">
          <div className="nav-card">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-strong)]">
              Guild Ledger
            </p>
            <h1 className="section-title mt-3 text-3xl font-semibold text-[var(--color-ink-900)]">
              西征数据中心
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              角色、行囊、公会补给处与冒险者集市共用同一套数据账簿，当前以可读性、可追溯性与操作稳定性为优先。
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
                      className={`focus-ring nav-link ${isActiveLink(item.href) ? "is-active" : ""}`}
                    >
                      <span className="nav-link-label">{item.label}</span>
                      <span className="nav-link-badge">{item.badge}</span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </nav>

          <div className="mt-6 grid gap-3">
            <div className="subtle-card rounded-[20px] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                当前基线
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">
                表格可读性优先
              </p>
            </div>
            <div className="subtle-card rounded-[20px] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                上线提醒
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--color-ink-900)]">
                正式发布前，请确认管理员密码文件与 Docker 环境配置一致。
              </p>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-col gap-6">
          <header className="panel rounded-[32px] px-6 py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                {badge ? <span className="eyebrow">{badge}</span> : null}
                <h2 className="section-title mt-3 text-3xl font-semibold text-[var(--color-ink-900)] sm:text-4xl">
                  {title}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                  {description}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="metric-card">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                    使用原则
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)] whitespace-nowrap">
                    以页面实时数据为准
                  </p>
                </div>
                <div className="metric-card">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                    当前阶段
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)] whitespace-nowrap">
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
