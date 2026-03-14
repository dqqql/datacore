import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requirePlayerCharacter } from "@/lib/auth-helpers";
import {
  BASE_PLOT_COUNT,
  buildSeedInventorySummary,
  createEmptySeedCounts,
  ensurePlantingPlots,
  getMaterialName,
  getSeedName,
  markReadyPlots,
  plantingElementOrder,
} from "@/lib/planting";
import { prisma } from "@/lib/prisma";
import { ensureDefaultShops } from "@/lib/bootstrap-shops";
import PlantingClientBoard from "./PlantingClientBoard";

export const dynamic = "force-dynamic";

function buildMaterialSummary(items: Array<{ name: string; quantity: number }>) {
  const counts = createEmptySeedCounts();

  for (const item of items) {
    const element = plantingElementOrder.find((current) => getMaterialName(current) === item.name);

    if (element) {
      counts[element] += item.quantity;
    }
  }

  return counts;
}

export default async function PlantingPage() {
  await ensureDefaultShops();
  const { currentCharacter } = await requirePlayerCharacter();

  if (!currentCharacter) {
    return (
      <AppShell
        title="种植系统"
        description="请先选择一个角色，再进入公会温室进行播种与收获。"
        badge="种植"
      >
        <section className="panel rounded-[28px] p-6">
          <h3 className="section-title text-2xl font-semibold">当前没有可用角色</h3>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            种植系统与当前角色的背包、地块和审计记录绑定。先去角色页创建或切换角色，再回来继续。
          </p>
          <Link href="/characters" className="focus-ring btn-primary mt-5">
            前往角色卡册
          </Link>
        </section>
      </AppShell>
    );
  }

  await ensurePlantingPlots(currentCharacter.id);

  const [plots, inventoryItems] = await Promise.all([
    prisma.plantPlot.findMany({
      where: { characterId: currentCharacter.id },
      orderBy: { index: "asc" },
    }),
    prisma.inventoryItem.findMany({
      where: {
        characterId: currentCharacter.id,
        OR: [
          {
            name: {
              in: plantingElementOrder.map((element) => getSeedName(element)),
            },
          },
          {
            name: {
              in: plantingElementOrder.map((element) => getMaterialName(element)),
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        quantity: true,
      },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const processedPlots = markReadyPlots(plots);
  const seeds = buildSeedInventorySummary(inventoryItems);
  const materials = buildMaterialSummary(inventoryItems);
  const isExpanded = plots.length > BASE_PLOT_COUNT;
  const nextHarvestAt =
    processedPlots
      .filter((plot) => plot.status === "GROWING" && plot.maturesAt)
      .sort((left, right) => (left.maturesAt?.getTime() ?? 0) - (right.maturesAt?.getTime() ?? 0))[0]
      ?.maturesAt ?? null;
  const readyCount = processedPlots.filter((plot) => plot.status === "READY").length;

  return (
    <AppShell
      title={`公会温室 · ${currentCharacter.name}`}
      description="在这里管理当前角色的温室地块。种子会从背包中扣除，成熟后可直接收获为五行材料。"
      badge="种植"
    >
      <PlantingClientBoard
        currentCharacterName={currentCharacter.name}
        initialPlots={processedPlots}
        inventory={{ seeds, materials }}
        isExpanded={isExpanded}
        nextHarvestAt={nextHarvestAt ? nextHarvestAt.toISOString() : null}
        readyCount={readyCount}
      />
    </AppShell>
  );
}
