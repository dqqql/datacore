import { AppShell } from "@/components/app-shell";
import { createFirstCharacterAction } from "@/app/characters/actions";
import { getUserContext } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export default async function BootstrapCharacterPage() {
  const context = await getUserContext();

  if (context.characters.length > 0) {
    redirect("/dashboard");
  }

  return (
    <AppShell
      title="创建你的首个角色"
      description="当前账号还没有可用角色。由于金币、声望、背包和交易都绑定角色，首个核心动作就是先创建角色。"
      badge="Bootstrap"
    >
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="panel rounded-[28px] p-6">
          <h3 className="section-title text-3xl font-semibold text-[var(--color-ink-900)]">
            角色先行，系统其余功能随后开启
          </h3>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            这是你第一次进入系统，所以先建立一个角色作为当前角色。建好之后，金币、
            声望、背包、公共商店和市场交易的主链路都会自动围绕它展开。
          </p>

          <div className="mt-5 space-y-3">
            {[
              "首个角色创建后会自动成为当前选中角色。",
              "普通玩家没有角色时不能编辑交易类内容。",
              "角色后续可以新增，也可以归档，但不会被硬删除。",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.84)] px-4 py-3 text-sm leading-6 text-[var(--color-ink-700)]"
              >
                {item}
              </div>
            ))}
          </div>
        </article>

        <article className="panel rounded-[28px] p-6">
          <div className="mx-auto max-w-md">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                First Character
              </p>
              <h3 className="section-title mt-3 text-2xl font-semibold text-[var(--color-ink-900)]">
                输入角色名称
              </h3>
            </div>

            <form action={createFirstCharacterAction} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[var(--color-ink-700)]" htmlFor="name">
                  角色名称
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  maxLength={40}
                  className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                  placeholder="例如：银烛学徒"
                />
              </div>

              <button
                type="submit"
                className="focus-ring inline-flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(95,66,31,0.22)] hover:bg-[var(--accent-strong)]"
              >
                创建并进入控制台
              </button>
            </form>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
