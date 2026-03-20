import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { submitHonorAdjustmentRequestAction } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { requirePlayerCharacter } from "@/lib/auth-helpers";
import { formatHonorValue } from "@/lib/honor";
import {
  createPrivateItemAction,
  deletePrivateItemAction,
  updateCharacterEconomyAction,
} from "@/app/characters/actions";
import {
  cancelMarketListingAction,
  createMarketListingAction,
} from "@/app/market/actions";
import { sellbackInventoryItemAction } from "@/app/shops/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { InventoryQuantityEditorButton } from "@/components/inventory-quantity-editor-button";
import { isPlantingMaterialName, isPlantingSeedName } from "@/lib/planting";

export const dynamic = "force-dynamic";

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
    honorRequestError?: string;
    honorRequestSuccess?: string;
  }>;
};

const inventoryMessages = {
  invalid: "存放失败，请检查名称、数量与单价后重试。",
  duplicate: "该角色背包中已存在同名物品，请更换名称后再存入。",
  deleteInvalid: "删除失败，请刷新页面后重试。",
  deleteUnavailable: "该私设物品当前无法删除，请先确认它未在寄售中。",
  quantityInvalid: "数量修改失败，请输入大于等于 1 的正整数后重试。",
  quantityOtpInvalid: "一次性密码无效、已使用，或当前批次已失效。",
  quantityUnavailable: "该物品当前无法修改数量，请先确认它未在寄售中。",
  created: "战利品/私设物品已妥善存入当前角色行囊。",
  deleted: "私设物品已从角色背包和数据库中删除。",
  quantityUpdated: "物品数量已保存。",
} as const;

const sellbackMessages = {
  invalid: "典当失败，请检查物品与数量后重试。",
  unavailable: "该物品当前不可典当给公会。",
  tooMany: "典当数量不能超过行囊中的现有数量。",
  completed: "半价典当成功，返还金额已写回对应货币。",
} as const;

const listingMessages = {
  invalid: "寄售或撤销失败，请刷新页面后重试。",
  unavailable: "该私设物品当前无法委托集市寄售。",
  cancelUnavailable: "该寄售当前无法撤销。",
  created: "私设物品已委托集市寄售。",
  cancelled: "寄售已撤销，物品已返回角色行囊并恢复可操作状态。",
} as const;

const honorRequestMessages = {
  invalid: "荣誉值申请提交失败，请检查目标荣誉值与原因后重试。",
  notFound: "当前账号不存在，请重新登录后再试。",
  noChange: "目标荣誉值与当前账号荣誉值一致，无需重复提交。",
  submitted: "荣誉值申请已提交，等待管理员审核通过后生效。",
} as const;

function formatOwnershipType(type: "PUBLIC" | "PRIVATE") {
  return type === "PRIVATE" ? "私设物品" : "规则书物品";
}

function getPlantingTag(name: string) {
  if (isPlantingSeedName(name)) {
    return "种植种子";
  }

  if (isPlantingMaterialName(name)) {
    return "种植材料";
  }

  return null;
}

