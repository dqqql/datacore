import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import {
  archiveCharacterAction,
  createCharacterAction,
  selectCurrentCharacterAction,
} from "@/app/characters/actions";
import { requirePlayerCharacter } from "@/lib/auth-helpers";

type CharactersPageProps = {
  searchParams: Promise<{
    characterError?: string;
    characterSuccess?: string;
  }>;
};

const characterMessages = {
  invalid: "角色操作失败，请刷新页面后重试。",
  notFound: "目标角色不存在，或已不属于当前账号。",
  activeListings: "该角色仍有在售挂单，请先下架后再归档。",
  archived: "角色已归档。如需恢复，请由管理员在后台执行恢复。",
} as const;

export default async function CharactersPage({ searchParams }: CharactersPageProps) {
  const { characters, currentCharacter } = await requirePlayerCharacter();
  const query = await searchParams;

  const characterErrorMessage =
    query.characterError === "invalid-character-selection"
      ? characterMessages.invalid
      : query.characterError === "character-not-found"
        ? characterMessages.notFound
        : query.characterError === "character-has-active-listings"
          ? characterMessages.activeListings
          : null;

  const characterSuccessMessage =
    query.characterSuccess === "character-archived" ? characterMessages.archived : null;

  return (
    <AppShell
      title="角色卡册"
      description="这里展示当前账号下的全部活跃角色。你可以新增、切换或归档角色，补给处与集市流程将围绕当前角色运行。"
      badge="角色"
    >
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="panel rounded-[28px] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="section-title text-2xl font-semibold">当前账号角色</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                当前列表仅展示活跃角色。归档角色不会被删除，管理员可在后台恢复。
              </p>
            </div>
            <span className="rounded-full border border-[var(--border-soft)] bg-[rgba(127,92,47,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
              {characters.length} 个角色
            </span>
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
                  <th>角色名称</th>
                  <th>金币</th>
                  <th>声望</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {characters.map((character) => (
                  <tr key={character.id}>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-[var(--color-ink-900)]">{character.name}</span>
                        {currentCharacter?.id === character.id ? (
                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                            当前角色
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="numeric">{character.gold}</td>
                    <td className="numeric">{character.reputation}</td>
                    <td>{character.status === "ACTIVE" ? "活跃" : character.status}</td>
                    <td>
                      <div className="flex flex-nowrap gap-2 items-center">
                        <form action={selectCurrentCharacterAction}>
                          <input type="hidden" name="characterId" value={character.id} />
                          <button
                            type="submit"
                            className="focus-ring btn-secondary btn-compact"
                          >
                            设为当前
                          </button>
                        </form>
                        <Link
                          href={`/characters/${character.id}`}
                          className="focus-ring btn-secondary btn-compact text-[var(--color-ink-700)]"
                        >
                          查看详情
                        </Link>
                        <form action={archiveCharacterAction}>
                          <input type="hidden" name="characterId" value={character.id} />
                          <button
                            type="submit"
                            className="focus-ring btn-danger btn-compact"
                          >
                            归档
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel rounded-[28px] p-6">
          <h3 className="section-title text-2xl font-semibold">新增角色</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            新建角色后会自动切换为当前角色，便于立即进入金币、声望与行囊管理。
          </p>

          <form action={createCharacterAction} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-ink-700)]" htmlFor="new-character-name">
                角色名称
              </label>
              <input
                id="new-character-name"
                name="name"
                type="text"
                required
                maxLength={40}
                className="focus-ring field-input"
                placeholder="例如：边境佣兵"
              />
            </div>

            <button
              type="submit"
              className="focus-ring btn-primary w-full"
            >
              创建角色
            </button>
          </form>
        </article>
      </section>
    </AppShell>
  );
}
