import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { requirePlayerCharacter } from "@/lib/auth-helpers";
import {
  createPrivateItemAction,
  updateCharacterEconomyAction,
} from "@/app/characters/actions";
import {
  cancelMarketListingAction,
  createMarketListingAction,
} from "@/app/market/actions";
import { sellbackInventoryItemAction } from "@/app/shops/actions";

type CharacterDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    inventoryError?: string;
    inventorySuccess?: string;
    sellbackError?: string;
    sellbackSuccess?: string;
    listingError?: string;
    listingSuccess?: string;
  }>;
};

const inventoryMessages = {
  invalid: "私人物品录入失败，请检查名称、数量和单价后重试。",
  created: "私人物品已写入当前角色背包。",
} as const;

const sellbackMessages = {
  invalid: "回收失败，请检查物品和数量后重试。",
  unavailable: "该物品当前不能卖回系统商店。",
  tooMany: "回收数量不能超过背包中的现有数量。",
  completed: "回收成功，返还金额已写回对应货币。",
} as const;

const listingMessages = {
  invalid: "上架或下架失败，请刷新后重试。",
  unavailable: "该私人物品当前无法上架到市场。",
  cancelUnavailable: "该挂单当前无法下架。",
  created: "私人物品已上架到玩家交易市场。",
  cancelled: "挂单已下架，物品重新回到角色背包可操作状态。",
} as const;

