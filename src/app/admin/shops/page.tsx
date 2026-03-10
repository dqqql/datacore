import { AppShell } from "@/components/app-shell";
import { requireAdminSession } from "@/lib/auth-helpers";
import { ensureDefaultShops } from "@/lib/bootstrap-shops";
import { prisma } from "@/lib/prisma";

export default async function AdminShopsPage() {
  await requireAdminSession();
  await ensureDefaultShops();

  const shops = await prisma.shop.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      items: {
        where: { isActive: true },
        select: { id: true },
      },
    },
  });

  return (
    <AppShell
      title="公共商店管理"
      badge="Admin Shops"
      description="管理员维护公会商店、荣誉商店和规则书物品入口。首版重点是把商品维护和一次性密码校验串起来。"
    >
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="panel rounded-[28px] p-6">
          <h3 className="section-title text-2xl font-semibold">当前已锁定的规则</h3>
          <div className="mt-4 space-y-3">
            {[
              "修改公共商店条目必须输入一次性密码。",
              "密码池刷新后旧密码全部失效。",
              "规则书物品保留独立入口，后续再补批量导入。",
            ].map((bullet) => (
              <div
                key={bullet}
                className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.84)] px-4 py-3 text-sm leading-6 text-[var(--color-ink-700)]"
              >
                {bullet}
              </div>
            ))}
          </div>
        </article>

        <article className="panel rounded-[28px] p-6">
          <div className="mb-4">
            <h3 className="section-title text-2xl font-semibold">商店概览</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              默认商店与基础商品会在首次访问时自动初始化。后续再把条目维护和一次性密码校验接到这里。
            </p>
          </div>

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>商店</th>
                  <th>结算货币</th>
                  <th>商品数</th>
                  <th>维护方式</th>
                </tr>
              </thead>
              <tbody>
                {shops.map((shop) => (
                  <tr key={shop.id}>
                    <td>{shop.name}</td>
                    <td>{shop.currency}</td>
                    <td className="numeric">{shop.items.length}</td>
                    <td>{shop.slug === "rulebook" ? "预留批量导入" : "手动维护"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
