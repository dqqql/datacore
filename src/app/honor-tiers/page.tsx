import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requirePlayerCharacter } from "@/lib/auth-helpers";
import { HONOR_TIERS, getTierByHonor, getNextTier } from "@/lib/honor-tiers";

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export const metadata = {
  title: "荣誉等级 · 西征数据中心",
  description: "查看各荣誉等级所对应的角色上限与权益说明，以及当前账号的升级进度。",
};

export default async function HonorTiersPage() {
  const { user } = await requirePlayerCharacter();
  const currentTier = getTierByHonor(user.honor);
  const nextTier = getNextTier(currentTier.level);

  return (
    <AppShell
      title="荣誉等级"
      badge="等级权益"
      description="荣誉值决定了你在西征公会中的等级，等级影响角色上限与可解锁的特权。累计达到门槛即可自动升级。"
    >
      {/* Progress bar */}
      <section className="panel rounded-[28px] p-6 shrink-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
              当前账号
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--color-ink-900)]">
              {user.displayName}
              <span className="ml-3 text-base font-normal text-[var(--muted)]">
                {currentTier.name} · 荣誉 {formatNumber(user.honor)}
              </span>
            </p>
          </div>

          <div className="text-right">
            {nextTier ? (
              <>
                <p className="text-xs text-[var(--muted)]">
                  距离{nextTier.name}还差
                </p>
                <p className="mt-1 text-2xl font-semibold text-[var(--accent-strong)]">
                  {formatNumber(nextTier.minHonor - user.honor)} 荣誉值
                </p>
              </>
            ) : (
              <p className="text-sm font-semibold text-[var(--accent-strong)]">
                已达最高等级
              </p>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        {nextTier ? (
          <div className="mt-5">
            <div className="flex justify-between text-xs text-[var(--muted)] mb-1.5">
              <span>{currentTier.name}（{formatNumber(currentTier.minHonor)}）</span>
              <span>{nextTier.name}（{formatNumber(nextTier.minHonor)}）</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[rgba(96,72,44,0.12)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    ((user.honor - currentTier.minHonor) /
                      (nextTier.minHonor - currentTier.minHonor)) *
                      100,
                  )}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-5 h-2 w-full rounded-full bg-[var(--accent)] opacity-60" />
        )}
      </section>

      {/* Tiers grid */}
      <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {HONOR_TIERS.map((tier) => {
          const isCurrentTier = tier.level === currentTier.level;
          const isUnlocked = user.honor >= tier.minHonor;
          const isLocked = !isUnlocked;

          return (
            <article
              key={tier.level}
              className={`relative rounded-[28px] border p-6 transition ${
                isCurrentTier
                  ? "border-[var(--accent)] bg-[rgba(127,92,47,0.07)] shadow-sm"
                  : isLocked
                    ? "border-[var(--border-soft)] bg-[rgba(255,250,241,0.55)] opacity-60"
                    : "border-[var(--border-soft)] bg-[rgba(255,250,241,0.88)]"
              }`}
            >
              {isCurrentTier ? (
                <span className="absolute right-5 top-5 rounded-full border border-[rgba(127,92,47,0.3)] bg-[rgba(127,92,47,0.12)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                  当前等级
                </span>
              ) : isLocked ? (
                <span className="absolute right-5 top-5 rounded-full border border-[var(--border-soft)] bg-[rgba(96,72,44,0.06)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                  未解锁
                </span>
              ) : (
                <span className="absolute right-5 top-5 rounded-full border border-[rgba(53,95,59,0.28)] bg-[rgba(53,95,59,0.08)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--success)]">
                  已解锁
                </span>
              )}

              {/* Tier header */}
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                  Tier {tier.level}
                </p>
                <h3 className="section-title mt-2 text-2xl font-semibold text-[var(--color-ink-900)]">
                  {tier.name}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[var(--border-soft)] bg-[rgba(255,250,241,0.95)] px-3 py-1 text-xs font-semibold text-[var(--color-ink-700)] whitespace-nowrap">
                    荣誉门槛 · {formatNumber(tier.minHonor)}
                  </span>
                  <span className="rounded-full border border-[var(--border-soft)] bg-[rgba(255,250,241,0.95)] px-3 py-1 text-xs font-semibold text-[var(--color-ink-700)] whitespace-nowrap">
                    角色上限 · Lv.{tier.maxCharacterLevel}
                  </span>
                </div>
              </div>

              {/* Privileges */}
              <ul className="space-y-2">
                {tier.privileges.map((priv, idx) => (
                  <li
                    key={idx}
                    className="flex gap-2.5 text-sm leading-6 text-[var(--color-ink-700)]"
                  >
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        isLocked
                          ? "bg-[var(--muted)] opacity-40"
                          : "bg-[var(--accent)]"
                      }`}
                    />
                    {priv}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      {/* Back link */}
      <div className="mt-6 shrink-0">
        <Link href="/dashboard" className="focus-ring btn-secondary">
          ← 返回总览
        </Link>
      </div>
    </AppShell>
  );
}