function formatOwnershipType(type: "PUBLIC" | "PRIVATE") {
  return type === "PRIVATE" ? "私人物品" : "公共物品";
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export default async function CharacterDetailPage({ params, searchParams }: CharacterDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { user } = await requirePlayerCharacter();

  const character = await prisma.character.findFirst({
    where: {
      id,
      userId: user.id,
      status: "ACTIVE",
    },
    include: {
      inventoryItems: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          sourceShopItem: true,
          marketListing: true,
        },
      },
      auditLogs: {
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
      },
    },
  });

  if (!character) {
    notFound();
  }

  const inventoryErrorMessage =
    query.inventoryError === "invalid-private-item" ? inventoryMessages.invalid : null;
  const inventorySuccessMessage =
    query.inventorySuccess === "private-item-created" ? inventoryMessages.created : null;
  const sellbackErrorMessage =
    query.sellbackError === "invalid-sellback"
      ? sellbackMessages.invalid
      : query.sellbackError === "sellback-unavailable"
        ? sellbackMessages.unavailable
        : query.sellbackError === "sellback-too-many"
          ? sellbackMessages.tooMany
          : null;
  const sellbackSuccessMessage =
    query.sellbackSuccess === "sellback-completed" ? sellbackMessages.completed : null;
  const listingErrorMessage =
    query.listingError === "invalid-listing"
      ? listingMessages.invalid
      : query.listingError === "listing-unavailable"
        ? listingMessages.unavailable
        : query.listingError === "cancel-unavailable"
          ? listingMessages.cancelUnavailable
          : null;
  const listingSuccessMessage =
    query.listingSuccess === "listing-created"
      ? listingMessages.created
      : query.listingSuccess === "listing-cancelled"
        ? listingMessages.cancelled
        : null;
  const publicInventoryItems = character.inventoryItems.filter((item) => item.ownershipType === "PUBLIC");

  return (
    <AppShell
      title={`角色详情：${character.name}`}
      description="这里集中处理当前角色的金币、声望、背包、私人物品交易和公共物品回收。"
      badge="Character Detail"
    >
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="panel rounded-[28px] p-6">
          <h3 className="section-title text-2xl font-semibold">经济数值</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            金币和声望允许玩家自行填写，但每次修改都会进入后台审计日志。
          </p>

          <form action={updateCharacterEconomyAction} className="mt-5 space-y-4">
            <input type="hidden" name="characterId" value={character.id} />

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-ink-700)]" htmlFor="gold">
                金币
              </label>
              <input
                id="gold"
                name="gold"
                type="number"
                min={0}
                defaultValue={character.gold}
                className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-ink-700)]" htmlFor="reputation">
                声望
              </label>
              <input
                id="reputation"
                name="reputation"
                type="number"
                min={0}
                defaultValue={character.reputation}
                className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
              />
            </div>

            <button
              type="submit"
              className="focus-ring inline-flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(95,66,31,0.22)] hover:bg-[var(--accent-strong)]"
            >
              保存角色数值
            </button>
          </form>
        </article>

        <div className="space-y-6">
          <article className="panel rounded-[28px] p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="section-title text-2xl font-semibold">背包概览</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  背包现在读取的是数据库真实数据。当前先支持私人物品录入，方便从角色页直接管理背包内容。
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                  背包条目数
                </p>
                <p className="mt-1 text-lg font-semibold text-[var(--color-ink-900)]">
                  {character.inventoryItems.length}
                </p>
              </div>
            </div>

            {inventoryErrorMessage ? (
              <div className="mt-5 rounded-2xl border border-[rgba(165,63,43,0.24)] bg-[rgba(165,63,43,0.08)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
                {inventoryErrorMessage}
              </div>
            ) : null}

            {inventorySuccessMessage ? (
              <div className="mt-5 rounded-2xl border border-[rgba(53,95,59,0.24)] bg-[rgba(53,95,59,0.08)] px-4 py-3 text-sm leading-6 text-[var(--success)]">
                {inventorySuccessMessage}
              </div>
            ) : null}

            {listingErrorMessage ? (
              <div className="mt-5 rounded-2xl border border-[rgba(165,63,43,0.24)] bg-[rgba(165,63,43,0.08)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
                {listingErrorMessage}
              </div>
            ) : null}

            {listingSuccessMessage ? (
              <div className="mt-5 rounded-2xl border border-[rgba(53,95,59,0.24)] bg-[rgba(53,95,59,0.08)] px-4 py-3 text-sm leading-6 text-[var(--success)]">
                {listingSuccessMessage}
              </div>
            ) : null}

            <div className="mt-5 table-shell">
              <table>
                <thead>
                  <tr>
                    <th>物品</th>
                    <th>类型</th>
                    <th>数量</th>
                    <th>单价</th>
                    <th>状态</th>
                    <th>交易</th>
                  </tr>
                </thead>
                <tbody>
                  {character.inventoryItems.length > 0 ? (
                    character.inventoryItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-[var(--color-ink-900)]">{item.name}</span>
                            {item.description ? (
                              <span className="text-sm leading-6 text-[var(--muted)]">{item.description}</span>
                            ) : null}
                          </div>
                        </td>
                        <td>{formatOwnershipType(item.ownershipType)}</td>
                        <td className="numeric">{formatPrice(item.quantity)}</td>
                        <td className="numeric">
                          {formatPrice(item.sourceShopItem?.price ?? item.unitPrice)}
                        </td>
                        <td>{item.isListed ? "已上架" : "背包中"}</td>
                        <td>
                          {item.ownershipType === "PRIVATE" ? (
                            item.isListed && item.marketListing ? (
                              <form
                                action={cancelMarketListingAction}
                                className="flex flex-col gap-2 sm:flex-row sm:items-center"
                              >
                                <input type="hidden" name="characterId" value={character.id} />
                                <input type="hidden" name="listingId" value={item.marketListing.id} />
                                <button
                                  type="submit"
                                  className="focus-ring inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] px-3 py-2 text-xs font-semibold text-[var(--accent-strong)] hover:bg-[rgba(127,92,47,0.08)]"
                                >
                                  下架挂单
                                </button>
                              </form>
                            ) : (
                              <form
                                action={createMarketListingAction}
                                className="flex flex-col gap-2 sm:flex-row sm:items-center"
                              >
                                <input type="hidden" name="characterId" value={character.id} />
                                <input type="hidden" name="inventoryItemId" value={item.id} />
                                <button
                                  type="submit"
                                  className="focus-ring inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] px-3 py-2 text-xs font-semibold text-[var(--accent-strong)] hover:bg-[rgba(127,92,47,0.08)]"
                                >
                                  上架市场
                                </button>
                              </form>
                            )
                          ) : (
                            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-700)]">
                              不可交易
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-sm leading-6 text-[var(--muted)]">
                        当前角色还没有背包物品。你可以先在下面录入私人物品，后续公共商店购买结果也会落到这里。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel rounded-[28px] p-6">
            <h3 className="section-title text-2xl font-semibold">录入私人物品</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              这一轮先按 MVP 收敛为名称、描述、数量和单价四个字段，保证玩家能从角色页直接补齐背包内容。
            </p>

            <form action={createPrivateItemAction} className="mt-5 space-y-4">
              <input type="hidden" name="characterId" value={character.id} />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-semibold text-[var(--color-ink-700)]" htmlFor="private-item-name">
                    物品名称
                  </label>
                  <input
                    id="private-item-name"
                    name="name"
                    type="text"
                    required
                    maxLength={60}
                    className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                    placeholder="例如：裂纹护符"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[var(--color-ink-700)]" htmlFor="private-item-quantity">
                    数量
                  </label>
                  <input
                    id="private-item-quantity"
                    name="quantity"
                    type="number"
                    required
                    min={1}
                    max={9999}
                    defaultValue={1}
                    className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[var(--color-ink-700)]" htmlFor="private-item-price">
                    单价
                  </label>
                  <input
                    id="private-item-price"
                    name="unitPrice"
                    type="number"
                    required
                    min={0}
                    max={999999}
                    defaultValue={0}
                    className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label
                    className="block text-sm font-semibold text-[var(--color-ink-700)]"
                    htmlFor="private-item-description"
                  >
                    物品描述
                  </label>
                  <textarea
                    id="private-item-description"
                    name="description"
                    rows={4}
                    maxLength={240}
                    className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm leading-6 text-[var(--color-ink-900)]"
                    placeholder="可选。补充来源、用途或辨识信息，方便后续背包和交易查看。"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-[var(--border-soft)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-[var(--muted)]">
                  录入后物品会直接写入当前角色背包，并生成一条私人物品创建审计记录。
                </p>
                <button
                  type="submit"
                  className="focus-ring inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(95,66,31,0.22)] hover:bg-[var(--accent-strong)]"
                >
                  保存到背包
                </button>
              </div>
            </form>
          </article>

          <article className="panel rounded-[28px] p-6">
            <h3 className="section-title text-2xl font-semibold">公共物品回收</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              只有公共物品可以卖回系统商店，回收金额按当前商店售价的一半计算，并直接返还到对应货币。
            </p>

            {sellbackErrorMessage ? (
              <div className="mt-5 rounded-2xl border border-[rgba(165,63,43,0.24)] bg-[rgba(165,63,43,0.08)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
                {sellbackErrorMessage}
              </div>
            ) : null}

            {sellbackSuccessMessage ? (
              <div className="mt-5 rounded-2xl border border-[rgba(53,95,59,0.24)] bg-[rgba(53,95,59,0.08)] px-4 py-3 text-sm leading-6 text-[var(--success)]">
                {sellbackSuccessMessage}
              </div>
            ) : null}

            <div className="mt-5 table-shell">
              <table>
                <thead>
                  <tr>
                    <th>物品</th>
                    <th>库存</th>
                    <th>当前单价</th>
                    <th>回收单价</th>
                    <th>动作</th>
                  </tr>
                </thead>
                <tbody>
                  {publicInventoryItems.length > 0 ? (
                    publicInventoryItems.map((item) => {
                      const currentUnitPrice = item.sourceShopItem?.price ?? item.unitPrice;
                      const sellbackPrice = Math.floor(currentUnitPrice / 2);

                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-[var(--color-ink-900)]">{item.name}</span>
                              {item.description ? (
                                <span className="text-sm leading-6 text-[var(--muted)]">{item.description}</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="numeric">{formatPrice(item.quantity)}</td>
                          <td className="numeric">{formatPrice(currentUnitPrice)}</td>
                          <td className="numeric">{formatPrice(sellbackPrice)}</td>
                          <td>
                            <form
                              action={sellbackInventoryItemAction}
                              className="flex flex-col gap-2 sm:flex-row sm:items-center"
                            >
                              <input type="hidden" name="characterId" value={character.id} />
                              <input type="hidden" name="inventoryItemId" value={item.id} />
                              <input
                                name="quantity"
                                type="number"
                                min={1}
                                max={item.quantity}
                                defaultValue={1}
                                aria-label={`${item.name} 回收数量`}
                                className="focus-ring w-20 rounded-xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-3 py-2 text-sm text-[var(--color-ink-900)]"
                              />
                              <button
                                type="submit"
                                className="focus-ring inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--accent-strong)] hover:bg-[rgba(127,92,47,0.08)]"
                              >
                                半价回收
                              </button>
                            </form>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-sm leading-6 text-[var(--muted)]">
                        当前角色还没有可回收的公共物品。后续从公会商店或荣誉商店购买后，会在这里出现对应条目。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>

      <section className="mt-6 panel rounded-[28px] p-6">
        <h3 className="section-title text-2xl font-semibold">最近审计记录</h3>
        <div className="mt-4 table-shell">
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>动作</th>
                <th>改前</th>
                <th>改后</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              {character.auditLogs.length > 0 ? (
                character.auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(log.createdAt)}</td>
                    <td>{log.action}</td>
                    <td>{log.beforeValue ?? "-"}</td>
                    <td>{log.afterValue ?? "-"}</td>
                    <td>{log.note ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-sm text-[var(--muted)]">
                    这个角色暂时还没有审计记录。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
