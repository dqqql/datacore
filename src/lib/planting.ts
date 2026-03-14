import { PlantPlotStatus, SeedElementType, type PlantPlot, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const BASE_PLOT_COUNT = 9;
export const EXPANDED_PLOT_COUNT = 16;
export const SEED_GROWTH_MS = 7 * 24 * 60 * 60 * 1000;

export const plantingElementOrder = [
  SeedElementType.WOOD,
  SeedElementType.FIRE,
  SeedElementType.EARTH,
  SeedElementType.METAL,
  SeedElementType.WATER,
] as const;

export const plantingElementMeta: Record<
  SeedElementType,
  {
    label: string;
    seedName: string;
    materialName: string;
    color: string;
  }
> = {
  WOOD: {
    label: "木",
    seedName: "五行种子·木",
    materialName: "五行材料·木",
    color: "var(--el-wood)",
  },
  FIRE: {
    label: "火",
    seedName: "五行种子·火",
    materialName: "五行材料·火",
    color: "var(--el-fire)",
  },
  EARTH: {
    label: "土",
    seedName: "五行种子·土",
    materialName: "五行材料·土",
    color: "var(--el-earth)",
  },
  METAL: {
    label: "金",
    seedName: "五行种子·金",
    materialName: "五行材料·金",
    color: "var(--el-metal)",
  },
  WATER: {
    label: "水",
    seedName: "五行种子·水",
    materialName: "五行材料·水",
    color: "var(--el-water)",
  },
};

export type PlantingSeedCounts = Record<SeedElementType, number>;

export function createEmptySeedCounts(): PlantingSeedCounts {
  return plantingElementOrder.reduce(
    (acc, element) => {
      acc[element] = 0;
      return acc;
    },
    {} as PlantingSeedCounts,
  );
}

export function getSeedName(element: SeedElementType) {
  return plantingElementMeta[element].seedName;
}

export function getMaterialName(element: SeedElementType) {
  return plantingElementMeta[element].materialName;
}

export function isPlantingSeedName(name: string) {
  return plantingElementOrder.some((element) => plantingElementMeta[element].seedName === name);
}

export function isPlantingMaterialName(name: string) {
  return plantingElementOrder.some((element) => plantingElementMeta[element].materialName === name);
}

export function getSeedElementFromName(name: string) {
  return plantingElementOrder.find((element) => plantingElementMeta[element].seedName === name) ?? null;
}

export function buildSeedInventorySummary(
  items: Array<Pick<Prisma.InventoryItemGetPayload<object>, "name" | "quantity">>,
) {
  const counts = createEmptySeedCounts();

  for (const item of items) {
    const element = getSeedElementFromName(item.name);

    if (element) {
      counts[element] += item.quantity;
    }
  }

  return counts;
}

export async function ensurePlantingPlots(characterId: string) {
  const existingPlots = await prisma.plantPlot.findMany({
    where: { characterId },
    select: { index: true },
  });

  const missingBaseIndexes = Array.from({ length: BASE_PLOT_COUNT }, (_, index) => index).filter(
    (index) => !existingPlots.some((plot) => plot.index === index),
  );

  if (missingBaseIndexes.length === 0) {
    return;
  }

  await prisma.plantPlot.createMany({
    data: missingBaseIndexes.map((index) => ({
      characterId,
      index,
      status: PlantPlotStatus.EMPTY,
    })),
  });
}

export function markReadyPlots<T extends Pick<PlantPlot, "status" | "maturesAt">>(plots: T[]) {
  const now = new Date();

  return plots.map((plot) => {
    if (plot.status === PlantPlotStatus.GROWING && plot.maturesAt && plot.maturesAt <= now) {
      return { ...plot, status: PlantPlotStatus.READY as PlantPlotStatus };
    }

    return plot;
  });
}
