"use server";

import { PlantPlotStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requirePlayerCharacter } from "@/lib/auth-helpers";
import {
  BASE_PLOT_COUNT,
  EXPANDED_PLOT_COUNT,
  SEED_GROWTH_MS,
  ensurePlantingPlots,
  getMaterialName,
  getSeedName,
} from "@/lib/planting";
import { prisma } from "@/lib/prisma";
import { harvestPlotSchema, plantSeedSchema, redeemPlotExpansionSchema } from "@/lib/schemas";

type PlantingActionResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      error: string;
    };

class PlantingActionError extends Error {}

function revalidatePlantingPaths(characterId: string) {
  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/planting");
  revalidatePath(`/characters/${characterId}`);
}

async function requireCurrentCharacterContext() {
  const context = await requirePlayerCharacter();
  const character = context.currentCharacter;

  if (!character) {
    throw new PlantingActionError("请先切换到一个可用角色，再进入种植系统。");
  }

  return {
    ...context,
    currentCharacter: character,
  };
}

export async function redeemPlotExpansionAction(otpCode: string): Promise<PlantingActionResult> {
  try {
    const context = await requireCurrentCharacterContext();
    const character = context.currentCharacter;
    const requiresOtp = context.session.user.role !== "ADMIN";

    if (requiresOtp) {
      const parsed = redeemPlotExpansionSchema.safeParse({ otpCode });

      if (!parsed.success) {
        return { ok: false, error: "请输入有效的地契密码。" };
      }
    }

    await ensurePlantingPlots(character.id);

    await prisma.$transaction(async (tx) => {
      const existingExpandedPlots = await tx.plantPlot.count({
        where: {
          characterId: character.id,
          index: {
            gte: BASE_PLOT_COUNT,
          },
        },
      });

      if (existingExpandedPlots > 0) {
        throw new PlantingActionError("当前角色的地块已经扩容完成。");
      }

      const otp = requiresOtp
        ? await tx.oneTimePassword.findFirst({
            where: {
              code: otpCode.trim(),
              isUsed: false,
              pool: {
                isActive: true,
              },
            },
          })
        : null;

      if (requiresOtp && !otp) {
        throw new PlantingActionError("地契密码无效，或已经被使用。");
      }

      const expansionIndexes = Array.from(
        { length: EXPANDED_PLOT_COUNT - BASE_PLOT_COUNT },
        (_, offset) => BASE_PLOT_COUNT + offset,
      );

      if (otp) {
        await tx.oneTimePassword.update({
          where: { id: otp.id },
          data: {
            isUsed: true,
            usedAt: new Date(),
            usedByCharacterId: character.id,
            usageNote: "种植地块扩容至 4x4",
          },
        });
      }

      await tx.plantPlot.createMany({
        data: expansionIndexes.map((index) => ({
          characterId: character.id,
          index,
          status: PlantPlotStatus.EMPTY,
        })),
      });

      await tx.auditLog.create({
        data: {
          actorUserId: character.userId,
          targetUserId: character.userId,
          targetCharacterId: character.id,
          action: "PLANTING_PLOT_EXPANDED",
          entityType: "PlantPlot",
          entityId: otp?.id ?? character.id,
          afterValue: JSON.stringify({
            plotCount: EXPANDED_PLOT_COUNT,
            otpCode: otp?.code ?? null,
            expandedBy: requiresOtp ? "otp" : "admin-direct",
          }),
          note: requiresOtp ? `使用地契密码扩容地块：${otpCode.trim()}` : "管理员直接扩容地块",
        },
      });
    });

    revalidatePlantingPaths(character.id);
    return { ok: true, message: "地块已扩容到 4 x 4，新的温室格位已解锁。" };
  } catch (error) {
    if (error instanceof PlantingActionError) {
      return { ok: false, error: error.message };
    }

    return { ok: false, error: "扩容失败，请稍后重试。" };
  }
}

