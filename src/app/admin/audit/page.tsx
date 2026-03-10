import { AppShell } from "@/components/app-shell";
import { requireAdminSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export default async function AdminAuditPage() {
  await requireAdminSession();
  const logs = await prisma.auditLog.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 100,
    include: {
      actorUser: true,
      targetUser: true,
      targetCharacter: true,
    },
  });

  return (
    <AppShell
      title="审计日志"
      badge="Audit Logs"
      description="首版审计日志已经接入真实数据库查询。当前优先保证动作、目标和变更摘要可追溯，先不加复杂筛选。"
    >
      <section className="grid gap-6">
        <article className="panel rounded-[28px] p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                当前展示
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">
                最近 100 条审计记录
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                覆盖动作
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">
                金币 / 声望 / 荣誉 / 商店 / 市场
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                当前策略
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">
                列表优先，可读性优先
              </p>
            </div>
          </div>
        </article>

        <article className="panel rounded-[28px] p-6">
          <div className="mb-4">
            <h3 className="section-title text-2xl font-semibold">真实审计列表</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              这里已经读取真实审计数据，方便管理员追踪谁在什么时间改了什么内容。
            </p>
          </div>

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>时间</th>
                  <th>动作</th>
                  <th>操作人</th>
                  <th>目标</th>
                  <th>改前</th>
                  <th>改后</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        {new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(log.createdAt)}
                      </td>
                      <td>{log.action}</td>
                      <td>{log.actorUser?.displayName ?? "-"}</td>
                      <td>{log.targetCharacter?.name ?? log.targetUser?.displayName ?? "-"}</td>
                      <td>{log.beforeValue ?? "-"}</td>
                      <td>{log.afterValue ?? "-"}</td>
                      <td>{log.note ?? "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-sm leading-6 text-[var(--muted)]">
                      当前还没有审计记录。后续玩家操作或管理员后台操作会自动写入这里。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
