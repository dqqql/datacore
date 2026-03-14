"use client";

import { useState, useTransition } from "react";
import type { PlantPlotStatus, SeedElementType } from "@prisma/client";
import {
  Beaker,
  Lock,
  PackageOpen,
  Sparkles,
  Sprout,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import PlotCard from "./PlotCard";
import { harvestPlotAction, plantSeedAction, redeemPlotExpansionAction } from "./actions";
import { plantingElementMeta, plantingElementOrder } from "@/lib/planting";

type PlantingClientBoardProps = {
  currentCharacterName: string;
  initialPlots: Array<{
    id: string;
    index: number;
    status: PlantPlotStatus;
    seedElement: SeedElementType | null;
    plantedAt: Date | string | null;
    maturesAt: Date | string | null;
    harvestedAt: Date | string | null;
  }>;
  inventory: {
    seeds: Record<SeedElementType, number>;
    materials: Record<SeedElementType, number>;
  };
  isExpanded: boolean;
  nextHarvestAt: string | null;
  readyCount: number;
};

function formatDateTime(dateValue: string | null) {
  if (!dateValue) {
    return "暂无成熟中的作物";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

export default function PlantingClientBoard({
  currentCharacterName,
  initialPlots,
  inventory,
  isExpanded,
  nextHarvestAt,
  readyCount,
}: PlantingClientBoardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [otp, setOtp] = useState("");
  const [selectedPlotIndex, setSelectedPlotIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const availableSeedElements = plantingElementOrder.filter((element) => inventory.seeds[element] > 0);

  const totalSeedCount = plantingElementOrder.reduce((sum, element) => sum + inventory.seeds[element], 0);
  const totalMaterialCount = plantingElementOrder.reduce((sum, element) => sum + inventory.materials[element], 0);

  const runAction = (action: () => Promise<{ ok: boolean; message?: string; error?: string }>) => {
    startTransition(async () => {
      const result = await action();

      if (result.ok) {
        setFeedback({ tone: "success", text: result.message ?? "操作成功。" });
        router.refresh();
        return;
      }

      setFeedback({ tone: "danger", text: result.error ?? "操作失败，请稍后重试。" });
    });
  };

  const handleExpand = () => {
    const nextOtp = otp.trim();

    if (!nextOtp) {
      setFeedback({ tone: "danger", text: "请输入地契密码后再尝试扩容。" });
      return;
    }

    runAction(async () => {
      const result = await redeemPlotExpansionAction(nextOtp);

      if (result.ok) {
        setOtp("");
      }

      return result;
    });
  };

  const handlePlant = (element: SeedElementType) => {
    if (selectedPlotIndex === null) {
      return;
    }

    runAction(async () => {
      const result = await plantSeedAction(selectedPlotIndex, element);

      if (result.ok) {
        setSelectedPlotIndex(null);
      }

      return result;
    });
  };

  const handleHarvest = (plotIndex: number) => {
    runAction(() => harvestPlotAction(plotIndex));
  };

  return (
    <section className="grid gap-6">
      <article className="panel-blur p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Guild Greenhouse</p>
            <h3 className="section-title mt-4 flex items-center gap-3 text-3xl font-semibold text-[var(--color-ink-900)]">
              <Sprout className="text-[var(--primary)]" size={30} />
              公会温室地块
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              当前角色 <span className="font-semibold text-[var(--color-ink-900)]">{currentCharacterName}</span>{" "}
              正在管理这片温室。种子会从背包中扣除，成熟后可直接收获为五行材料。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="subtle-card rounded-[22px] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">已成熟</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-ink-900)]">{readyCount} 块</p>
            </div>
            <div className="subtle-card rounded-[22px] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">下一次成熟</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-ink-900)]">
                {formatDateTime(nextHarvestAt)}
              </p>
            </div>
            <div className="subtle-card rounded-[22px] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-700)]">地块规模</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-ink-900)]">{isExpanded ? "4 x 4" : "3 x 3"}</p>
            </div>
          </div>
        </div>

        {feedback ? (
          <div className="mt-5">
            <div className="status-message" data-tone={feedback.tone}>
              {feedback.text}
            </div>
          </div>
        ) : null}
      </article>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <article className="panel-blur p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="section-title text-2xl font-semibold">种植网格</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                空地可播种，成熟格位会自动高亮。种植过程不依赖定时任务，状态按实际时间惰性计算。
              </p>
            </div>
            <span className="pill-label">{initialPlots.length} 块地</span>
          </div>

          <div className={`grid gap-4 transition-all duration-500 ${isExpanded ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3"}`}>
            {initialPlots.map((plot) => (
              <PlotCard
                key={plot.id}
                plot={plot}
                disabled={isPending}
                onPlant={() => {
                  setSelectedPlotIndex(plot.index);
                  setFeedback(null);
                }}
                onHarvest={() => handleHarvest(plot.index)}
              />
            ))}
          </div>
        </article>

        <div className="space-y-6">
          <article className="panel-blur p-6">
            <div className="flex items-center gap-3">
              <PackageOpen className="text-[var(--primary)]" size={24} />
              <div>
                <h3 className="section-title text-2xl font-semibold">温室背包</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">种子与收获材料都会直接读取当前角色背包。</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="subtle-card rounded-[22px] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-700)]">可用种子</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--color-ink-900)]">{totalSeedCount}</p>
              </div>
              <div className="subtle-card rounded-[22px] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-700)]">已收材料</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--color-ink-900)]">{totalMaterialCount}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {plantingElementOrder.map((element) => {
                const meta = plantingElementMeta[element];
                return (
                  <div
                    key={element}
                    className="flex items-center justify-between rounded-[20px] border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-ink-900)]">{meta.seedName}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{meta.materialName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--color-ink-900)]">{inventory.seeds[element]} 枚</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{inventory.materials[element]} 份</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="panel-blur p-6">
            <div className="flex items-center gap-3">
              <Lock className="text-[var(--primary)]" size={22} />
              <div>
                <h3 className="section-title text-2xl font-semibold">地块扩容</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  使用密码池中的地契密码，可将基础 3 x 3 地块扩展到 4 x 4。
                </p>
              </div>
            </div>

            {isExpanded ? (
              <div className="status-message mt-5" data-tone="success">
                当前角色已经完成扩容，不需要再次输入密码。
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <label className="field-label" htmlFor="planting-otp">
                  地契密码
                </label>
                <input
                  id="planting-otp"
                  type="text"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="输入一次性地契密码"
                  className="focus-ring field-input"
                />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleExpand}
                  className="focus-ring btn-secondary w-full"
                >
                  {isPending ? "处理中..." : "扩容温室"}
                </button>
              </div>
            )}

            <div className="mt-5 rounded-[20px] border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              扩容会立即消耗密码，并为当前角色补齐第 10 至 16 号地块。每个角色只需扩容一次。
            </div>
          </article>

          <article className="panel-blur p-6">
            <div className="flex items-center gap-3">
              <Beaker className="text-[var(--primary)]" size={22} />
              <div>
                <h3 className="section-title text-2xl font-semibold">使用提醒</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">种植模块优先保证数据可读性与闭环，不依赖后台定时任务。</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm leading-6 text-[var(--muted)]">
              <div className="rounded-[20px] border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
                先去公会商店购买五行种子，再回到这里点击空地播种。
              </div>
              <div className="rounded-[20px] border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
                收获得到的五行材料会写入背包，并在角色页以“种植”相关物品展示。
              </div>
              <div className="rounded-[20px] border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3">
                如果地块刚好成熟但页面未刷新，重新打开本页或点击收获即可完成惰性结算。
              </div>
            </div>
          </article>
        </div>
      </div>

      {selectedPlotIndex !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3e2723]/40 px-4 backdrop-blur-sm">
          <div className="panel-blur relative w-full max-w-lg p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedPlotIndex(null)}
              className="focus-ring absolute right-4 top-4 rounded-full border border-[var(--border-soft)] bg-white/80 p-2 text-[var(--text-muted)]"
              aria-label="关闭播种弹窗"
            >
              <X size={18} />
            </button>

            <div className="mb-6">
              <p className="eyebrow">Plot {selectedPlotIndex + 1}</p>
              <h3 className="section-title mt-3 text-2xl font-semibold text-[var(--color-ink-900)]">选择要播种的种子</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                选择后会立即从当前角色背包扣除 1 枚对应种子，并开始 7 天成熟倒计时。
              </p>
            </div>

            {availableSeedElements.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {availableSeedElements.map((element) => {
                  const meta = plantingElementMeta[element];
                  return (
                    <button
                      key={element}
                      type="button"
                      disabled={isPending}
                      onClick={() => handlePlant(element)}
                      className="focus-ring rounded-[22px] border border-[var(--border-soft)] bg-[rgba(255,250,241,0.9)] px-4 py-4 text-left transition hover:border-[var(--border-strong)] hover:bg-[rgba(255,252,246,0.98)]"
                    >
                      <div className="flex flex-nowrap items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold text-[var(--color-ink-900)]">{meta.seedName}</p>
                          <p className="mt-1 text-sm text-[var(--muted)]">播下后成熟为 {meta.materialName}</p>
                        </div>
                        <span className="shrink-0 whitespace-nowrap rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                          {inventory.seeds[element]} 枚
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[22px] border border-dashed border-[var(--border-soft)] px-4 py-10 text-center">
                <Sparkles className="mx-auto text-[var(--text-muted)]" size={28} />
                <p className="mt-3 text-sm font-semibold text-[var(--color-ink-900)]">当前背包没有可播种的五行种子</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  先去公会商店购入种子，再回来开始播种。
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