export async function plantSeedAction(plotIndex: number, element: string): Promise<PlantingActionResult> {
  const parsed = plantSeedSchema.safeParse({ plotIndex, element });

  if (!parsed.success) {
    return { ok: false, error: "播种参数无效，请重新选择地块和种子。" };
  }

  try {
    const context = await requireCurrentCharacterContext();
    const character = context.currentCharacter;
    await ensurePlantingPlots(character.id);

    await prisma.$transaction(async (tx) => {
      const plot = await tx.plantPlot.findUnique({
        where: {
          characterId_index: {
            characterId: character.id,
            index: parsed.data.plotIndex,
          },
        },
      });

      if (!plot) {
        throw new PlantingActionError("目标地块不存在。");
      }

      if (plot.status !== PlantPlotStatus.EMPTY && plot.status !== PlantPlotStatus.HARVESTED) {
        throw new PlantingActionError("该地块当前无法播种，请先等待其变为空地。");
      }

      const seedName = getSeedName(parsed.data.element);
      const seedItem = await tx.inventoryItem.findFirst({
        where: {
          characterId: character.id,
          name: seedName,
          isListed: false,
          quantity: {
            gte: 1,
          },
        },
      });

      if (!seedItem) {
        throw new PlantingActionError(`当前角色背包中没有“${seedName}”。`);
      }

      const consumed = await tx.inventoryItem.updateMany({
        where: {
          id: seedItem.id,
          isListed: false,
          quantity: {
            gte: 1,
          },
        },
        data: {
          quantity: {
            decrement: 1,
          },
        },
      });

      if (consumed.count !== 1) {
        throw new PlantingActionError(`“${seedName}”已被其他操作占用，请刷新后重试。`);
      }

      const now = new Date();

      await tx.plantPlot.update({
        where: { id: plot.id },
        data: {
          status: PlantPlotStatus.GROWING,
          seedElement: parsed.data.element,
          plantedAt: now,
          maturesAt: new Date(now.getTime() + SEED_GROWTH_MS),
          harvestedAt: null,
        },
      });

      await tx.inventoryItem.deleteMany({
        where: {
          id: seedItem.id,
          quantity: {
            lte: 0,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: character.userId,
          targetUserId: character.userId,
          targetCharacterId: character.id,
          action: "PLANTING_SEED_PLANTED",
          entityType: "PlantPlot",
          entityId: plot.id,
          afterValue: JSON.stringify({
            plotIndex: parsed.data.plotIndex,
            element: parsed.data.element,
            maturesAt: new Date(now.getTime() + SEED_GROWTH_MS).toISOString(),
          }),
          note: `在 ${parsed.data.plotIndex + 1} 号地块播种：${seedName}`,
        },
      });
    });

    revalidatePlantingPaths(character.id);
    return { ok: true, message: "播种完成，温室已开始培养新的元素材料。" };
  } catch (error) {
    if (error instanceof PlantingActionError) {
      return { ok: false, error: error.message };
    }

    return { ok: false, error: "播种失败，请稍后重试。" };
  }
}

export async function harvestPlotAction(plotIndex: number): Promise<PlantingActionResult> {
  const parsed = harvestPlotSchema.safeParse({ plotIndex });

  if (!parsed.success) {
    return { ok: false, error: "收获参数无效，请刷新页面后重试。" };
  }

  try {
    const context = await requireCurrentCharacterContext();
    const character = context.currentCharacter;
    await ensurePlantingPlots(character.id);

    await prisma.$transaction(async (tx) => {
      const plot = await tx.plantPlot.findUnique({
        where: {
          characterId_index: {
            characterId: character.id,
            index: parsed.data.plotIndex,
          },
        },
      });

      if (!plot || !plot.seedElement) {
        throw new PlantingActionError("该地块当前没有可收获的作物。");
      }

      const isReady =
        plot.status === PlantPlotStatus.READY ||
        (plot.status === PlantPlotStatus.GROWING &&
          plot.maturesAt !== null &&
          plot.maturesAt <= new Date());

      if (!isReady) {
        throw new PlantingActionError("作物尚未成熟，请稍后再来收获。");
      }

      const materialName = getMaterialName(plot.seedElement);
      const existingMaterial = await tx.inventoryItem.findFirst({
        where: {
          characterId: character.id,
          ownershipType: "PRIVATE",
          name: materialName,
          isListed: false,
        },
      });

      if (existingMaterial) {
        await tx.inventoryItem.update({
          where: { id: existingMaterial.id },
          data: {
            quantity: {
              increment: 1,
            },
          },
        });
      } else {
        await tx.inventoryItem.create({
          data: {
            characterId: character.id,
            name: materialName,
            description: "由公会温室培育产出的五行材料，可用于后续炼金与配方。",
            quantity: 1,
            unitPrice: 0,
            ownershipType: "PRIVATE",
          },
        });
      }

      await tx.plantPlot.update({
        where: { id: plot.id },
        data: {
          status: PlantPlotStatus.EMPTY,
          seedElement: null,
          plantedAt: null,
          maturesAt: null,
          harvestedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: character.userId,
          targetUserId: character.userId,
          targetCharacterId: character.id,
          action: "PLANTING_SEED_HARVESTED",
          entityType: "PlantPlot",
          entityId: plot.id,
          afterValue: JSON.stringify({
            plotIndex: parsed.data.plotIndex,
            element: plot.seedElement,
            materialName,
            quantity: 1,
          }),
          note: `收获 ${parsed.data.plotIndex + 1} 号地块，获得：${materialName}`,
        },
      });
    });

    revalidatePlantingPaths(character.id);
    return { ok: true, message: "收获成功，材料已放入当前角色背包。" };
  } catch (error) {
    if (error instanceof PlantingActionError) {
      return { ok: false, error: error.message };
    }

    return { ok: false, error: "收获失败，请稍后重试。" };
  }
}
