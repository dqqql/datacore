import { AppShell } from "@/components/app-shell";
import { adjustUserHonorAction } from "@/app/admin/actions";
import { createUserAction, restoreCharacterAction } from "@/app/characters/actions";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth-helpers";

type AdminUsersPageProps = {
  searchParams: Promise<{
    honorError?: string;
    honorSuccess?: string;
    characterError?: string;
    characterSuccess?: string;
  }>;
};

const honorMessages = {
  invalid: "荣誉值调整失败，请检查目标账号、变动值和原因后重试。",
  notFound: "目标账号不存在，请刷新页面后重试。",
  belowZero: "本次调整会让荣誉值变成负数，系统已阻止。",
  success: "荣誉值调整完成，审计日志已同步记录。",
} as const;

const characterMessages = {
  invalid: "角色恢复失败，请刷新页面后重试。",
  notFound: "目标角色不存在，或已经不是归档状态。",
  restored: "角色已恢复，并会重新出现在玩家角色列表中。",
} as const;

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  await requireAdminSession();
  const query = await searchParams;

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: {
      characters: {
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, status: true },
      },
    },
  });

  const honorErrorMessage =
    query.honorError === "invalid-honor-adjustment"
      ? honorMessages.invalid
      : query.honorError === "user-not-found"
        ? honorMessages.notFound
        : query.honorError === "honor-below-zero"
          ? honorMessages.belowZero
          : null;

  const honorSuccessMessage =
    query.honorSuccess === "honor-adjusted" ? honorMessages.success : null;
  const characterErrorMessage =
    query.characterError === "invalid-character-selection"
      ? characterMessages.invalid
      : query.characterError === "character-not-found"
        ? characterMessages.notFound
        : null;
  const characterSuccessMessage =
    query.characterSuccess === "character-restored" ? characterMessages.restored : null;

  return (
    <AppShell
      title="账号与荣誉管理"
      description="管理员现在已经可以查看真实账号数据、创建普通用户，并直接发放或扣减账号荣誉值。"
      badge="Admin Users"
    >
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="panel rounded-[28px] p-6">
          <div className="mb-4">
            <h3 className="section-title text-2xl font-semibold">账号列表</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              当前列表已经读取真实数据库数据，也会展示归档角色，方便管理员执行恢复。
            </p>
          </div>

          {characterErrorMessage ? (
            <div className="mb-4 rounded-2xl border border-[rgba(165,63,43,0.24)] bg-[rgba(165,63,43,0.08)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
              {characterErrorMessage}
            </div>
          ) : null}

          {characterSuccessMessage ? (
            <div className="mb-4 rounded-2xl border border-[rgba(53,95,59,0.24)] bg-[rgba(53,95,59,0.08)] px-4 py-3 text-sm leading-6 text-[var(--success)]">
              {characterSuccessMessage}
            </div>
          ) : null}

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>账号名</th>
                  <th>角色权限</th>
                  <th>荣誉值</th>
                  <th>活跃角色数</th>
                  <th>归档角色</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const activeCharacters = user.characters.filter((character) => character.status === "ACTIVE");
                  const archivedCharacters = user.characters.filter((character) => character.status === "ARCHIVED");

                  return (
                    <tr key={user.id}>
                      <td>{user.displayName}</td>
                      <td>{user.role}</td>
                      <td className="numeric">{user.honor}</td>
                      <td className="numeric">{activeCharacters.length}</td>
                      <td>
                        {archivedCharacters.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {archivedCharacters.map((character) => (
                              <form key={character.id} action={restoreCharacterAction} className="flex flex-wrap gap-2">
                                <input type="hidden" name="characterId" value={character.id} />
                                <span className="rounded-full border border-[var(--border-soft)] bg-[rgba(255,250,241,0.95)] px-3 py-1 text-xs font-semibold text-[var(--color-ink-900)]">
                                  {character.name}
                                </span>
                                <button
                                  type="submit"
                                  className="focus-ring rounded-full border border-[var(--border-strong)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)] hover:bg-[rgba(127,92,47,0.08)]"
                                >
                                  恢复
                                </button>
                              </form>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-[var(--muted)]">无</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel rounded-[28px] p-6">
          <h3 className="section-title text-2xl font-semibold">创建普通账号</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            首版里账号名与显示名保持一致，创建出来的账号默认为普通玩家。
          </p>

          <form action={createUserAction} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-ink-700)]" htmlFor="admin-create-username">
                账号名
              </label>
              <input
                id="admin-create-username"
                name="username"
                type="text"
                required
                maxLength={40}
                className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                placeholder="例如：银烛会计"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-ink-700)]" htmlFor="admin-create-password">
                初始密码
              </label>
              <input
                id="admin-create-password"
                name="password"
                type="password"
                required
                minLength={6}
                className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                placeholder="至少 6 位"
              />
            </div>

            <button
              type="submit"
              className="focus-ring inline-flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(95,66,31,0.22)] hover:bg-[var(--accent-strong)]"
            >
              创建普通账号
            </button>
          </form>

          <div className="mt-8 border-t border-[var(--border-soft)] pt-6">
            <h3 className="section-title text-2xl font-semibold">荣誉值调整</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              荣誉值绑定账号，只允许管理员在这里发放或扣减。每次调整都会写入审计日志。
            </p>

            {honorErrorMessage ? (
              <div className="mt-4 rounded-2xl border border-[rgba(165,63,43,0.24)] bg-[rgba(165,63,43,0.08)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
                {honorErrorMessage}
              </div>
            ) : null}

            {honorSuccessMessage ? (
              <div className="mt-4 rounded-2xl border border-[rgba(53,95,59,0.24)] bg-[rgba(53,95,59,0.08)] px-4 py-3 text-sm leading-6 text-[var(--success)]">
                {honorSuccessMessage}
              </div>
            ) : null}

            <form action={adjustUserHonorAction} className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[var(--color-ink-700)]" htmlFor="honor-user-id">
                  目标账号
                </label>
                <select
                  id="honor-user-id"
                  name="userId"
                  required
                  className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                  defaultValue=""
                >
                  <option value="" disabled>
                    请选择账号
                  </option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName}（当前荣誉值：{user.honor}）
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[var(--color-ink-700)]" htmlFor="honor-delta">
                  变动值
                </label>
                <input
                  id="honor-delta"
                  name="delta"
                  type="number"
                  required
                  className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                  placeholder="正数为发放，负数为扣减"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[var(--color-ink-700)]" htmlFor="honor-reason">
                  调整原因
                </label>
                <textarea
                  id="honor-reason"
                  name="reason"
                  rows={3}
                  required
                  maxLength={120}
                  className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm leading-6 text-[var(--color-ink-900)]"
                  placeholder="例如：完成公会任务奖励 / 手工纠错"
                />
              </div>

              <button
                type="submit"
                className="focus-ring inline-flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(95,66,31,0.22)] hover:bg-[var(--accent-strong)]"
              >
                提交荣誉值调整
              </button>
            </form>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
