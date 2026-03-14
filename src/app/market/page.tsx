import { AppShell } from "@/components/app-shell";
import { requirePlayerCharacter } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  cancelMarketListingAction,
  purchaseMarketListingAction,
} from "@/app/market/actions";

export const dynamic = "force-dynamic";

type MarketPageProps = {
  searchParams: Promise<{
    marketError?: string;
    marketSuccess?: string;
  }>;
};

const marketMessages = {
  invalidCancel: "撤销失败，请刷新页面后重试。",
  cancelUnavailable: "该寄售当前无法撤销。",
  invalidPurchase: "购买失败，请检查当前角色与寄售单状态后重试。",
  purchaseUnavailable: "该寄售单当前不可入手，可能已售出或被撤销。",
  selfPurchase: "不能入手自己委托的物品。",
  insufficientGold: "当前角色金币不足，无法完成此次入手。",
  cancelCompleted: "寄售已撤销，物品已返回卖方角色行囊。",
  purchaseCompleted: "交易达成，物品已转入当前角色行囊。",
} as const;

function formatPrice(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export default async function MarketPage({ searchParams }: MarketPageProps) {
  const query = await searchParams;
  const { session, currentCharacter } = await requirePlayerCharacter();

  const listings = await prisma.marketListing.findMany({
    where: {
      status: "ACTIVE",
    },
    include: {
      inventoryItem: true,
      sellerCharacter: true,
    },
    orderBy: [{ listedAt: "desc" }],
  });

  const marketErrorMessage =
    query.marketError === "invalid-cancel"
      ? marketMessages.invalidCancel
      : query.marketError === "cancel-unavailable"
        ? marketMessages.cancelUnavailable
        : query.marketError === "invalid-purchase"
          ? marketMessages.invalidPurchase
          : query.marketError === "purchase-unavailable"
            ? marketMessages.purchaseUnavailable
            : query.marketError === "self-purchase"
              ? marketMessages.selfPurchase
              : query.marketError === "insufficient-gold"
                ? marketMessages.insufficientGold
                : null;

  const marketSuccessMessage =
    query.marketSuccess === "purchase-completed"
      ? marketMessages.purchaseCompleted
      : query.marketSuccess === "cancel-completed"
        ? marketMessages.cancelCompleted
        : null;

  return (
    <AppShell
      title="冒险者集市"
      description="冒险者集市已接入真实挂单与自动成交。私设物品仅支持整单寄售与整单入手，不开放议价或拍卖。"
      badge="市场"
    >
      <section className="grid gap-6">
        <article className="panel rounded-[28px] p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <h3 className="section-title text-3xl font-semibold text-[var(--color-ink-900)]">
                自动成交的冒险者集市
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                寄售价格取物品当前单价。入手完成后，系统会自动扣除买方角色金币、
                为卖方角色入账，并将物品转移至当前角色行囊。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[340px]">
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                  当前角色
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">
                  {currentCharacter?.name ?? "暂无可用角色"}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                  当前角色金币
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">
                  {formatPrice(currentCharacter?.gold ?? 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                  交易规则
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-ink-900)]">
                  仅私设物品可在集市寄售。价格不可在线修改，若录入有误，请先撤销后返回角色卡册修正并重新委托寄售。
                </p>
              </div>
            </div>
          </div>

          {marketErrorMessage ? (
            <div className="status-message mt-5" data-tone="danger">
              {marketErrorMessage}
            </div>
          ) : null}

          {marketSuccessMessage ? (
            <div className="status-message mt-5" data-tone="success">
              {marketSuccessMessage}
            </div>
          ) : null}
        </article>

        <article className="panel rounded-[28px] p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="section-title text-2xl font-semibold">集市目前在售</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                所有交易均按当前寄售单整单成交，不拆单，不议价。
              </p>
            </div>
            <span className="rounded-full border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
              {listings.length} 条寄售
            </span>
          </div>

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>寄售物品</th>
                  <th>卖方角色</th>
                  <th>价格</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {listings.length > 0 ? (
                  listings.map((listing) => {
                    const isOwnListing = listing.sellerCharacter.userId === session.user.id;

                    return (
                      <tr key={listing.id}>
                        <td>
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-[var(--color-ink-900)]">{listing.inventoryItem.name}</span>
                            {listing.inventoryItem.description ? (
                              <span className="text-sm leading-6 text-[var(--muted)]">
                                {listing.inventoryItem.description}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td>{listing.sellerCharacter.name}</td>
                        <td className="numeric">{formatPrice(listing.price)}</td>
                        <td>{isOwnListing ? "我的寄售" : "可入手"}</td>
                        <td>
                          {isOwnListing ? (
                            <form action={cancelMarketListingAction}>
                              <input type="hidden" name="characterId" value={listing.sellerCharacterId} />
                              <input type="hidden" name="listingId" value={listing.id} />
                              <input type="hidden" name="redirectPath" value="/market" />
                              <button
                                type="submit"
                                className="focus-ring btn-secondary btn-compact"
                              >
                                下架
                              </button>
                            </form>
                          ) : (
                            <form action={purchaseMarketListingAction}>
                              <input type="hidden" name="buyerCharacterId" value={currentCharacter?.id ?? ""} />
                              <input type="hidden" name="listingId" value={listing.id} />
                              <button
                                type="submit"
                                disabled={!currentCharacter}
                                className="focus-ring btn-primary btn-compact disabled:bg-[var(--muted)]"
                              >
                                立即购买
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="text-sm leading-6 text-[var(--muted)]">
                      集市目前无人寄售。你可以先在角色卡册存放战利品并委托集市寄售，数据会在此实时展示。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
