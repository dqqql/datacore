import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SummaryCard } from "@/components/summary-card";
import { TablePreview } from "@/components/table-preview";

const launchChecklist = [
  "账号由管理员创建，账号名与显示名保持一致。",
  "首次登录后需先创建首个角色，后续功能均围绕当前角色展开。",
  "公共物品与私人物品严格分流，避免交易规则混用。",
  "购买、回收与交易链路均由数据库事务保障一致性。",
];

export default function Home() {
  return (
    <AppShell
      title="西征模式数据管理中心"
      description="当前版本已完成主流程闭环，现阶段以正式上线前的文案统一、规则复核与人工验收为主。"
      badge="总览"
    >
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <section className="panel rounded-[28px] p-6">
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit rounded-full border border-[var(--border-strong)] bg-[var(--accent-glow)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
              Current Focus
            </span>
            <h2 className="section-title text-4xl font-semibold text-[var(--color-ink-900)]">
              以数据可读性为先的奇幻世界账簿
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
              视觉风格保持克制，以羊皮纸、铜金边框与轻微法术纹理营造世界观氛围，
              不让装饰遮蔽信息本身。当前重点已从功能搭建转向上线收口，
              包括规则核对、文案统一与交易行为复验。
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <SummaryCard
              title="部署方式"
              value="Windows 开发 / Ubuntu 22.04 部署"
              detail="本地开发、GitHub 同步，服务器侧通过 Docker 完成构建与发布。"
            />
            <SummaryCard
              title="密码策略"
              value="独立挂载文件"
              detail="管理员密码不固化在镜像中，便于在服务器环境中直接维护。"
            />
            <SummaryCard
              title="交易规则"
              value="整单挂售，不支持拆分成交"
              detail="私人物品整条上架、整条购买，以优先保障数据一致性。"
            />
            <SummaryCard
              title="回收规则"
              value="按当前售价半价回收"
              detail="公共物品卖回系统商店时按现行售价的一半结算，不保留历史成交价。"
            />
          </div>
        </section>

        <section className="panel rounded-[28px] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="section-title text-2xl font-semibold">上线前检查清单</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                以下规则已确定，后续开发与验收默认以此为准。
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
            <h3 className="section-title text-2xl font-semibold">核心模块状态</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              这里汇总首版关键模块的落地情况，便于上线前快速复核。
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
            Readability First
          </span>
        </div>

        <TablePreview
          columns={["模块", "核心对象", "关键规则", "当前状态"]}
          rows={[
            ["认证", "User", "账号由管理员创建，当前采用账号密码登录", "已接入登录与角色权限控制"],
            ["角色", "Character", "首次登录需创建首个角色", "已支持创建、切换、归档与恢复"],
            ["背包", "InventoryItem", "公共与私人分流，私人物品支持整单挂售", "已支持真实读写"],
            ["公共商店", "Shop / ShopItem", "按现行售价结算，后台维护需一次性密码", "已支持购买、回收与后台维护"],
            ["玩家交易", "MarketListing", "自动扣款、自动转移，不支持议价", "已支持上架、下架与自动成交"],
          ]}
        />
      </section>
    </AppShell>
  );
}
