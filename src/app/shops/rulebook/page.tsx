import { AppShell } from "@/components/app-shell";
import { ensureDefaultShops } from "@/lib/bootstrap-shops";
import { requirePlayerCharacter } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

function formatDisplayPrice(priceLabel: string | null, price: number) {
  if (priceLabel) {
    return priceLabel;
  }

  return `${new Intl.NumberFormat("zh-CN").format(price)} gp`;
}

export default async function RulebookShopPage() {
  await requirePlayerCharacter();
  await ensureDefaultShops();

  const shop = await prisma.shop.findUnique({
    where: { slug: "rulebook" },
    include: {
      items: {
        where: { isActive: true },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  const items = shop?.items ?? [];
  const srdCount = items.filter((item) => item.importedSource === "SRD").length;
  const customCount = items.length - srdCount;

  return (
    <AppShell
      title="官方规则书物品"
      badge="Rulebook Items"
      description="这里用于浏览规则书基础物品目录。当前以分类、来源和原始价格口径核对为主，不参与直接购买。"
    >
      <section className="grid gap-6">
        <article className="panel rounded-[28px] p-6">
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                当前条目
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">
                {items.length} 个
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                SRD 导入
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">
                {srdCount} 个
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">
                自定义条目
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">
                {customCount} 个
              </p>
            </div>
          </div>
        </article>

        <article className="panel rounded-[28px] p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="section-title text-2xl font-semibold">规则书目录</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                价格优先按原始 SRD 记法展示；子金币单位不会强行换算成可购买价格。
              </p>
            </div>
            <span className="rounded-full border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
              Read Only
            </span>
          </div>

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>分类</th>
                  <th>物品</th>
                  <th>来源</th>
                  <th>价格</th>
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
                        </div>
                      </td>
                      <td>{item.importedSource ?? "-"}</td>
                      <td className="numeric">{formatDisplayPrice(item.priceLabel, item.price)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-sm leading-6 text-[var(--muted)]">
                      当前还没有规则书条目。确认 `srd.md` 已放在项目根目录后，刷新页面会自动导入。
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
