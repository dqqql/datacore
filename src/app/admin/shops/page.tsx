import { AppShell } from "@/components/app-shell";
import {
  createShopItemAction,
  updateShopItemAction,
} from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/auth-helpers";
import { ensureDefaultShops } from "@/lib/bootstrap-shops";
import { prisma } from "@/lib/prisma";

type AdminShopsPageProps = {
  searchParams: Promise<{
    shopError?: string;
    shopSuccess?: string;
  }>;
};

const shopMessages = {
  invalid: "商品保存失败，请检查名称、分类、价格、排序和一次性密码后重试。",
  invalidOtp: "一次性密码无效、已使用，或当前批次已失效。",
  shopNotFound: "目标商店不存在，请刷新页面后重试。",
  itemNotFound: "目标商品不存在，请刷新页面后重试。",
  created: "商店条目已创建，并已写入审计日志。",
  updated: "商店条目已更新，并已写入审计日志。",
} as const;

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

  const shopErrorMessage =
    query.shopError === "invalid-shop-item"
      ? shopMessages.invalid
      : query.shopError === "invalid-otp"
        ? shopMessages.invalidOtp
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

  return (
    <AppShell
      title="公共商店管理"
      badge="Admin Shops"
      description="管理员现在可以直接维护商店条目。所有创建和修改动作都必须消耗一次性密码，并同步写入后台审计日志。"
    >
      <section className="grid gap-6">
        <article className="panel rounded-[28px] p-6">
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                当前规则
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--color-ink-900)]">
                保存商店条目前必须输入有效的一次性密码。
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                密码策略
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--color-ink-900)]">
                密码池刷新后旧批次全部失效，用过的密码不能重复使用。
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                审计范围
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--color-ink-900)]">
                创建、编辑、启停条目都会写入 `SHOP_ITEM_UPDATED`。
              </p>
            </div>
          </div>

          {shopErrorMessage ? (
            <div className="mt-5 rounded-2xl border border-[rgba(165,63,43,0.24)] bg-[rgba(165,63,43,0.08)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
              {shopErrorMessage}
            </div>
          ) : null}

          {shopSuccessMessage ? (
            <div className="mt-5 rounded-2xl border border-[rgba(53,95,59,0.24)] bg-[rgba(53,95,59,0.08)] px-4 py-3 text-sm leading-6 text-[var(--success)]">
              {shopSuccessMessage}
            </div>
          ) : null}
        </article>

        {shops.map((shop) => (
          <section key={shop.id} className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="panel rounded-[28px] p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="section-title text-2xl font-semibold">{shop.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    结算货币：{shop.currency}。当前共 {shop.items.length} 个条目。
                  </p>
                  {shop.description ? (
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{shop.description}</p>
                  ) : null}
                </div>
                <span className="rounded-full border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                  {shop.slug}
                </span>
              </div>

              <div className="space-y-4">
                {shop.items.map((item) => (
                  <form
                    key={item.id}
                    action={updateShopItemAction}
                    className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,250,241,0.88)] p-5"
                  >
                    <input type="hidden" name="shopItemId" value={item.id} />

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-[var(--color-ink-700)]">
                          商品名称
                        </label>
                        <input
                          name="name"
                          type="text"
                          required
                          maxLength={60}
                          defaultValue={item.name}
                          className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-[var(--color-ink-700)]">
                          分类
                        </label>
                        <input
                          name="category"
                          type="text"
                          required
                          maxLength={40}
                          defaultValue={item.category}
                          className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-[var(--color-ink-700)]">
                          价格
                        </label>
                        <input
                          name="price"
                          type="number"
                          min={0}
                          max={999999}
                          required
                          defaultValue={item.price}
                          className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-[var(--color-ink-700)]">
                          排序
                        </label>
                        <input
                          name="sortOrder"
                          type="number"
                          min={0}
                          max={9999}
                          required
                          defaultValue={item.sortOrder}
                          className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-[var(--color-ink-700)]">
                          来源
                        </label>
                        <input
                          name="importedSource"
                          type="text"
                          maxLength={240}
                          defaultValue={item.importedSource ?? ""}
                          placeholder="例如：SRD / 西征自定义"
                          className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-[var(--color-ink-700)]">
                          状态
                        </label>
                        <select
                          name="isActive"
                          defaultValue={item.isActive ? "true" : "false"}
                          className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                        >
                          <option value="true">启用</option>
                          <option value="false">停用</option>
                        </select>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-sm font-semibold text-[var(--color-ink-700)]">
                          描述
                        </label>
                        <textarea
                          name="description"
                          rows={3}
                          maxLength={240}
                          defaultValue={item.description ?? ""}
                          className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm leading-6 text-[var(--color-ink-900)]"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-sm font-semibold text-[var(--color-ink-700)]">
                          一次性密码
                        </label>
                        <input
                          name="otpCode"
                          type="text"
                          required
                          maxLength={120}
                          placeholder="输入本次修改要消耗的 OTP"
                          className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border-soft)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm leading-6 text-[var(--muted)]">
                        当前状态：{item.isActive ? "启用中" : "已停用"}。保存会同时更新条目和审计记录。
                      </p>
                      <button
                        type="submit"
                        className="focus-ring inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(95,66,31,0.22)] hover:bg-[var(--accent-strong)]"
                      >
                        保存条目
                      </button>
                    </div>
                  </form>
                ))}

                {shop.items.length === 0 ? (
                  <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.84)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                    当前商店还没有条目。可以直接在右侧新增第一条。
                  </div>
                ) : null}
              </div>
            </article>

            <article className="panel rounded-[28px] p-6">
              <h3 className="section-title text-2xl font-semibold">新增条目</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                新增条目默认启用。创建动作同样必须消耗一次性密码，并写入后台审计日志。
              </p>

              <form action={createShopItemAction} className="mt-5 space-y-4">
                <input type="hidden" name="shopId" value={shop.id} />

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[var(--color-ink-700)]">
                    商品名称
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    maxLength={60}
                    className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                    placeholder="例如：暮光符纸"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-[var(--color-ink-700)]">
                      分类
                    </label>
                    <input
                      name="category"
                      type="text"
                      required
                      maxLength={40}
                      className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                      placeholder="例如：药剂 / 武器 / 凭证"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-[var(--color-ink-700)]">
                      价格
                    </label>
                    <input
                      name="price"
                      type="number"
                      min={0}
                      max={999999}
                      required
                      defaultValue={0}
                      className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-[var(--color-ink-700)]">
                      排序
                    </label>
                    <input
                      name="sortOrder"
                      type="number"
                      min={0}
                      max={9999}
                      required
                      defaultValue={shop.items.length + 1}
                      className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-[var(--color-ink-700)]">
                      来源
                    </label>
                    <input
                      name="importedSource"
                      type="text"
                      maxLength={240}
                      className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                      placeholder="可选，例如：SRD / 西征自定义"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[var(--color-ink-700)]">
                    描述
                  </label>
                  <textarea
                    name="description"
                    rows={4}
                    maxLength={240}
                    className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm leading-6 text-[var(--color-ink-900)]"
                    placeholder="可选。补充用途、来源或限制。"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[var(--color-ink-700)]">
                    一次性密码
                  </label>
                  <input
                    name="otpCode"
                    type="text"
                    required
                    maxLength={120}
                    className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
                    placeholder="输入本次创建要消耗的 OTP"
                  />
                </div>

                <button
                  type="submit"
                  className="focus-ring inline-flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(95,66,31,0.22)] hover:bg-[var(--accent-strong)]"
                >
                  创建条目
                </button>
              </form>
            </article>
          </section>
        ))}
      </section>
    </AppShell>
  );
}
