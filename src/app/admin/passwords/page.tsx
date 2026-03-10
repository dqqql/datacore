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
  invalid: "密码池刷新失败，请检查生成数量后重试。",
  success: "密码池已刷新，旧批次已经整体失效。",
} as const;

export default async function AdminPasswordsPage({ searchParams }: AdminPasswordsPageProps) {
  await requireAdminSession();
  const query = await searchParams;

  const pools = await prisma.oneTimePasswordPool.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      createdByUser: true,
      passwords: {
        orderBy: [{ createdAt: "desc" }],
      },
    },
  });

  const otpErrorMessage =
    query.otpError === "invalid-count" ? otpMessages.invalid : null;
  const otpSuccessMessage =
    query.otpSuccess === "pool-refreshed" ? otpMessages.success : null;

  return (
    <AppShell
      title="一次性密码池"
      badge="OTP Pool"
      description="这里负责刷新公共商店条目修改用的一次性密码池。刷新后旧批次整体失效，新密码批次立刻生效。"
    >
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="panel rounded-[28px] p-6">
          <h3 className="section-title text-2xl font-semibold">刷新密码池</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            首版支持一次生成一整批密码。刷新动作会先停用当前全部活跃批次，再创建新的活跃批次。
          </p>

          {otpErrorMessage ? (
            <div className="mt-4 rounded-2xl border border-[rgba(165,63,43,0.24)] bg-[rgba(165,63,43,0.08)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
              {otpErrorMessage}
            </div>
          ) : null}

          {otpSuccessMessage ? (
            <div className="mt-4 rounded-2xl border border-[rgba(53,95,59,0.24)] bg-[rgba(53,95,59,0.08)] px-4 py-3 text-sm leading-6 text-[var(--success)]">
              {otpSuccessMessage}
            </div>
          ) : null}

          <form action={refreshPasswordPoolAction} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-ink-700)]" htmlFor="otp-count">
                生成数量
              </label>
              <input
                id="otp-count"
                name="count"
                type="number"
                min={1}
                max={1000}
                defaultValue={100}
                required
                className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
              />
            </div>

            <button
              type="submit"
              className="focus-ring inline-flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(95,66,31,0.22)] hover:bg-[var(--accent-strong)]"
            >
              刷新密码池
            </button>
          </form>
        </article>

        <article className="panel rounded-[28px] p-6">
          <div className="mb-4">
            <h3 className="section-title text-2xl font-semibold">密码池批次</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              当前优先展示批次状态、密码数量和最近几条密码，方便管理员快速确认新批次已生效。
            </p>
          </div>

          <div className="space-y-4">
            {pools.length > 0 ? (
              pools.map((pool) => {
                const usedCount = pool.passwords.filter((password) => password.isUsed).length;
                const previewCodes = pool.passwords.slice(0, 5).map((password) => password.code);

                return (
                  <div
                    key={pool.id}
                    className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,250,241,0.88)] p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-ink-900)]">
                          批次：{pool.id}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                          创建人：{pool.createdByUser.displayName}
                        </p>
                      </div>
                      <span className="rounded-full border border-[var(--border-soft)] bg-[rgba(127,92,47,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                        {pool.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.84)] px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-700)]">
                          密码总数
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">
                          {pool.passwords.length}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.84)] px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-700)]">
                          已使用
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">
                          {usedCount}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.84)] px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-700)]">
                          创建时间
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">
                          {new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(pool.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-700)]">
                        最近密码预览
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {previewCodes.map((code) => (
                          <span
                            key={code}
                            className="rounded-full border border-[var(--border-soft)] bg-[rgba(255,250,241,0.95)] px-3 py-1 text-xs font-semibold text-[var(--color-ink-900)]"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.84)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                当前还没有密码池，刷新一次后这里会显示真实批次。
              </div>
            )}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
