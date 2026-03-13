import { AppShell } from "@/components/app-shell";
import { refreshPasswordPoolAction } from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

type AdminPasswordsPageProps = {
  searchParams: Promise<{
    otpError?: string;
    otpSuccess?: string;
  }>;
};

const otpMessages = {
  invalid: "密码池刷新失败，请重试。",
  success: "密码池已刷新，旧批次已整体失效，新批次即时生效。",
} as const;

export default async function AdminPasswordsPage({ searchParams }: AdminPasswordsPageProps) {
  await requireAdminSession();
  const query = await searchParams;

  const pools = await prisma.oneTimePasswordPool.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 3,
    include: {
      createdByUser: true,
      passwords: {
        orderBy: [{ createdAt: "asc" }],
      },
    },
  });

  const otpErrorMessage = query.otpError === "invalid-count" ? otpMessages.invalid : null;
  const otpSuccessMessage = query.otpSuccess === "pool-refreshed" ? otpMessages.success : null;

  const activePool = pools.find((p) => p.isActive);

  return (
    <AppShell
      title="一次性密码池"
      badge="密码池"
      description="这里负责维护公共商店条目修改所需的一次性密码。每次刷新固定生成 10 组，旧批次立即失效，新批次即时生效。"
    >
      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        {/* Left: refresh control */}
        <article className="panel rounded-[28px] p-6">
          <h3 className="section-title text-2xl font-semibold">刷新密码池</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            刷新时会先停用全部活跃批次，再创建新的可用批次，每次固定生成 10 组密码。
          </p>

          {otpErrorMessage ? (
            <div className="status-message mt-4" data-tone="danger">
              {otpErrorMessage}
            </div>
          ) : null}

          {otpSuccessMessage ? (
            <div className="status-message mt-4" data-tone="success">
              {otpSuccessMessage}
            </div>
          ) : null}

          <form action={refreshPasswordPoolAction} className="mt-5">
            <button
              type="submit"
              className="focus-ring btn-primary w-full"
            >
              刷新密码池（生成 10 组）
            </button>
          </form>

          {/* Stats for current active pool */}
          {activePool ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.84)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-700)]">
                  密码总数
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">
                  {activePool.passwords.length}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.84)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-700)]">
                  剩余可用
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--success)]">
                  {activePool.passwords.filter((p) => !p.isUsed).length}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.84)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-700)]">
                  已使用
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--danger)]">
                  {activePool.passwords.filter((p) => p.isUsed).length}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.84)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-700)]">
                  批次创建时间
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)] whitespace-nowrap">
                  {new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(activePool.createdAt)}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.84)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              当前无活跃批次，刷新后此处将展示统计信息。
            </div>
          )}
        </article>

        {/* Right: current active pool passwords */}
        <article className="panel rounded-[28px] p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="section-title text-2xl font-semibold">当前批次密码</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                绿色为可用密码，红色为已使用密码。每个密码仅可使用一次。
              </p>
            </div>
            {activePool ? (
              <span className="shrink-0 whitespace-nowrap rounded-full border border-[rgba(53,95,59,0.24)] bg-[rgba(53,95,59,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--success)]">
                生效中
              </span>
            ) : null}
          </div>

          {activePool && activePool.passwords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {activePool.passwords.map((password) => (
                <span
                  key={password.id}
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 font-mono text-xs font-semibold tracking-wide ${
                    password.isUsed
                      ? "border-[rgba(165,63,43,0.28)] bg-[rgba(165,63,43,0.07)] text-[var(--danger)] line-through opacity-70"
                      : "border-[rgba(53,95,59,0.28)] bg-[rgba(53,95,59,0.08)] text-[var(--success)]"
                  }`}
                >
                  {password.code}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-[20px] border border-dashed border-[var(--border-soft)]">
              <p className="text-sm text-[var(--muted)]">
                {pools.length === 0 ? "当前尚无密码池。刷新一次后，这里会显示全部密码。" : "无活跃批次。"}
              </p>
            </div>
          )}

          {/* Past pools (collapsed) */}
          {pools.filter((p) => !p.isActive).length > 0 ? (
            <div className="mt-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                历史批次（已失效）
              </p>
              <div className="space-y-3">
                {pools.filter((p) => !p.isActive).map((pool) => (
                  <div
                    key={pool.id}
                    className="rounded-[18px] border border-[var(--border-soft)] bg-[rgba(255,250,241,0.6)] px-4 py-3 opacity-60"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs text-[var(--muted)]">
                        {new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(pool.createdAt)}
                        {" · "}创建人：{pool.createdByUser.displayName}
                      </p>
                      <span className="shrink-0 whitespace-nowrap text-xs text-[var(--muted)]">
                        {pool.passwords.filter((p) => p.isUsed).length} / {pool.passwords.length} 已用
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </article>
      </section>
    </AppShell>
  );
}
