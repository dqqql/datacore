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
  notFound: "目标角色不存在，或已不在当前账号下。",
  activeListings: "该角色还有在售挂单，请先下架后再归档。",
  archived: "角色已归档。若需要恢复，请让管理员在后台执行恢复。",
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
      title="角色管理"
      description="这里已经接入真实角色数据。你可以新增角色，也可以切换当前角色，后续商店和交易都将围绕当前角色进行。"
      badge="Characters"
    >
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="panel rounded-[28px] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="section-title text-2xl font-semibold">当前账号角色</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                当前列表只展示活跃角色。归档后角色不会被硬删除，管理员可在后台恢复。
              </p>
            </div>
            <span className="rounded-full border border-[var(--border-soft)] bg-[rgba(127,92,47,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
              {characters.length} 个角色
            </span>
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
                  <th>角色名</th>
                  <th>金币</th>
                  <th>声望</th>
                  <th>状态</th>
                  <th>动作</th>
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
                    <td>{character.status}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <form action={selectCurrentCharacterAction}>
                          <input type="hidden" name="characterId" value={character.id} />
                          <button
                            type="submit"
                            className="focus-ring rounded-full border border-[var(--border-strong)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)] hover:bg-[rgba(127,92,47,0.08)]"
                          >
                            设为当前
                          </button>
                        </form>
                        <Link
                          href={`/characters/${character.id}`}
                          className="focus-ring rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-ink-700)] hover:bg-[rgba(255,250,241,0.95)]"
                        >
                          查看详情
                        </Link>
                        <form action={archiveCharacterAction}>
                          <input type="hidden" name="characterId" value={character.id} />
                          <button
                            type="submit"
                            className="focus-ring rounded-full border border-[rgba(165,63,43,0.24)] px-3 py-1 text-xs font-semibold text-[var(--danger)] hover:bg-[rgba(165,63,43,0.08)]"
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
            新建角色后会自动切换为当前角色，方便你直接进入后续的金币、声望和背包管理。
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
                className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                placeholder="例如：边境佣兵"
              />
            </div>

            <button
              type="submit"
              className="focus-ring inline-flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(95,66,31,0.22)] hover:bg-[var(--accent-strong)]"
            >
              创建角色
            </button>
          </form>
        </article>
      </section>
    </AppShell>
  );
}
