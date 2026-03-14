import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SummaryCard } from "@/components/summary-card";
import { PaginatedPanel, type PanelItem } from "@/components/paginated-panel";
import { requirePlayerCharacter } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getTierByHonor } from "@/lib/honor-tiers";

export const dynamic = "force-dynamic";

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatDateLabel(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatRole(role: "ADMIN" | "PLAYER") {
  return role === "ADMIN" ? "管理员" : "玩家";
}

function formatAuditAction(action: string) {
  const labels: Record<string, string> = {
    CHARACTER_GOLD_UPDATED: "金币调整",
    CHARACTER_REPUTATION_UPDATED: "声望调整",
    USER_HONOR_UPDATED: "荣誉调整",
    PRIVATE_ITEM_CREATED: "存放战利品",
    PRIVATE_ITEM_DELETED: "删除私设物品",
    MARKET_LISTED: "集市寄售",
    MARKET_CANCELLED: "撤销寄售",
    MARKET_PURCHASED: "集市成交",
    SHOP_PURCHASED: "补给购入",
    SHOP_SELLBACK: "半价典当",
    SHOP_ITEM_UPDATED: "商品调整",
    SHOP_PASSWORD_POOL_REFRESHED: "密码池刷新",
    CHARACTER_ARCHIVED: "角色归档",
    CHARACTER_RESTORED: "角色恢复",
    USER_DELETED: "账号删除",
    PLANTING_SEED_PLANTED: "温室播种",
    PLANTING_SEED_HARVESTED: "温室收获",
    PLANTING_PLOT_EXPANDED: "温室扩容",
  };
  return labels[action] ?? action;
}

export default async function DashboardPage() {
  const context = await requirePlayerCharacter();
  const { session, user, characters, currentCharacter } = context;
  const isAdmin = session.user.role === "ADMIN";

  const [
    registeredPlayers,
    activeCharacterCount,
    archivedCharacterCount,
    recentPlayers,
    recentCharacters,
    recentMarketSales,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "PLAYER", isActive: true } }),
    prisma.character.count({ where: { status: "ACTIVE" } }),
    prisma.character.count({ where: { status: "ARCHIVED" } }),
    isAdmin
      ? prisma.user.findMany({
          where: { role: "PLAYER", isActive: true },
          orderBy: { createdAt: "desc" },
          take: 9,
          include: {
            characters: { where: { status: "ACTIVE" }, select: { id: true } },
          },
        })
      : Promise.resolve([]),
    isAdmin
      ? prisma.character.findMany({
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 9,
          include: { user: { select: { displayName: true } } },
        })
      : prisma.character.findMany({
          where: { userId: user.id, status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 9,
        }),
    prisma.marketListing.findMany({
      where: isAdmin ? { status: "SOLD" } : {
        status: "SOLD",
        sellerCharacter: { userId: user.id },
      },
      orderBy: { soldAt: "desc" },
      take: 9,
      include: {
        inventoryItem: { select: { name: true, quantity: true } },
        sellerCharacter: { select: { name: true } },
        buyerCharacter: { select: { name: true } },
      },
    }),
    prisma.auditLog.findMany({
      where: isAdmin ? {} : {
        OR: [
          { actorUserId: user.id },
          { targetUserId: user.id },
          { targetCharacter: { userId: user.id } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 9,
      include: {
        actorUser: { select: { displayName: true } },
        targetUser: { select: { displayName: true } },
        targetCharacter: { select: { name: true } },
      },
    }),
  ]);

  const currentTier = getTierByHonor(user.honor);

  const overviewCards = isAdmin
    ? [
        { title: "注册玩家数", value: formatNumber(registeredPlayers), detail: "当前启用的活跃玩家账号" },
        { title: "活跃角色数", value: formatNumber(activeCharacterCount), detail: "正在运行于主流程的角色" },
        { title: "归档角色数", value: formatNumber(archivedCharacterCount), detail: "保留数据，管理员可恢复" },
        { title: "管理员荣誉", value: `${formatNumber(user.honor)}（${currentTier.name}）`, detail: "点击左侧导航查看荣誉等级" },
      ]
    : [
        { title: "账号荣誉值", value: `${formatNumber(user.honor)}（${currentTier.name}）`, detail: "左侧导航可查荣誉等级详情" },
        { title: "当前角色", value: currentCharacter?.name ?? "未选择", detail: "影响补给与集市交易" },
        { title: "我的角色数", value: formatNumber(characters.length), detail: "活跃角色，不含已归档" },
        { title: "登记玩家数", value: formatNumber(registeredPlayers), detail: "当前西征账簿活跃规模" },
      ];

  // ── Player panel items ──
  const playerItems: PanelItem[] = isAdmin
    ? recentPlayers.map((p) => ({
        id: p.id,
        eyebrow: formatRole(p.role),
        title: p.displayName,
        primary: `荣誉 ${formatNumber(p.honor)}`,
        secondary: `${p.characters.length} 个活跃角色`,
        meta: `登记于 ${formatDateLabel(p.createdAt)}`,
      }))
    : [
        {
          id: user.id,
          eyebrow: formatRole(user.role),
          title: user.displayName,
          primary: `荣誉 ${formatNumber(user.honor)}`,
          secondary: `${characters.length} 个活跃角色`,
          meta: currentCharacter ? `当前角色：${currentCharacter.name}` : "尚未选定角色",
        },
      ];

  // ── Character panel items ──
  const characterItems: PanelItem[] = (
    isAdmin
      ? recentCharacters
      : [...characters].sort((a, b) => {
          if (a.id === currentCharacter?.id) return -1;
          if (b.id === currentCharacter?.id) return 1;
          return a.createdAt.getTime() - b.createdAt.getTime();
        })
  ).map((c) => {
    const ownerName = "user" in c ? (c as { user: { displayName: string } }).user.displayName : undefined;
    return {
      id: c.id,
      eyebrow: isAdmin && ownerName ? `归属 ${ownerName}` : (c.id === currentCharacter?.id ? "当前角色" : "角色"),
      title: c.name,
      primary: `金币 ${formatNumber(c.gold)}`,
      secondary: `声望 ${formatNumber(c.reputation)}`,
      meta: `建立于 ${formatDateLabel(c.createdAt)}`,
    };
  });

  // ── Market transactions panel items ──
  const marketItems: PanelItem[] = recentMarketSales.map((listing) => ({
    id: listing.id,
    eyebrow: "集市成交",
    title: listing.inventoryItem.name,
    subtitle: `${listing.sellerCharacter.name} → ${listing.buyerCharacter?.name ?? "—"}`,
    primary: `${formatNumber(listing.price)} 金币`,
    secondary: `数量 ${formatNumber(listing.inventoryItem.quantity)}`,
    meta: listing.soldAt ? `成交于 ${formatDateLabel(listing.soldAt)}` : undefined,
    tone: "success" as const,
  }));

  // ── Audit log panel items ──
  const auditItems: PanelItem[] = recentAuditLogs.map((log) => ({
    id: log.id,
    title: formatAuditAction(log.action),
    meta: `${formatDateLabel(log.createdAt)}${log.actorUser ? ` · ${log.actorUser.displayName}` : ""}`,
  }));

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
      {/* ── Stats row ── */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 shrink-0">
        {overviewCards.map((card) => (
          <SummaryCard key={card.title} title={card.title} value={card.value} detail={card.detail} />
        ))}
      </section>

      {/* ── Kanban panels ── */}
      <section className="mt-5 grid gap-5 xl:grid-cols-4 flex-1 min-h-0" style={{ height: "clamp(340px, calc(100vh - 420px), 560px)" }}>
        {/* Player preview */}
        <PaginatedPanel
          title="冒险者档案"
          description={isAdmin ? "最近登记的玩家账号" : "当前账号基础状态"}
          items={playerItems}
          emptyText="暂无玩家数据"
          headerAction={
            isAdmin ? (
              <Link href="/admin/users" className="focus-ring btn-secondary btn-compact">
                全部账号
              </Link>
            ) : null
          }
        />

        {/* Character preview */}
        <PaginatedPanel
          title="角色状态"
          description={isAdmin ? "最近进入账簿的活跃角色" : "当前角色金币与声望一览"}
          items={characterItems}
          emptyText="暂无角色数据"
          headerAction={
            <Link href="/characters" className="focus-ring btn-secondary btn-compact">
              角色卡册
            </Link>
          }
        />

        {/* Market transactions */}
        <PaginatedPanel
          title="集市成交记录"
          description={isAdmin ? "全服最近成交的寄售单" : "当前角色参与的集市成交"}
          items={marketItems}
          emptyText="暂无成交记录"
          headerAction={
            <Link href="/market" className="focus-ring btn-secondary btn-compact">
              冒险者集市
            </Link>
          }
        />

        {/* Audit logs */}
        <PaginatedPanel
          title="最近审计日志"
          description={isAdmin ? "全服最新操作记录" : "与当前账号相关的操作记录"}
          items={auditItems}
          emptyText="暂无审计记录"
          headerAction={
            isAdmin ? (
              <Link href="/admin/audit" className="focus-ring btn-secondary btn-compact">
                完整日志
              </Link>
            ) : null
          }
        />
      </section>

      {/* ── Quick links ── */}
      <section className="mt-5 panel rounded-[28px] p-5 shrink-0">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h3 className="section-title text-lg font-semibold text-[var(--color-ink-900)]">常用功能入口</h3>
            <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">
              {isAdmin
                ? "快速跳转至管理功能。具体的账号、荣誉与商店管理请进入各层级页面操作。"
                : "展开当天的冒险之旅。小队装备、交流货物或进入公会补给处采购，是你最常用的几个功能入口。"}
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(isAdmin
            ? [
                { label: "账号与荣誉", href: "/admin/users", detail: "玩家列表、荣誉值与角色恢复" },
                { label: "商店管理", href: "/admin/shops", detail: "维护补给条目、价格与启用状态" },
                { label: "密码池", href: "/admin/passwords", detail: "刷新一次性密码池并核对状态" },
                { label: "审计日志", href: "/admin/audit", detail: "回看关键数值与商店变更记录" },
              ]
            : [
                { label: "角色卡册", href: "/characters", detail: "切换角色、新增或归档已有角色" },
                { label: "冒险者集市", href: "/market", detail: "查看寄售、撤销物品或直接入手" },
                { label: "公会补给处", href: "/shops/guild", detail: "使用金币采购公共补给" },
                { label: "荣誉商店", href: "/shops/honor", detail: "使用荣誉值为当前角色购入物品" },
              ]
          ).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring subtle-card rounded-2xl px-4 py-3 transition hover:border-[var(--border-strong)] hover:bg-[rgba(255,252,246,0.98)]"
            >
              <p className="text-sm font-semibold text-[var(--color-ink-900)]">{item.label}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.detail}</p>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
