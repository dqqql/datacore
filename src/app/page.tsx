import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SummaryCard } from "@/components/summary-card";
import { TablePreview } from "@/components/table-preview";

const launchChecklist = [
  "账号由管理员创建，中文账号名与显示名保持一致",
  "登录后强制创建首个角色，所有功能围绕当前角色展开",
  "公共物品与私人物品严格分流，避免交易规则混乱",
  "交易、回收、购买链路必须由数据库事务兜底",
];

export default function Home() {
  return (
    <AppShell
      title="西征模式数据管理中心"
      description="首版主流程已经跑通，当前阶段以上线前收尾、手工验收和细节校准为主。"
      badge="MVP Ready"
    >
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <section className="panel rounded-[28px] p-6">
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit rounded-full border border-[var(--border-strong)] bg-[var(--accent-glow)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
              Current Focus
            </span>
            <h2 className="section-title text-4xl font-semibold text-[var(--color-ink-900)]">
              以表格可读性为主的中世纪魔法数据台
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
              风格保持克制，只用羊皮纸、铜金边框和淡淡的法术纹理做氛围，
              不让视觉装饰压过数据本身。当前重点已经从搭骨架转到验收前收尾：
              核对规则、收敛文案、确认交易与后台行为一致。
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <SummaryCard
              title="当前部署路径"
              value="Windows 开发 / Ubuntu 22.04 部署"
              detail="本地开发，推 GitHub，在服务器拉取后通过 Docker 构建。"
            />
            <SummaryCard
              title="密码配置"
              value="独立挂载文件"
              detail="管理员密码不固化在镜像里，方便你在服务器上直接维护。"
            />
            <SummaryCard
              title="交易规则"
              value="整条挂单，不做部分成交"
              detail="私人物品整条上架，整条购买，先把数据一致性收稳。"
            />
            <SummaryCard
              title="回收口径"
              value="按当前商店半价"
              detail="公共物品卖回商店时按当前售价一半计算，避免保存历史成交价。"
            />
          </div>
        </section>

        <section className="panel rounded-[28px] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="section-title text-2xl font-semibold">首版启动清单</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                这几条现在已经定死，后面开发默认按它们展开。
              </p>
            </div>
            <Link
              href="/dashboard"
              className="focus-ring inline-flex rounded-full border border-[var(--border-strong)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(95,66,31,0.22)] hover:bg-[var(--accent-strong)]"
            >
              进入控制台
            </Link>
          </div>

          <ul className="space-y-3">
            {launchChecklist.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3 text-sm leading-6 text-[var(--color-ink-700)]"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6 panel rounded-[28px] p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
            <h3 className="section-title text-2xl font-semibold">当前模块状态</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              这里展示首版关键模块的当前落地情况，方便上线前快速核对。
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
            Readability First
          </span>
        </div>

        <TablePreview
          columns={["模块", "主对象", "关键规则", "当前状态"]}
          rows={[
            ["认证", "User", "管理员创建账号，中文账号名不可改", "已接入登录与角色权限"],
            ["角色", "Character", "首次登录强制创建首角色", "已支持创建、切换、归档与恢复"],
            ["背包", "InventoryItem", "公共与私人分流，私人整条挂单", "已支持真实读写"],
            ["公共商店", "Shop / ShopItem", "按当前售价结算，后台改条目需一次性密码", "已支持购买、回收和后台维护"],
            ["玩家交易", "MarketListing", "自动扣款、自动转移，不支持议价", "已支持上架、下架与自动成交"],
          ]}
        />
      </section>
    </AppShell>
  );
}
