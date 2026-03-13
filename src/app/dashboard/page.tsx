import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SummaryCard } from "@/components/summary-card";
import { requirePlayerCharacter } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatDateLabel(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  }).format(value);
}

function formatRole(role: "ADMIN" | "PLAYER") {
  return role === "ADMIN" ? "管理员" : "玩家";
}

export default async function DashboardPage() {
  const context = await requirePlayerCharacter();
  const { session, user, characters, currentCharacter } = context;
  const isAdmin = session.user.role === "ADMIN";

  const [registeredPlayers, activeCharacterCount, archivedCharacterCount, recentPlayers, recentCharacters] =
    await Promise.all([
      prisma.user.count({
        where: {
          role: "PLAYER",
          isActive: true,
        },
      }),
      prisma.character.count({
        where: {
          status: "ACTIVE",
        },
      }),
      prisma.character.count({
        where: {
          status: "ARCHIVED",
        },
      }),
      isAdmin
        ? prisma.user.findMany({
            where: {
              role: "PLAYER",
              isActive: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 5,
            include: {
              characters: {
                where: {
                  status: "ACTIVE",
                },
                select: {
                  id: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      isAdmin
        ? prisma.character.findMany({
            where: {
              status: "ACTIVE",
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 5,
            include: {
              user: {
                select: {
                  displayName: true,
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

  const overviewCards = isAdmin
    ? [
        {
          title: "登记玩家数",
          value: formatNumber(registeredPlayers),
          detail: "仅统计当前仍启用的普通玩家账号。",
        },
        {
          title: "活跃角色数",
          value: formatNumber(activeCharacterCount),
          detail: "角色卡册、补给处与集市主流程都基于活跃角色。",
        },
        {
          title: "归档角色数",
          value: formatNumber(archivedCharacterCount),
          detail: "归档角色仍保留数据，可由管理员恢复。",
        },
        {
          title: "当前账号荣誉",
          value: formatNumber(user.honor),
          detail: "管理员账号荣誉仍按账号维度记录。",
        },
      ]
    : [
        {
          title: "账号荣誉值",
          value: formatNumber(user.honor),
          detail: "荣誉值绑定账号，仅允许管理员发放或扣减。",
        },
        {
          title: "当前角色",
          value: currentCharacter?.name ?? "未选择角色",
          detail: "当前角色将影响补给、行囊与集市交易。",
        },
        {
          title: "我的角色数",
          value: formatNumber(characters.length),
          detail: "当前仅统计活跃角色，归档角色不会出现在这里。",
        },
        {
          title: "登记玩家数",
          value: formatNumber(registeredPlayers),
          detail: "方便快速感知当前西征账簿的活跃规模。",
        },
      ];

  const playerPreviewItems = isAdmin
    ? recentPlayers.map((player) => ({
        id: player.id,
        title: player.displayName,
        eyebrow: formatRole(player.role),
        primary: `荣誉 ${formatNumber(player.honor)}`,
        secondary: `${player.characters.length} 个活跃角色`,
        meta: `登记于 ${formatDateLabel(player.createdAt)}`,
      }))
    : [
        {
          id: user.id,
          title: user.displayName,
          eyebrow: formatRole(user.role),
          primary: `荣誉 ${formatNumber(user.honor)}`,
          secondary: `${characters.length} 个活跃角色`,
          meta: currentCharacter
            ? `当前角色：${currentCharacter.name}`
            : "当前尚未选定角色",
        },
      ];

  const characterPreviewItems = isAdmin
    ? recentCharacters.map((character) => ({
        id: character.id,
        title: character.name,
        eyebrow: `归属 ${character.user.displayName}`,
        primary: `金币 ${formatNumber(character.gold)}`,
        secondary: `声望 ${formatNumber(character.reputation)}`,
        meta: `建立于 ${formatDateLabel(character.createdAt)}`,
      }))
    : [...characters]
        .sort((left, right) => {
          if (left.id === currentCharacter?.id) {
            return -1;
          }

          if (right.id === currentCharacter?.id) {
            return 1;
          }

          return left.createdAt.getTime() - right.createdAt.getTime();
        })
        .slice(0, 5)
        .map((character) => ({
          id: character.id,
          title: character.name,
          eyebrow: character.id === currentCharacter?.id ? "当前角色" : "角色预览",
          primary: `金币 ${formatNumber(character.gold)}`,
          secondary: `声望 ${formatNumber(character.reputation)}`,
          meta: `建立于 ${formatDateLabel(character.createdAt)}`,
        }));

  const quickLinks = isAdmin
    ? [
        { label: "账号与荣誉", href: "/admin/users", detail: "查看玩家列表、荣誉值与归档角色恢复入口" },
        { label: "商店管理", href: "/admin/shops", detail: "维护补给条目、价格与启用状态" },
        { label: "密码池", href: "/admin/passwords", detail: "刷新一次性密码池并核对当前生效状态" },
        { label: "审计日志", href: "/admin/audit", detail: "快速回看关键数值调整和商店变更记录" },
      ]
    : [
        { label: "角色卡册", href: "/characters", detail: "切换当前角色、新增角色或归档已有角色" },
        { label: "冒险者集市", href: "/market", detail: "查看寄售、撤销自己的物品或直接入手" },
        { label: "公会补给处", href: "/shops/guild", detail: "使用当前角色金币采购公共补给" },
        { label: "荣誉商店", href: "/shops/honor", detail: "使用账号荣誉值为当前角色购入物品" },
      ];

  return (
    <AppShell
      title={`总览 · ${user.displayName}`}
      description={
        isAdmin
          ? "这里展示当前公会的整体运行情况，包括注册玩家规模、目前活跃角色数量与最近加入的冒险者动态，以便快速掌握全局账簿状况。"
          : "欢迎回到西征账簿。这里展示你的荣誉、角色状态与常用入口，方便出发前先确认当前指标。"
      }
      badge={isAdmin ? "管理员总览" : "冒险总览"}
    >
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <SummaryCard key={card.title} title={card.title} value={card.value} detail={card.detail} />
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <article className="panel rounded-[28px] p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="section-title text-2xl font-semibold">玩家预览</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {isAdmin
                  ? "展示最近登记的玩家账号，便于快速核对荣誉值与活跃角色规模。"
                  : "展示当前冒险者账号的荣誉与角色概况，入入冒险者集市前可先在此确认当前状态。"}
              </p>
            </div>
            {isAdmin ? (
              <Link href="/admin/users" className="focus-ring btn-secondary shrink-0">
                查看全部账号
              </Link>
            ) : null}
          </div>

          <div className="grid gap-3">
            {playerPreviewItems.map((item) => (
              <div
                key={item.id}
                className="subtle-card rounded-[24px] px-4 py-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                      {item.eyebrow}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[var(--color-ink-900)]">{item.title}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{item.meta}</p>
                  </div>

                  <div className="grid gap-2 sm:text-right">
                    <p className="text-sm font-semibold text-[var(--color-ink-900)]">{item.primary}</p>
                    <p className="text-sm text-[var(--muted)]">{item.secondary}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel rounded-[28px] p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="section-title text-2xl font-semibold">角色预览</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {isAdmin
                  ? "展示最近进入账簿的活跃角色，帮助管理员快速感知当前角色面状态。"
                  : "当前账号下的角色会优先把已选中角色置顶，方便先看关键数值。"}
              </p>
            </div>
            <Link href="/characters" className="focus-ring btn-secondary shrink-0">
              打开角色卡册
            </Link>
          </div>

          <div className="grid gap-3">
            {characterPreviewItems.map((item) => (
              <div
                key={item.id}
                className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,250,241,0.86)] px-4 py-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                      {item.eyebrow}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[var(--color-ink-900)]">{item.title}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{item.meta}</p>
                  </div>

                  <div className="grid gap-2 sm:text-right">
                    <p className="text-sm font-semibold text-[var(--color-ink-900)]">{item.primary}</p>
                    <p className="text-sm text-[var(--muted)]">{item.secondary}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 panel rounded-[28px] p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="section-title text-2xl font-semibold">常用功能入口</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {isAdmin
                ? "快速跳转至管理功能。具体的账号、荣誉与商店管理请进入各层级页面操作。"
                : "展开当天的冒险之旅。小队装备、交流货物或进入公会补给处采购，是你最常用的几个功能入口。"}
            </p>
          </div>
          <span className="rounded-full border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
            {quickLinks.length} 个常用入口
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring subtle-card rounded-2xl px-4 py-4 transition hover:border-[var(--border-strong)] hover:bg-[rgba(255,252,246,0.98)]"
            >
              <p className="text-sm font-semibold text-[var(--color-ink-900)]">{item.label}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{item.detail}</p>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
