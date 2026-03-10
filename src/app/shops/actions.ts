"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { purchaseShopItemSchema, sellbackInventoryItemSchema } from "@/lib/schemas";
import { ensureDefaultShops } from "@/lib/bootstrap-shops";

function buildRedirect(pathname: string, key: string, value: string) {
  const searchParams = new URLSearchParams({ [key]: value });
  return `${pathname}?${searchParams.toString()}`;
}

function getShopPathFromSlug(shopSlug: string) {
  if (shopSlug === "guild") {
    return "/shops/guild";
  }

  if (shopSlug === "honor") {
    return "/shops/honor";
  }

  return "/shops/rulebook";
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

  await prisma.$transaction(async (tx) => {
    const existingInventoryItem = await tx.inventoryItem.findFirst({
      where: {
        characterId: character.id,
        ownershipType: "PUBLIC",
        sourceShopItemId: shopItem.id,
        isListed: false,
      },
    });

    if (shopItem.shop.currency === "GOLD") {
      await tx.character.update({
        where: { id: character.id },
        data: {
          gold: {
            decrement: totalCost,
          },
        },
      });
    } else {
      await tx.user.update({
        where: { id: user.id },
        data: {
          honor: {
            decrement: totalCost,
          },
        },
      });
    }

    if (existingInventoryItem) {
      await tx.inventoryItem.update({
        where: { id: existingInventoryItem.id },
        data: {
          quantity: {
            increment: parsed.data.quantity,
          },
          unitPrice: shopItem.price,
          description: shopItem.description,
        },
      });
    } else {
      await tx.inventoryItem.create({
        data: {
          characterId: character.id,
          name: shopItem.name,
          description: shopItem.description,
          quantity: parsed.data.quantity,
          unitPrice: shopItem.price,
          ownershipType: "PUBLIC",
          sourceShopItemId: shopItem.id,
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
        entityId: shopItem.id,
        beforeValue: null,
        afterValue: JSON.stringify({
          shop: shopItem.shop.slug,
          quantity: parsed.data.quantity,
          totalCost,
          currency: shopItem.shop.currency,
        }),
        note: `购买公共物品：${shopItem.name}`,
      },
    });
  });

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

  await prisma.$transaction(async (tx) => {
    if (parsed.data.quantity === inventoryItem.quantity) {
      await tx.inventoryItem.delete({
        where: { id: inventoryItem.id },
      });
    } else {
      await tx.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          quantity: {
            decrement: parsed.data.quantity,
          },
        },
      });
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
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          honor: {
            increment: refundTotal,
          },
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
        note: `半价回收公共物品：${inventoryItem.name}`,
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath(`/characters/${inventoryItem.characterId}`);
  revalidatePath(getShopPathFromSlug(sourceShopItem.shop.slug));
  redirect(buildRedirect(`/characters/${inventoryItem.characterId}`, "sellbackSuccess", "sellback-completed"));
}