function formatAuditAction(action: string) {
  const labels: Record<string, string> = {
    CHARACTER_GOLD_UPDATED: "金币调整",
    CHARACTER_REPUTATION_UPDATED: "声望调整",
    PRIVATE_ITEM_CREATED: "存放战利品",
    PRIVATE_ITEM_DELETED: "删除私设物品",
    INVENTORY_ITEM_QUANTITY_UPDATED: "物品数量调整",
    MARKET_LISTED: "集市寄售",
    MARKET_CANCELLED: "撤销寄售",
    MARKET_PURCHASED: "集市入手",
    SHOP_PURCHASED: "商店购买",
    SHOP_SELLBACK: "半价典当",
    PLANTING_SEED_PLANTED: "温室播种",
    PLANTING_SEED_HARVESTED: "温室收获",
    PLANTING_PLOT_EXPANDED: "温室扩容",
  };

  return labels[action] ?? action;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export default async function CharacterDetailPage({ params, searchParams }: CharacterDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { session, user } = await requirePlayerCharacter();

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

  const pendingHonorRequest =
    session.user.role === "PLAYER"
      ? await prisma.honorAdjustmentRequest.findFirst({
          where: {
            userId: user.id,
            status: "PENDING",
          },
          orderBy: {
            updatedAt: "desc",
          },
        })
      : null;

  const inventoryErrorMessage =
    query.inventoryError === "invalid-private-item"
      ? inventoryMessages.invalid
      : query.inventoryError === "duplicate-private-item-name"
        ? inventoryMessages.duplicate
      : query.inventoryError === "invalid-private-item-delete"
        ? inventoryMessages.deleteInvalid
        : query.inventoryError === "private-item-delete-unavailable"
          ? inventoryMessages.deleteUnavailable
          : query.inventoryError === "invalid-item-quantity-update"
            ? inventoryMessages.quantityInvalid
            : query.inventoryError === "invalid-item-quantity-otp"
              ? inventoryMessages.quantityOtpInvalid
            : query.inventoryError === "item-quantity-update-unavailable"
              ? inventoryMessages.quantityUnavailable
            : null;
  const inventorySuccessMessage =
    query.inventorySuccess === "private-item-created"
      ? inventoryMessages.created
      : query.inventorySuccess === "private-item-deleted"
        ? inventoryMessages.deleted
        : query.inventorySuccess === "item-quantity-updated"
          ? inventoryMessages.quantityUpdated
        : null;
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
  const honorRequestErrorMessage =
    query.honorRequestError === "invalid-honor-request"
      ? honorRequestMessages.invalid
      : query.honorRequestError === "user-not-found"
        ? honorRequestMessages.notFound
        : query.honorRequestError === "honor-request-no-change"
          ? honorRequestMessages.noChange
          : null;
  const honorRequestSuccessMessage =
    query.honorRequestSuccess === "honor-request-submitted" ? honorRequestMessages.submitted : null;

  const publicInventoryItems = character.inventoryItems.filter(
    (item) => item.ownershipType === "PUBLIC" && !isPlantingSeedName(item.name),
  );

  return (
    <AppShell
      title={`角色详情：${character.name}`}
      description="这里集中处理当前角色的金币、声望、行囊、私设物品交易与规则书物品典当。"
      badge="角色详情"
    >
      <section className="panel rounded-[28px] p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="section-title text-2xl font-semibold">经济数据</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              把常用的金币、声望和荣誉值入口放到角色详情标题下方，进入页面后就能直接操作；移动端会自动改为纵向排列。
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
              当前账号荣誉
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--color-ink-900)]">
              {formatHonorValue(user.honor)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.02fr_1.18fr]">
          <article className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] p-5">
            <div className="flex flex-col gap-2">
              <h4 className="section-title text-xl font-semibold">金币与声望</h4>
              <p className="text-sm leading-6 text-[var(--muted)]">
                角色维度的常用数值改成横向表单，输入空间更宽，也更贴近进入详情页后的第一操作区域。
              </p>
            </div>

            <form action={updateCharacterEconomyAction} className="mt-5 space-y-4">
              <input type="hidden" name="characterId" value={character.id} />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="field-label" htmlFor="hero-gold">金币</label>
                  <input
                    id="hero-gold"
                    name="gold"
                    type="number"
                    min={0}
                    defaultValue={character.gold}
                    className="focus-ring field-input"
                  />
                </div>

                <div className="space-y-2">
                  <label className="field-label" htmlFor="hero-reputation">声望</label>
                  <input
                    id="hero-reputation"
                    name="reputation"
                    type="number"
                    min={0}
                    defaultValue={character.reputation}
                    className="focus-ring field-input"
                  />
                </div>
              </div>

              <div className="flex justify-end border-t border-[var(--border-soft)] pt-4">
                <button
                  type="submit"
                  className="focus-ring btn-primary w-full md:w-auto md:min-w-40"
                >
                  保存经济数据
                </button>
              </div>
            </form>
          </article>

          {session.user.role === "PLAYER" ? (
            <article className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] p-5">
              <div className="flex flex-col gap-2">
                <h4 className="section-title text-xl font-semibold">账号荣誉值申请</h4>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  荣誉值申请入口现在放在行囊概览上方，目标值与原因可以在同一横向区域里完成填写。
                </p>
              </div>

              {honorRequestErrorMessage ? (
                <div className="status-message mt-4" data-tone="danger">
                  {honorRequestErrorMessage}
                </div>
              ) : null}

              {honorRequestSuccessMessage ? (
                <div className="status-message mt-4" data-tone="success">
                  {honorRequestSuccessMessage}
                </div>
              ) : null}

              {pendingHonorRequest ? (
                <div className="mt-4 rounded-[20px] border border-[var(--border-soft)] bg-white/75 px-4 py-4 text-sm leading-6 text-[var(--muted)]">
                  <p className="font-semibold text-[var(--color-ink-900)]">当前有一条待审核申请</p>
                  <p className="mt-2">
                    目标荣誉值：{formatHonorValue(pendingHonorRequest.requestedHonor)}，提交时间：{" "}
                    {new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(
                      pendingHonorRequest.updatedAt,
                    )}
                  </p>
                  <p className="mt-1">申请原因：{pendingHonorRequest.reason}</p>
                  <p className="mt-1">重新提交会覆盖这条待审核申请。</p>
                </div>
              ) : null}

              <form action={submitHonorAdjustmentRequestAction} className="mt-5 space-y-4">
                <input type="hidden" name="redirectPath" value={`/characters/${character.id}`} />

                <div className="grid gap-4 md:grid-cols-[0.72fr_1.28fr]">
                  <div className="space-y-2">
                    <label className="field-label" htmlFor="hero-current-honor">当前账号荣誉值</label>
                    <input
                      id="hero-current-honor"
                      type="text"
                      value={formatHonorValue(user.honor)}
                      readOnly
                      className="field-input cursor-not-allowed opacity-80"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="field-label" htmlFor="hero-target-honor">申请修改后的荣誉值</label>
                    <input
                      id="hero-target-honor"
                      name="targetHonor"
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      defaultValue={pendingHonorRequest?.requestedHonor ?? user.honor}
                      className="focus-ring field-input"
                      placeholder="请输入审核通过后应生效的荣誉值"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="field-label" htmlFor="hero-honor-request-reason">申请原因</label>
                  <textarea
                    id="hero-honor-request-reason"
                    name="reason"
                    rows={3}
                    required
                    maxLength={120}
                    defaultValue={pendingHonorRequest?.reason ?? ""}
                    className="focus-ring field-textarea"
                    placeholder="例如：完成活动结算后，需要将账号荣誉值修正为 12.5"
                  />
                </div>

                <div className="flex justify-end border-t border-[var(--border-soft)] pt-4">
                  <button
                    type="submit"
                    className="focus-ring btn-primary w-full md:w-auto md:min-w-48"
                  >
                    {pendingHonorRequest ? "更新待审核申请" : "提交荣誉值申请"}
                  </button>
                </div>
              </form>
            </article>
          ) : (
            <article className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] p-5">
              <div className="flex h-full flex-col justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <h4 className="section-title text-xl font-semibold">账号荣誉值</h4>
                  <p className="text-sm leading-6 text-[var(--muted)]">
                    这里展示当前账号荣誉值。管理员如需直接发放或扣减，可前往后台的账号与荣誉管理页面处理。
                  </p>
                </div>

                <div className="rounded-[20px] border border-[var(--border-soft)] bg-white/75 px-4 py-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                    当前荣誉值
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--color-ink-900)]">
                    {formatHonorValue(user.honor)}
                  </p>
                </div>
              </div>
            </article>
          )}
        </div>
      </section>

      <section className="mt-6 space-y-6">
        <article className="hidden panel rounded-[28px] p-6">
          <h3 className="section-title text-2xl font-semibold">经济数据</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            金币与声望允许玩家自行维护，荣誉值则以账号维度提交审核申请。所有修改都会写入后台审计日志。
          </p>

          <form action={updateCharacterEconomyAction} className="mt-5 space-y-4">
            <input type="hidden" name="characterId" value={character.id} />

            <div className="space-y-2">
              <label className="field-label" htmlFor="gold">金币</label>
              <input
                id="gold"
                name="gold"
                type="number"
                min={0}
                defaultValue={character.gold}
                className="focus-ring field-input"
              />
            </div>

            <div className="space-y-2">
              <label className="field-label" htmlFor="reputation">声望</label>
              <input
                id="reputation"
                name="reputation"
                type="number"
                min={0}
                defaultValue={character.reputation}
                className="focus-ring field-input"
              />
            </div>

            <button
              type="submit"
              className="focus-ring btn-primary w-full"
            >
              保存经济数据
            </button>
          </form>

          {session.user.role === "PLAYER" ? (
            <div className="mt-6 border-t border-[var(--border-soft)] pt-6">
              <div className="flex flex-col gap-2">
                <h4 className="section-title text-xl font-semibold">账号荣誉值申请</h4>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  当前位置放在金币修改区域下方。填写修改后的目标荣誉值并提交后，需要管理员在后台审核通过才会真正生效。
                </p>
              </div>

              {honorRequestErrorMessage ? (
                <div className="status-message mt-4" data-tone="danger">
                  {honorRequestErrorMessage}
                </div>
              ) : null}

              {honorRequestSuccessMessage ? (
                <div className="status-message mt-4" data-tone="success">
                  {honorRequestSuccessMessage}
                </div>
              ) : null}

              {pendingHonorRequest ? (
                <div className="mt-4 rounded-[20px] border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
                  <p className="font-semibold text-[var(--color-ink-900)]">
                    当前有一条待审核申请
                  </p>
                  <p className="mt-2">
                    目标荣誉值：{formatHonorValue(pendingHonorRequest.requestedHonor)}，提交时间：
                    {" "}
                    {new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(
                      pendingHonorRequest.updatedAt,
                    )}
                  </p>
                  <p className="mt-1">申请原因：{pendingHonorRequest.reason}</p>
                  <p className="mt-1">重新提交会覆盖这条待审核申请。</p>
                </div>
              ) : null}

              <form action={submitHonorAdjustmentRequestAction} className="mt-5 space-y-4">
                <input type="hidden" name="redirectPath" value={`/characters/${character.id}`} />

                <div className="space-y-2">
                  <label className="field-label" htmlFor="current-honor">当前账号荣誉值</label>
                  <input
                    id="current-honor"
                    type="text"
                    value={formatHonorValue(user.honor)}
                    readOnly
                    className="field-input cursor-not-allowed opacity-80"
                  />
                </div>

                <div className="space-y-2">
                  <label className="field-label" htmlFor="target-honor">申请修改后的荣誉值</label>
                  <input
                    id="target-honor"
                    name="targetHonor"
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    defaultValue={pendingHonorRequest?.requestedHonor ?? user.honor}
                    className="focus-ring field-input"
                    placeholder="请输入审核通过后应生效的荣誉值"
                  />
                </div>

                <div className="space-y-2">
                  <label className="field-label" htmlFor="honor-request-reason">申请原因</label>
                  <textarea
                    id="honor-request-reason"
                    name="reason"
                    rows={3}
                    required
                    maxLength={120}
                    defaultValue={pendingHonorRequest?.reason ?? ""}
                    className="focus-ring field-textarea"
                    placeholder="例如：完成活动结算后，需要将账号荣誉值修正为 12.5"
                  />
                </div>

                <button
                  type="submit"
                  className="focus-ring btn-primary w-full"
                >
                  {pendingHonorRequest ? "更新待审核申请" : "提交荣誉值申请"}
                </button>
              </form>
            </div>
          ) : null}
        </article>

        <div className="space-y-6">
          <article className="panel rounded-[28px] p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="section-title text-2xl font-semibold">行囊概览</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  当前行囊直接读取数据库中的真实数据。你可以在此管理私设物品、查看规则书物品，并执行集市相关操作。
                </p>
              </div>

              <div className="shrink-0 rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
                <p className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                  行囊条目数
                </p>
                <p className="mt-1 text-lg font-semibold text-[var(--color-ink-900)]">
                  {character.inventoryItems.length}
                </p>
              </div>
            </div>

            {inventoryErrorMessage ? (
              <div className="status-message mt-5" data-tone="danger">
                {inventoryErrorMessage}
              </div>
            ) : null}

            {inventorySuccessMessage ? (
              <div className="status-message mt-5" data-tone="success">
                {inventorySuccessMessage}
              </div>
            ) : null}

            {listingErrorMessage ? (
              <div className="status-message mt-5" data-tone="danger">
                {listingErrorMessage}
              </div>
            ) : null}

            {listingSuccessMessage ? (
              <div className="status-message mt-5" data-tone="success">
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
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-[var(--color-ink-900)]">{item.name}</span>
                              {getPlantingTag(item.name) ? (
                                <span className="rounded-full border border-[rgba(127,92,47,0.18)] bg-[rgba(127,92,47,0.08)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-strong)]">
                                  {getPlantingTag(item.name)}
                                </span>
                              ) : null}
                            </div>
                            {item.description ? (
                              <span className="mt-1 block max-h-[88px] w-full min-w-[12rem] max-w-[18rem] overflow-y-auto overflow-x-hidden break-words whitespace-pre-wrap rounded-xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.5)] p-2.5 text-xs leading-relaxed text-[var(--muted)] custom-scrollbar shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                                {item.description}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td>{formatOwnershipType(item.ownershipType)}</td>
                        <td className="numeric">
                          <InventoryQuantityEditorButton
                            characterId={character.id}
                            inventoryItemId={item.id}
                            itemName={item.name}
                            quantity={item.quantity}
                            requiresOtp={session.user.role !== "ADMIN"}
                            disabled={item.isListed}
                          />
                        </td>
                        <td className="numeric">{formatPrice(item.sourceShopItem?.price ?? item.unitPrice)}</td>
                        <td>{item.isListed ? "寄售中" : "行囊中"}</td>
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
                                  className="focus-ring btn-secondary btn-compact"
                                >
                                  撤销寄售
                                </button>
                              </form>
                            ) : (
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <form action={createMarketListingAction}>
                                  <input type="hidden" name="characterId" value={character.id} />
                                  <input type="hidden" name="inventoryItemId" value={item.id} />
                                  <button
                                    type="submit"
                                    className="focus-ring btn-secondary btn-compact"
                                  >
                                    委托寄售
                                  </button>
                                </form>
                                <form action={deletePrivateItemAction}>
                                  <input type="hidden" name="characterId" value={character.id} />
                                  <input type="hidden" name="inventoryItemId" value={item.id} />
                                  <ConfirmSubmitButton
                                    className="focus-ring btn-secondary btn-compact"
                                    confirmTitle="确认删除私设物品"
                                    confirmMessage={`确认删除“${item.name}”吗？删除后将无法恢复。`}
                                    confirmTone="danger"
                                  >
                                    删除
                                  </ConfirmSubmitButton>
                                </form>
                              </div>
                            )
                          ) : (
                            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-700)]">
                              {isPlantingSeedName(item.name) ? "种植专用" : "不可交易"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-sm leading-6 text-[var(--muted)]">
                        当前角色行囊空空如也。你可以先在下方存放战利品，后续公会补给处购入所得也会自动写入此处。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel rounded-[28px] p-6">
            <h3 className="section-title text-2xl font-semibold">存放战利品/私设物品</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              当前版本保留最小闭环，仅记录名称、描述、数量与单价四项基础信息，以确保行囊与交易流程完整可用。
            </p>

            <form action={createPrivateItemAction} className="mt-5 space-y-4">
              <input type="hidden" name="characterId" value={character.id} />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="field-label" htmlFor="private-item-name">物品名称</label>
                  <input
                    id="private-item-name"
                    name="name"
                    type="text"
                    required
                    maxLength={60}
                    className="focus-ring field-input"
                    placeholder="例如：裹纹护符"
                  />
                </div>

                <div className="space-y-2">
                  <label className="field-label" htmlFor="private-item-quantity">数量</label>
                  <input
                    id="private-item-quantity"
                    name="quantity"
                    type="number"
                    required
                    min={1}
                    max={9999}
                    defaultValue={1}
                    className="focus-ring field-input"
                  />
                </div>

                <div className="space-y-2">
                  <label className="field-label" htmlFor="private-item-price">单价</label>
                  <input
                    id="private-item-price"
                    name="unitPrice"
                    type="number"
                    required
                    min={0}
                    max={999999}
                    defaultValue={0}
                    className="focus-ring field-input"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="field-label" htmlFor="private-item-description">物品描述</label>
                  <textarea
                    id="private-item-description"
                    name="description"
                    rows={4}
                    maxLength={240}
                    className="focus-ring field-textarea"
                    placeholder="可选。补充来源、用途或辨识信息，便于后续背包与交易查看。"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-[var(--border-soft)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-[var(--muted)]">
                  录入后物品会妥善存入当前角色行囊，并生成一条存放战利品审计记录。
                </p>
                <button
                  type="submit"
                  className="focus-ring btn-primary"
                >
                  存入行囊
                </button>
              </div>
            </form>
          </article>

          <article className="panel rounded-[28px] p-6">
            <h3 className="section-title text-2xl font-semibold">规则书物品典当</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              仅规则书物品可半价典当给公会。典当金额按当前公会售价的一半计算，并直接返还至对应货币。
            </p>

            {sellbackErrorMessage ? (
              <div className="status-message mt-5" data-tone="danger">
                {sellbackErrorMessage}
              </div>
            ) : null}

            {sellbackSuccessMessage ? (
              <div className="status-message mt-5" data-tone="success">
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
                    <th>操作</th>
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
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-[var(--color-ink-900)]">{item.name}</span>
                                {getPlantingTag(item.name) ? (
                                  <span className="rounded-full border border-[rgba(127,92,47,0.18)] bg-[rgba(127,92,47,0.08)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-strong)]">
                                    {getPlantingTag(item.name)}
                                  </span>
                                ) : null}
                              </div>
                              {item.description ? (
                                <span className="mt-1 block max-h-[88px] w-full min-w-[12rem] max-w-[18rem] overflow-y-auto overflow-x-hidden break-words whitespace-pre-wrap rounded-xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.5)] p-2.5 text-xs leading-relaxed text-[var(--muted)] custom-scrollbar shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                                  {item.description}
                                </span>
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
                                className="focus-ring field-input field-compact w-20"
                              />
                              <ConfirmSubmitButton
                                className="focus-ring btn-secondary btn-compact"
                              >
                                半价回收
                              </ConfirmSubmitButton>
                            </form>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-sm leading-6 text-[var(--muted)]">
                        当前角色尚无可典当的规则书物品。后续从公会补给处购入后，会在此显示对应条目。
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
                <th>调整前</th>
                <th>调整后</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              {character.auditLogs.length > 0 ? (
                character.auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      {new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(log.createdAt)}
                    </td>
                    <td>{formatAuditAction(log.action)}</td>
                    <td>{log.beforeValue ?? "-"}</td>
                    <td>{log.afterValue ?? "-"}</td>
                    <td>{log.note ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-sm text-[var(--muted)]">
                    该角色当前尚无审计记录。
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
