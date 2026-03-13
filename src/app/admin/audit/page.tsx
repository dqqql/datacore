import { AppShell } from "@/components/app-shell";
import { requireAdminSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

function formatAuditAction(action: string) {
  const labels: Record<string, string> = {
    CHARACTER_GOLD_UPDATED: "金币调整",
    CHARACTER_REPUTATION_UPDATED: "声望调整",
    USER_HONOR_UPDATED: "荣誉值调整",
    PRIVATE_ITEM_CREATED: "录入私人物品",
    MARKET_LISTED: "市场上架",
    MARKET_CANCELLED: "市场下架",
    MARKET_PURCHASED: "市场成交",
    SHOP_PURCHASED: "商店购买",
    SHOP_SELLBACK: "商店回收",
    SHOP_ITEM_UPDATED: "商店条目维护",
    SHOP_PASSWORD_POOL_REFRESHED: "密码池刷新",
    CHARACTER_ARCHIVED: "角色归档",
    CHARACTER_RESTORED: "角色恢复",
  };

  return labels[action] ?? action;
}

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
      badge="审计"
      description="这里集中展示系统关键操作记录。当前优先保证动作、目标与变更摘要可追溯，暂不启用复杂筛选。"
    >
      <section className="grid gap-6">
        <article className="panel rounded-[28px] p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                当前展示范围
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">最近 100 条记录</p>
            </div>
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                覆盖模块
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">
                角色、荣誉、商店、市场
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                当前策略
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">列表优先，便于追溯</p>
            </div>
          </div>
        </article>

        <article className="panel rounded-[28px] p-6">
          <div className="mb-4">
            <h3 className="section-title text-2xl font-semibold">操作记录列表</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              这里展示真实审计数据，方便管理员确认是谁、在何时、对什么对象执行了何种操作。
            </p>
          </div>

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>时间</th>
                  <th>动作</th>
                  <th>操作人</th>
                  <th>目标对象</th>
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
                      <td>{formatAuditAction(log.action)}</td>
                      <td>{log.actorUser?.displayName ?? "-"}</td>
                      <td>{log.targetCharacter?.name ?? log.targetUser?.displayName ?? "-"}</td>
                      <td>{log.note ?? "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-sm leading-6 text-[var(--muted)]">
                      当前尚无审计记录。玩家操作与后台维护动作都会自动写入这里。
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
