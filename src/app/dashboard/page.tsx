import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SummaryCard } from "@/components/summary-card";
import { requirePlayerCharacter } from "@/lib/auth-helpers";

export default async function DashboardPage() {
  const context = await requirePlayerCharacter();
  const { session, user, characters, currentCharacter } = context;

  return (
    <AppShell
      title={`欢迎回来，${user.displayName}`}
      description="这里是当前账号的总控台，集中展示角色、荣誉值与主要业务入口。"
      badge={session.user.role === "ADMIN" ? "管理员会话" : "玩家会话"}
    >
      <section className="grid gap-6 lg:grid-cols-3">
        <SummaryCard
          title="账号荣誉值"
          value={String(user.honor)}
          detail="荣誉值绑定账号，仅允许管理员发放或扣减。"
        />
        <SummaryCard
          title="当前角色"
          value={currentCharacter?.name ?? "未选择角色"}
          detail="当前角色将影响背包、商店购买与玩家交易。"
        />
        <SummaryCard
          title="可用角色数"
          value={String(characters.length)}
          detail="角色支持新增与归档，当前不支持硬删除。"
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="panel rounded-[28px] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="section-title text-2xl font-semibold">当前角色摘要</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                这里展示当前角色的实时金币与声望，便于确认后续购买与交易基线。
              </p>
            </div>
            {currentCharacter ? (
              <Link
                href={`/characters/${currentCharacter.id}`}
                className="focus-ring btn-secondary"
              >
                查看角色详情
              </Link>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,250,241,0.86)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-700)]">
                当前金币
              </p>
              <p className="mt-3 text-3xl font-semibold text-[var(--color-ink-900)]">
                {currentCharacter?.gold ?? 0}
              </p>
            </div>
            <div className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,250,241,0.86)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-700)]">
                当前声望
              </p>
              <p className="mt-3 text-3xl font-semibold text-[var(--color-ink-900)]">
                {currentCharacter?.reputation ?? 0}
              </p>
            </div>
          </div>
        </article>

        <article className="panel rounded-[28px] p-6">
          <h3 className="section-title text-2xl font-semibold">快捷入口</h3>
          <div className="mt-4 grid gap-3">
            {[
              { label: "角色管理", href: "/characters", detail: "切换当前角色，新增或归档角色" },
              { label: "玩家交易", href: "/market", detail: "浏览挂单、下架自己的物品或直接购买" },
              { label: "公会商店", href: "/shops/guild", detail: "使用当前角色金币购买公共物品" },
              { label: "荣誉商店", href: "/shops/honor", detail: "使用账号荣誉值购买并归属给当前角色" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="focus-ring subtle-card rounded-2xl px-4 py-3 transition hover:border-[var(--border-strong)] hover:bg-[rgba(255,252,246,0.98)]"
              >
                <p className="text-sm font-semibold text-[var(--color-ink-900)]">{item.label}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{item.detail}</p>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
