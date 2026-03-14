import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createShopItemAction, updateShopItemAction } from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/auth-helpers";
import { ensureDefaultShops } from "@/lib/bootstrap-shops";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AdminShopsPageProps = {
  searchParams: Promise<{
    shopError?: string;
    shopSuccess?: string;
    page?: string;
    mode?: string;
    itemId?: string;
    shopId?: string;
  }>;
};

const PAGE_SIZE = 10;

const shopMessages = {
  invalid: "商品保存失败，请检查名称、分类、价格与排序后重试。",
  shopNotFound: "目标商店不存在，请刷新页面后重试。",
  itemNotFound: "目标商品不存在，请刷新页面后重试。",
  created: "商店条目已创建，并已写入审计日志。",
  updated: "商店条目已更新，并已写入审计日志。",
} as const;

function formatCurrency(currency: string) {
  return currency === "HONOR" ? "荣誉值" : "金币";
}

function formatPageNumber(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function buildAdminShopsHref(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `/admin/shops?${query}` : "/admin/shops";
}

export default async function AdminShopsPage({ searchParams }: AdminShopsPageProps) {
  await requireAdminSession();
  await ensureDefaultShops();
  const query = await searchParams;

  const shops = await prisma.shop.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  const allItems = shops.flatMap((shop) =>
    shop.items.map((item) => ({
      ...item,
      shop,
    })),
  );

  const totalPages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));
  const currentPage = Math.min(formatPageNumber(query.page), totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedItems = allItems.slice(pageStart, pageStart + PAGE_SIZE);

  const selectedItem =
    query.mode === "edit" && query.itemId
      ? allItems.find((item) => item.id === query.itemId) ?? null
      : null;

  const selectedShopForCreate =
    (query.mode === "create" && query.shopId
      ? shops.find((shop) => shop.id === query.shopId)
      : null) ?? shops[0] ?? null;

  const shopErrorMessage =
    query.shopError === "invalid-shop-item"
      ? shopMessages.invalid
      : query.shopError === "shop-not-found"
          ? shopMessages.shopNotFound
          : query.shopError === "shop-item-not-found"
            ? shopMessages.itemNotFound
            : null;

  const shopSuccessMessage =
    query.shopSuccess === "shop-item-created"
      ? shopMessages.created
      : query.shopSuccess === "shop-item-updated"
        ? shopMessages.updated
        : null;

  const createItemHref = buildAdminShopsHref({
    page: currentPage,
    mode: "create",
    shopId: selectedShopForCreate?.id,
  });

  const closePanelHref = buildAdminShopsHref({ page: currentPage });
  const previousPageHref = buildAdminShopsHref({ page: currentPage - 1 });
  const nextPageHref = buildAdminShopsHref({ page: currentPage + 1 });

  return (
    <AppShell
      title="公共商店管理"
      badge="商店维护"
      description="后台改为单表格维护商品。点击商品即可编辑，新增条目通过弹出表单完成。管理员操作不再要求输入一次性密码。"
    >
      <section className="grid gap-6">
        <article className="panel rounded-[28px] p-6">
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="metric-card">
              <p>商品总数</p>
              <p className="metric-value">{allItems.length}</p>
              <p className="metric-detail">当前后台统一维护全部商店条目。</p>
            </div>
            <div className="metric-card">
              <p>当前页</p>
              <p className="metric-value">
                {currentPage} / {totalPages}
              </p>
              <p className="metric-detail">每页展示 10 条商品，可左右翻页查看。</p>
            </div>
            <div className="metric-card">
              <p>保存规则</p>
              <p className="metric-value">直改</p>
              <p className="metric-detail">管理员新增、编辑、启停商品都无需再输入 OTP。</p>
            </div>
          </div>

          {shopErrorMessage ? (
            <div className="status-message mt-5" data-tone="danger">
              {shopErrorMessage}
            </div>
          ) : null}

          {shopSuccessMessage ? (
            <div className="status-message mt-5" data-tone="success">
              {shopSuccessMessage}
            </div>
          ) : null}
        </article>

        <article className="panel rounded-[28px] p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="section-title text-2xl font-semibold">商品维护表</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                表格统一展示商店、分类、价格、状态和排序。点击商品名称即可打开编辑表单。
              </p>
            </div>
            <Link href={createItemHref} className="focus-ring btn-secondary btn-compact">
              + 调拨公会物资
            </Link>
          </div>

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>商店</th>
                  <th>商品</th>
                  <th>分类</th>
                  <th>价格</th>
                  <th>状态</th>
                  <th>排序</th>
                  <th>来源</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.length > 0 ? (
                  pagedItems.map((item) => {
                    const editHref = buildAdminShopsHref({
                      page: currentPage,
                      mode: "edit",
                      itemId: item.id,
                    });

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-[var(--color-ink-900)]">{item.shop.name}</span>
                            <span className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-700)]">
                              {formatCurrency(item.shop.currency)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <Link
                            href={editHref}
                            className="focus-ring inline-flex flex-col gap-1 rounded-xl px-2 py-1 -mx-2 text-left hover:bg-[rgba(127,92,47,0.06)]"
                          >
                            <span className="font-semibold text-[var(--color-ink-900)]">{item.name}</span>
                            {item.description ? (
                              <span className="text-sm leading-6 text-[var(--muted)]">{item.description}</span>
                            ) : (
                              <span className="text-sm leading-6 text-[var(--muted)]">点击后编辑该商品</span>
                            )}
                          </Link>
                        </td>
                        <td>{item.category}</td>
                        <td className="numeric">{item.price}</td>
                        <td>{item.isActive ? "启用中" : "已停用"}</td>
                        <td className="numeric">{item.sortOrder}</td>
                        <td>{item.importedSource ?? "-"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-sm leading-6 text-[var(--muted)]">
                      当前还没有可维护的商品条目。点击右上角“新增商品”即可开始录入。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Link
              href={previousPageHref}
              aria-disabled={currentPage <= 1}
              className={`focus-ring btn-secondary btn-compact ${currentPage <= 1 ? "pointer-events-none opacity-50" : ""}`}
            >
              ← 上一页
            </Link>
            <p className="text-sm text-[var(--muted)]">
              当前显示第 {currentPage} 页，共 {totalPages} 页
            </p>
            <Link
              href={nextPageHref}
              aria-disabled={currentPage >= totalPages}
              className={`focus-ring btn-secondary btn-compact ${currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}`}
            >
              下一页 →
            </Link>
          </div>
        </article>
      </section>

      {query.mode === "create" && selectedShopForCreate ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(43,33,23,0.42)] px-4 py-8 backdrop-blur-[2px]">
          <article className="panel-strong relative z-50 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[32px] px-6 py-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <span className="eyebrow">新增商品</span>
                <h3 className="section-title mt-3 text-3xl font-semibold text-[var(--color-ink-900)]">
                  新建商店条目
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  通过弹出表单新增商品。保存后会关闭表单，并回到当前分页位置。
                </p>
              </div>
              <Link href={closePanelHref} className="focus-ring btn-secondary btn-compact">
                关闭
              </Link>
            </div>

            <form action={createShopItemAction} className="space-y-4">
              <input type="hidden" name="returnPage" value={String(currentPage)} />
              <input type="hidden" name="returnMode" value="create" />
              <input type="hidden" name="returnShopId" value={selectedShopForCreate.id} />

              <div className="space-y-2">
                <label className="field-label" htmlFor="create-shop-id">
                  所属商店
                </label>
                <select
                  id="create-shop-id"
                  name="shopId"
                  defaultValue={selectedShopForCreate.id}
                  className="focus-ring field-select"
                >
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}（{formatCurrency(shop.currency)}）
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="field-label" htmlFor="create-item-name">
                    商品名称
                  </label>
                  <input
                    id="create-item-name"
                    name="name"
                    type="text"
                    required
                    maxLength={60}
                    className="focus-ring field-input"
                    placeholder="例如：暮光符纸"
                  />
                </div>

                <div className="space-y-2">
                  <label className="field-label" htmlFor="create-item-category">
                    分类
                  </label>
                  <input
                    id="create-item-category"
                    name="category"
                    type="text"
                    required
                    maxLength={40}
                    className="focus-ring field-input"
                    placeholder="例如：药剂 / 武器 / 凭证"
                  />
                </div>

                <div className="space-y-2">
                  <label className="field-label" htmlFor="create-item-price">
                    价格
                  </label>
                  <input
                    id="create-item-price"
                    name="price"
                    type="number"
                    min={0}
                    max={999999}
                    required
                    defaultValue={0}
                    className="focus-ring field-input"
                  />
                </div>

                <div className="space-y-2">
                  <label className="field-label" htmlFor="create-item-sort-order">
                    排序
                  </label>
                  <input
                    id="create-item-sort-order"
                    name="sortOrder"
                    type="number"
                    min={0}
                    max={9999}
                    required
                    defaultValue={selectedShopForCreate.items.length + 1}
                    className="focus-ring field-input"
                  />
                </div>

                <div className="space-y-2">
                  <label className="field-label" htmlFor="create-item-source">
                    来源
                  </label>
                  <input
                    id="create-item-source"
                    name="importedSource"
                    type="text"
                    maxLength={240}
                    className="focus-ring field-input"
                    placeholder="可选，例如：西征设定"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="field-label" htmlFor="create-item-description">
                    描述
                  </label>
                  <textarea
                    id="create-item-description"
                    name="description"
                    rows={4}
                    maxLength={240}
                    className="focus-ring field-textarea"
                    placeholder="可选。补充用途、来源或限制说明。"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[var(--border-soft)] pt-4">
                <Link href={closePanelHref} className="focus-ring btn-secondary">
                  取消
                </Link>
                <button type="submit" className="focus-ring btn-primary">
                  创建条目
                </button>
              </div>
            </form>
          </article>
        </div>
      ) : null}

      {query.mode === "edit" && selectedItem ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(43,33,23,0.42)] px-4 py-8 backdrop-blur-[2px]">
          <article className="panel-strong relative z-50 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[32px] px-6 py-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <span className="eyebrow">编辑商品</span>
                <h3 className="section-title mt-3 text-3xl font-semibold text-[var(--color-ink-900)]">
                  {selectedItem.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  当前归属 {selectedItem.shop.name}，结算货币为 {formatCurrency(selectedItem.shop.currency)}。
                </p>
              </div>
              <Link href={closePanelHref} className="focus-ring btn-secondary btn-compact">
                关闭
              </Link>
            </div>

            <form action={updateShopItemAction} className="space-y-4">
              <input type="hidden" name="shopItemId" value={selectedItem.id} />
              <input type="hidden" name="returnPage" value={String(currentPage)} />
              <input type="hidden" name="returnMode" value="edit" />
              <input type="hidden" name="returnItemId" value={selectedItem.id} />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="field-label" htmlFor="edit-item-name">
                    商品名称
                  </label>
                  <input
                    id="edit-item-name"
                    name="name"
                    type="text"
                    required
                    maxLength={60}
                    defaultValue={selectedItem.name}
                    className="focus-ring field-input"
                  />
                </div>

                <div className="space-y-2">
                  <label className="field-label" htmlFor="edit-item-category">
                    分类
                  </label>
                  <input
                    id="edit-item-category"
                    name="category"
                    type="text"
                    required
                    maxLength={40}
                    defaultValue={selectedItem.category}
                    className="focus-ring field-input"
                  />
                </div>

                <div className="space-y-2">
                  <label className="field-label" htmlFor="edit-item-price">
                    价格
                  </label>
                  <input
                    id="edit-item-price"
                    name="price"
                    type="number"
                    min={0}
                    max={999999}
                    required
                    defaultValue={selectedItem.price}
                    className="focus-ring field-input"
                  />
                </div>

                <div className="space-y-2">
                  <label className="field-label" htmlFor="edit-item-sort-order">
                    排序
                  </label>
                  <input
                    id="edit-item-sort-order"
                    name="sortOrder"
                    type="number"
                    min={0}
                    max={9999}
                    required
                    defaultValue={selectedItem.sortOrder}
                    className="focus-ring field-input"
                  />
                </div>

                <div className="space-y-2">
                  <label className="field-label" htmlFor="edit-item-active">
                    状态
                  </label>
                  <select
                    id="edit-item-active"
                    name="isActive"
                    defaultValue={selectedItem.isActive ? "true" : "false"}
                    className="focus-ring field-select"
                  >
                    <option value="true">启用</option>
                    <option value="false">停用</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="field-label" htmlFor="edit-item-source">
                    来源
                  </label>
                  <input
                    id="edit-item-source"
                    name="importedSource"
                    type="text"
                    maxLength={240}
                    defaultValue={selectedItem.importedSource ?? ""}
                    className="focus-ring field-input"
                    placeholder="可选，例如：西征设定"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="field-label" htmlFor="edit-item-description">
                    描述
                  </label>
                  <textarea
                    id="edit-item-description"
                    name="description"
                    rows={4}
                    maxLength={240}
                    defaultValue={selectedItem.description ?? ""}
                    className="focus-ring field-textarea"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[var(--border-soft)] pt-4">
                <Link href={closePanelHref} className="focus-ring btn-secondary">
                  取消
                </Link>
                <button type="submit" className="focus-ring btn-primary">
                  保存条目
                </button>
              </div>
            </form>
          </article>
        </div>
      ) : null}
    </AppShell>
  );
}
