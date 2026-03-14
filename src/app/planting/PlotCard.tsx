"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { PlantPlotStatus, SeedElementType } from "@prisma/client";
import {
  CheckCircle2,
  Coins,
  Droplets,
  Flame,
  Leaf,
  Mountain,
  Sprout,
  Timer,
} from "lucide-react";
import { plantingElementMeta } from "@/lib/planting";

type PlotCardProps = {
  plot: {
    id: string;
    index: number;
    status: PlantPlotStatus;
    seedElement: SeedElementType | null;
    plantedAt: Date | string | null;
    maturesAt: Date | string | null;
  };
  onPlant: () => void;
  onHarvest: () => void;
  disabled?: boolean;
};

const ELEMENTS_UI = {
  WOOD: { color: "text-green-700", bg: "bg-green-100/90", border: "border-green-300", icon: Leaf },
  FIRE: { color: "text-red-600", bg: "bg-red-100/90", border: "border-red-300", icon: Flame },
  EARTH: { color: "text-amber-700", bg: "bg-amber-100/90", border: "border-amber-300", icon: Mountain },
  METAL: { color: "text-slate-600", bg: "bg-slate-100/90", border: "border-slate-300", icon: Coins },
  WATER: { color: "text-blue-600", bg: "bg-blue-100/90", border: "border-blue-300", icon: Droplets },
} satisfies Record<
  SeedElementType,
  {
    color: string;
    bg: string;
    border: string;
    icon: ComponentType<{ className?: string; size?: number }>;
  }
>;

function formatTimeLeft(dateValue: Date | string | null) {
  if (!dateValue) {
    return "";
  }

  const remaining = new Date(dateValue).getTime() - Date.now();

  if (remaining <= 0) {
    return "已成熟";
  }

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((remaining / (1000 * 60)) % 60);

  if (days > 0) {
    return `${days} 天 ${hours} 小时`;
  }

  if (hours > 0) {
    return `${hours} 小时 ${minutes} 分`;
  }

  return `${Math.max(1, minutes)} 分`;
}

export default function PlotCard({ plot, onPlant, onHarvest, disabled = false }: PlotCardProps) {
  const [timeLeft, setTimeLeft] = useState(() => formatTimeLeft(plot.maturesAt));
  const isEmpty = plot.status === "EMPTY" || plot.status === "HARVESTED";
  const isGrowing = plot.status === "GROWING";
  const isReady = plot.status === "READY";
  const ui = plot.seedElement ? ELEMENTS_UI[plot.seedElement] : null;
  const elementLabel = plot.seedElement ? plantingElementMeta[plot.seedElement].label : null;

  useEffect(() => {
    if (!isGrowing || !plot.maturesAt) {
      return;
    }

    const updateTimeLeft = () => {
      setTimeLeft(formatTimeLeft(plot.maturesAt));
    };

    updateTimeLeft();
    const timer = window.setInterval(updateTimeLeft, 1000);
    return () => window.clearInterval(timer);
  }, [isGrowing, plot.maturesAt]);

  return (
    <button
      type="button"
      disabled={disabled || isGrowing}
      onClick={isReady ? onHarvest : onPlant}
      className={`focus-ring relative aspect-square w-full overflow-hidden rounded-[24px] border-2 transition-all duration-300 ${
        isEmpty
          ? "border-dashed border-[var(--card-border)] bg-[rgba(62,39,35,0.03)] hover:bg-[rgba(62,39,35,0.06)]"
          : isGrowing
            ? `border-solid ${ui?.border} bg-white/60 shadow-inner`
            : `cursor-pointer border-solid ${ui?.border} bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)] hover:scale-[1.02]`
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      aria-label={`第 ${plot.index + 1} 块地`}
    >
      <div className="absolute left-3 top-3 rounded-full border border-[var(--card-border)] bg-white/65 px-2 py-1 text-[11px] font-semibold tracking-[0.14em] text-[var(--text-muted)]">
        {plot.index + 1} 号地
      </div>

      {!isEmpty && elementLabel ? (
        <div className="absolute right-3 top-3 rounded-full border border-[var(--card-border)] bg-white/75 px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-[var(--foreground)]">
          {elementLabel} 元素
        </div>
      ) : null}

      {!isEmpty && ui ? (
        <ui.icon className={`absolute inset-0 m-auto h-3/4 w-3/4 opacity-[0.06] ${ui.color}`} />
      ) : null}

      {isEmpty ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
          <div className="rounded-full bg-white/70 p-4 shadow-sm">
            <Sprout size={32} />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-sm font-semibold text-[var(--foreground)]">空闲地块</p>
            <p className="text-xs text-[var(--text-muted)]">点击后选择一枚种子播下</p>
          </div>
        </div>
      ) : null}

      {isGrowing && ui ? (
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <div className={`rounded-full p-4 shadow-sm ${ui.bg} ${ui.color}`}>
            <ui.icon size={36} />
          </div>
          <p className="text-sm font-semibold tracking-[0.14em] text-[var(--foreground)]">
            {elementLabel}系培育中
          </p>
          <div className="rounded-full border border-[var(--card-border)] bg-white/85 px-3 py-1 text-sm font-medium text-[var(--foreground)] shadow-sm">
            <span className="inline-flex items-center gap-2">
              <Timer size={14} className="text-[var(--text-muted)]" />
              {timeLeft}
            </span>
          </div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--text-muted)]">
            培育中
          </p>
        </div>
      ) : null}

      {isReady && ui ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-transparent to-[var(--card-bg)]">
          <div className={`bounce-subtle relative rounded-full p-4 shadow-md ${ui.bg} ${ui.color}`}>
            <CheckCircle2
              size={28}
              className="absolute -right-1 -top-1 rounded-full bg-white text-green-600"
            />
            <ui.icon size={36} />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-base font-bold tracking-[0.18em] text-[var(--foreground)]">点击收获</p>
            <p className="text-xs text-[var(--text-muted)]">成熟的五行材料会直接写入背包</p>
          </div>
          <div
            className="absolute inset-0 rounded-[24px] border-4 border-white opacity-50 animate-ping"
            style={{ animationDuration: "3s" }}
          />
        </div>
      ) : null}
    </button>
  );
}
