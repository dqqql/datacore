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
    error?: string;
  }>;
};

const honorMessages = {
  invalid: "荣誉值调整失败，请检查目标账号、变动值与原因后重试。",
  notFound: "目标账号不存在，请刷新页面后重试。",
  belowZero: "本次调整会使荣誉值变为负数，系统已阻止。",
  success: "荣誉值调整完成，审计日志已同步记录。",
} as const;

const characterMessages = {
  invalid: "角色恢复失败，请刷新页面后重试。",
  notFound: "目标角色不存在，或当前并非归档状态。",
  restored: "角色已恢复，并重新出现在玩家角色列表中。",
} as const;

const userMessages = {
  invalid: "账号创建失败，请检查账号名与初始密码后重试。",
  exists: "该账号名已存在，请更换后重试。",
} as const;

function formatRole(role: string) {
  return role === "ADMIN" ? "管理员" : "玩家";
}

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

  const honorSuccessMessage = query.honorSuccess === "honor-adjusted" ? honorMessages.success : null;
  const characterErrorMessage =
    query.characterError === "invalid-character-selection"
      ? characterMessages.invalid
      : query.characterError === "character-not-found"
        ? characterMessages.notFound
        : null;
  const characterSuccessMessage =
    query.characterSuccess === "character-restored" ? characterMessages.restored : null;
  const userErrorMessage =
    query.error === "invalid-user"
      ? userMessages.invalid
      : query.error === "user-exists"
        ? userMessages.exists
        : null;

  return (
    <AppShell
      title="账号与荣誉管理"
      description="这里集中管理真实账号数据、普通玩家账号创建与账号荣誉值调整。"
      badge="账号管理"
    >
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="panel rounded-[28px] p-6">
          <div className="mb-4">
            <h3 className="section-title text-2xl font-semibold">账号列表</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              列表已接入真实数据库数据，并展示归档角色，方便管理员执行恢复操作。
            </p>
          </div>

          {characterErrorMessage ? (
            <div className="status-message mb-4" data-tone="danger">
              {characterErrorMessage}
            </div>
          ) : null}

          {characterSuccessMessage ? (
            <div className="status-message mb-4" data-tone="success">
              {characterSuccessMessage}
            </div>
          ) : null}

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>账号名</th>
                  <th>权限</th>
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
                      <td>{formatRole(user.role)}</td>
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
                                  className="focus-ring btn-secondary btn-compact"
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
            当前版本中，账号名与显示名保持一致，新建账号默认角色为普通玩家。
          </p>

          {userErrorMessage ? (
            <div className="status-message mt-4" data-tone="danger">
              {userErrorMessage}
            </div>
          ) : null}

          <form action={createUserAction} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="field-label" htmlFor="admin-create-username">账号名</label>
              <input
                id="admin-create-username"
                name="username"
                type="text"
                required
                maxLength={40}
                className="focus-ring field-input"
                placeholder="例如：银烛会计"
              />
            </div>

            <div className="space-y-2">
              <label className="field-label" htmlFor="admin-create-password">初始密码</label>
              <input
                id="admin-create-password"
                name="password"
                type="password"
                required
                minLength={6}
                className="focus-ring field-input"
                placeholder="至少 6 位"
              />
            </div>

            <button
              type="submit"
              className="focus-ring btn-primary w-full"
            >
              创建普通账号
            </button>
          </form>

          <div className="mt-8 border-t border-[var(--border-soft)] pt-6">
            <h3 className="section-title text-2xl font-semibold">荣誉值调整</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              荣誉值绑定账号，仅允许管理员在此发放或扣减。每次调整都会记录审计日志。
            </p>

            {honorErrorMessage ? (
              <div className="status-message mt-4" data-tone="danger">
                {honorErrorMessage}
              </div>
            ) : null}

            {honorSuccessMessage ? (
              <div className="status-message mt-4" data-tone="success">
                {honorSuccessMessage}
              </div>
            ) : null}

            <form action={adjustUserHonorAction} className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="field-label" htmlFor="honor-user-id">目标账号</label>
                <select
                  id="honor-user-id"
                  name="userId"
                  required
                  className="focus-ring field-select"
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
                <label className="field-label" htmlFor="honor-delta">变动值</label>
                <input
                  id="honor-delta"
                  name="delta"
                  type="number"
                  required
                  className="focus-ring field-input"
                  placeholder="正数为发放，负数为扣减"
                />
              </div>

              <div className="space-y-2">
                <label className="field-label" htmlFor="honor-reason">调整原因</label>
                <textarea
                  id="honor-reason"
                  name="reason"
                  rows={3}
                  required
                  maxLength={120}
                  className="focus-ring field-textarea"
                  placeholder="例如：完成公会任务奖励 / 手工纠错"
                />
              </div>

              <button
                type="submit"
                className="focus-ring btn-primary w-full"
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
