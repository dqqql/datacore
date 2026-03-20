"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { roundHonorValue } from "@/lib/honor";
import { prisma } from "@/lib/prisma";
import { purchaseShopItemSchema, sellbackInventoryItemSchema } from "@/lib/schemas";
import { ensureDefaultShops } from "@/lib/bootstrap-shops";

function buildRedirect(pathname: string, key: string, value: string) {
  const searchParams = new URLSearchParams({ [key]: value });
  return `${pathname}?${searchParams.toString()}`;
}

function getShopPathFromSlug(shopSlug: string) {
  if (shopSlug === "honor") {
    return "/shops/honor";
  }

  return "/shops/guild";
}

class ShopActionError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

export async function purchaseShopItemAction(formData: FormData) {
  const session = await requireSession();
  await ensureDefaultShops();

  const fallbackPath = String(formData.get("shopPath") ?? "/shops/guild");
  const parsed = purchaseShopItemSchema.safeParse({
    characterId: formData.get("characterId"),
    shopItemId: formData.get("shopItemId"),
    quantity: formData.get("quantity"),
  });

  if (!parsed.success) {
    redirect(buildRedirect(fallbackPath, "shopError", "invalid-purchase"));
  }

  const [character, shopItem, user] = await Promise.all([
    prisma.character.findFirst({
      where: {
        id: parsed.data.characterId,
        userId: session.user.id,
        status: "ACTIVE",
      },
    }),
    prisma.shopItem.findUnique({
      where: {
        id: parsed.data.shopItemId,
      },
      include: {
        shop: true,
      },
    }),
    prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
    }),
  ]);

  if (!character || !shopItem || !shopItem.isActive || !user) {
    redirect(buildRedirect(fallbackPath, "shopError", "purchase-unavailable"));
  }

  const totalCost = shopItem.price * parsed.data.quantity;
  const shopPath = getShopPathFromSlug(shopItem.shop.slug);

  if (shopItem.shop.currency === "GOLD" && character.gold < totalCost) {
    redirect(buildRedirect(shopPath, "shopError", "insufficient-gold"));
  }

  if (shopItem.shop.currency === "HONOR" && user.honor < totalCost) {
    redirect(buildRedirect(shopPath, "shopError", "insufficient-honor"));
  }

  try {
    await prisma.$transaction(async (tx) => {
      const latestShopItem = await tx.shopItem.findUnique({
        where: { id: shopItem.id },
        include: { shop: true },
      });

      if (!latestShopItem || !latestShopItem.isActive) {
        throw new ShopActionError("purchase-unavailable");
      }

      const latestTotalCost = latestShopItem.price * parsed.data.quantity;
      const existingInventoryItem = await tx.inventoryItem.findFirst({
        where: {
          characterId: character.id,
          ownershipType: "PUBLIC",
          sourceShopItemId: latestShopItem.id,
          isListed: false,
        },
      });

      if (latestShopItem.shop.currency === "GOLD") {
        const updatedCharacter = await tx.character.updateMany({
          where: {
            id: character.id,
            userId: session.user.id,
            status: "ACTIVE",
            gold: {
              gte: latestTotalCost,
            },
          },
          data: {
            gold: {
              decrement: latestTotalCost,
            },
          },
        });

        if (updatedCharacter.count !== 1) {
          throw new ShopActionError("insufficient-gold");
        }
      } else {
        const latestUser = await tx.user.findUnique({
          where: { id: user.id },
          select: { honor: true },
        });

        if (!latestUser) {
          throw new ShopActionError("purchase-unavailable");
        }

        const nextHonor = roundHonorValue(latestUser.honor - latestTotalCost);

        if (nextHonor < 0) {
          throw new ShopActionError("insufficient-honor");
        }

        const updatedUser = await tx.user.updateMany({
          where: {
            id: user.id,
            honor: {
              gte: latestTotalCost,
            },
          },
          data: {
            honor: nextHonor,
          },
        });

        if (updatedUser.count !== 1) {
          throw new ShopActionError("insufficient-honor");
        }
      }

      if (existingInventoryItem) {
        await tx.inventoryItem.update({
          where: { id: existingInventoryItem.id },
          data: {
            quantity: {
              increment: parsed.data.quantity,
            },
            unitPrice: latestShopItem.price,
            description: latestShopItem.description,
          },
        });
      } else {
        await tx.inventoryItem.create({
          data: {
            characterId: character.id,
            name: latestShopItem.name,
            description: latestShopItem.description,
            quantity: parsed.data.quantity,
            unitPrice: latestShopItem.price,
            ownershipType: "PUBLIC",
            sourceShopItemId: latestShopItem.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: session.user.id,
          targetUserId: session.user.id,
          targetCharacterId: character.id,
          action: "SHOP_PURCHASED",
          entityType: "ShopItem",
          entityId: latestShopItem.id,
          beforeValue: null,
          afterValue: JSON.stringify({
            shop: latestShopItem.shop.slug,
            quantity: parsed.data.quantity,
            totalCost: latestTotalCost,
            currency: latestShopItem.shop.currency,
          }),
          note: `商店购入公共物品：${latestShopItem.name}`,
        },
      });
    });
  } catch (error) {
    if (error instanceof ShopActionError) {
      if (error.code === "purchase-unavailable") {
        redirect(buildRedirect(shopPath, "shopError", "purchase-unavailable"));
      }

      if (error.code === "insufficient-gold") {
        redirect(buildRedirect(shopPath, "shopError", "insufficient-gold"));
      }

      if (error.code === "insufficient-honor") {
        redirect(buildRedirect(shopPath, "shopError", "insufficient-honor"));
      }
    }

    throw error;
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath(`/characters/${character.id}`);
  revalidatePath(shopPath);
  redirect(buildRedirect(shopPath, "shopSuccess", "purchase-completed"));
}

export async function sellbackInventoryItemAction(formData: FormData) {
  const session = await requireSession();
  await ensureDefaultShops();

  const fallbackCharacterId = String(formData.get("characterId") ?? "").trim();
  const parsed = sellbackInventoryItemSchema.safeParse({
    characterId: formData.get("characterId"),
    inventoryItemId: formData.get("inventoryItemId"),
    quantity: formData.get("quantity"),
  });

  if (!parsed.success) {
    if (fallbackCharacterId) {
      redirect(buildRedirect(`/characters/${fallbackCharacterId}`, "sellbackError", "invalid-sellback"));
    }

    redirect("/characters?error=invalid-sellback");
  }

  const inventoryItem = await prisma.inventoryItem.findFirst({
    where: {
      id: parsed.data.inventoryItemId,
      characterId: parsed.data.characterId,
      ownershipType: "PUBLIC",
      character: {
        userId: session.user.id,
        status: "ACTIVE",
      },
    },
    include: {
      character: true,
      sourceShopItem: {
        include: {
          shop: true,
        },
      },
    },
  });

  if (!inventoryItem || !inventoryItem.sourceShopItem || inventoryItem.isListed) {
    redirect(buildRedirect(`/characters/${parsed.data.characterId}`, "sellbackError", "sellback-unavailable"));
  }

  const sourceShopItem = inventoryItem.sourceShopItem;

  if (parsed.data.quantity > inventoryItem.quantity) {
    redirect(buildRedirect(`/characters/${parsed.data.characterId}`, "sellbackError", "sellback-too-many"));
  }

  const refundPerUnit = Math.floor(sourceShopItem.price / 2);
  const refundTotal = refundPerUnit * parsed.data.quantity;

  try {
    await prisma.$transaction(async (tx) => {
      if (parsed.data.quantity === inventoryItem.quantity) {
        const deletedItem = await tx.inventoryItem.deleteMany({
          where: {
            id: inventoryItem.id,
            characterId: inventoryItem.characterId,
            ownershipType: "PUBLIC",
            isListed: false,
            quantity: parsed.data.quantity,
          },
        });

        if (deletedItem.count !== 1) {
          throw new ShopActionError("sellback-unavailable");
        }
      } else {
        const updatedItem = await tx.inventoryItem.updateMany({
          where: {
            id: inventoryItem.id,
            characterId: inventoryItem.characterId,
            ownershipType: "PUBLIC",
            isListed: false,
            quantity: {
              gte: parsed.data.quantity,
            },
          },
          data: {
            quantity: {
              decrement: parsed.data.quantity,
            },
          },
        });

        if (updatedItem.count !== 1) {
          throw new ShopActionError("sellback-unavailable");
        }
      }

      if (sourceShopItem.shop.currency === "GOLD") {
        await tx.character.update({
          where: { id: inventoryItem.characterId },
          data: {
            gold: {
              increment: refundTotal,
            },
          },
        });
      } else {
        const latestUser = await tx.user.findUnique({
          where: { id: session.user.id },
          select: { honor: true },
        });

        if (!latestUser) {
          throw new ShopActionError("sellback-unavailable");
        }

        await tx.user.update({
          where: { id: session.user.id },
          data: {
            honor: roundHonorValue(latestUser.honor + refundTotal),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: session.user.id,
          targetUserId: session.user.id,
          targetCharacterId: inventoryItem.characterId,
          action: "SHOP_SELLBACK",
          entityType: "InventoryItem",
          entityId: inventoryItem.id,
          beforeValue: JSON.stringify({
            quantity: inventoryItem.quantity,
            unitPrice: sourceShopItem.price,
          }),
          afterValue: JSON.stringify({
            refundedQuantity: parsed.data.quantity,
            refundTotal,
            currency: sourceShopItem.shop.currency,
          }),
          note: `商店半价回收公共物品：${inventoryItem.name}`,
        },
      });
    });
  } catch (error) {
    if (error instanceof ShopActionError && error.code === "sellback-unavailable") {
      redirect(buildRedirect(`/characters/${parsed.data.characterId}`, "sellbackError", "sellback-unavailable"));
    }

    throw error;
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath(`/characters/${inventoryItem.characterId}`);
  revalidatePath(getShopPathFromSlug(sourceShopItem.shop.slug));
  redirect(buildRedirect(`/characters/${inventoryItem.characterId}`, "sellbackSuccess", "sellback-completed"));
}
