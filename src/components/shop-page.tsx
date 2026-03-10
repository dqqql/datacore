import { purchaseShopItemAction } from "@/app/shops/actions";

type ShopPageItem = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  importedSource: string | null;
};

type ShopPageProps = {
  title: string;
  badge: string;
  description: string;
  currencyLabel: string;
  balanceLabel: string;
  balanceValue: number;
  shopPath: string;
  shopName: string;
  shopDescription?: string | null;
  items: ShopPageItem[];
  currentCharacter: {
    id: string;
    name: string;
  } | null;
  errorMessage?: string | null;
  successMessage?: string | null;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export function ShopPage({
  title,
  badge,
  description,
  currencyLabel,
  balanceLabel,
  balanceValue,
  shopPath,
  shopName,
  shopDescription,
  items,
  currentCharacter,
  errorMessage,
  successMessage,
}: ShopPageProps) {
  const purchaseDisabled = !currentCharacter;

  return (
    <section className="grid gap-6">
      <article className="panel rounded-[28px] p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-[var(--border-soft)] bg-[rgba(127,92,47,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
              {badge}
            </span>
            <h3 className="section-title mt-3 text-3xl font-semibold text-[var(--color-ink-900)]">
              {title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{description}</p>
            {shopDescription ? (
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{shopDescription}</p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[340px]">
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                当前角色
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">
                {currentCharacter?.name ?? "暂无可购买角色"}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                {balanceLabel}
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">
                {formatNumber(balanceValue)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                已锁定规则
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--color-ink-900)]">
                使用当前角色购买，公共物品写入背包，只能按当前售价半价卖回系统商店。
              </p>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-[rgba(165,63,43,0.24)] bg-[rgba(165,63,43,0.08)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-5 rounded-2xl border border-[rgba(53,95,59,0.24)] bg-[rgba(53,95,59,0.08)] px-4 py-3 text-sm leading-6 text-[var(--success)]">
            {successMessage}
          </div>
        ) : null}
      </article>

      <article className="panel rounded-[28px] p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="section-title text-2xl font-semibold">{shopName}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              价格按当前商店条目结算，货币类型固定为 {currencyLabel}。
            </p>
          </div>
          <span className="rounded-full border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
            {items.length} 个商品
          </span>
        </div>

        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>分类</th>
                <th>物品</th>
                <th>售价</th>
                <th>数量</th>
                <th>动作</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.category}</td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-[var(--color-ink-900)]">{item.name}</span>
                        {item.description ? (
                          <span className="text-sm leading-6 text-[var(--muted)]">{item.description}</span>
                        ) : null}
                        {item.importedSource ? (
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-700)]">
                            {item.importedSource}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="numeric">{formatNumber(item.price)}</td>
                    <td>
                      <form action={purchaseShopItemAction} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input type="hidden" name="shopPath" value={shopPath} />
                        <input type="hidden" name="shopItemId" value={item.id} />
                        <input type="hidden" name="characterId" value={currentCharacter?.id ?? ""} />
                        <input
                          name="quantity"
                          type="number"
                          min={1}
                          max={999}
                          defaultValue={1}
                          disabled={purchaseDisabled}
                          aria-label={`${item.name} 购买数量`}
                          className="focus-ring w-20 rounded-xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-3 py-2 text-sm text-[var(--color-ink-900)] disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <button
                          type="submit"
                          disabled={purchaseDisabled}
                          className="focus-ring inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(95,66,31,0.18)] hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:bg-[var(--muted)]"
                        >
                          购买
                        </button>
                      </form>
                    </td>
                    <td className="text-sm leading-6 text-[var(--muted)]">
                      购买后进入当前角色背包
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-sm leading-6 text-[var(--muted)]">
                    当前商店还没有商品。基础条目会在首次访问时自动初始化。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {purchaseDisabled ? (
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
            当前没有可用角色，所以暂时只能浏览商店内容。创建或切换角色后即可购买。
          </p>
        ) : null}
      </article>
    </section>
  );
}
