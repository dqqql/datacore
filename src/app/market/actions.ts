"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  cancelMarketListingSchema,
  createMarketListingSchema,
  purchaseMarketListingSchema,
} from "@/lib/schemas";

function buildRedirect(pathname: string, key: string, value: string) {
  const searchParams = new URLSearchParams({ [key]: value });
  return `${pathname}?${searchParams.toString()}`;
}

export async function createMarketListingAction(formData: FormData) {
  const session = await requireSession();
  const fallbackCharacterId = String(formData.get("characterId") ?? "").trim();
  const parsed = createMarketListingSchema.safeParse({
    characterId: formData.get("characterId"),
    inventoryItemId: formData.get("inventoryItemId"),
  });

  if (!parsed.success) {
    if (fallbackCharacterId) {
      redirect(buildRedirect(`/characters/${fallbackCharacterId}`, "listingError", "invalid-listing"));
    }

    redirect("/characters?error=invalid-listing");
  }

  const inventoryItem = await prisma.inventoryItem.findFirst({
    where: {
      id: parsed.data.inventoryItemId,
      characterId: parsed.data.characterId,
      ownershipType: "PRIVATE",
      character: {
        userId: session.user.id,
        status: "ACTIVE",
      },
    },
    include: {
      marketListing: true,
    },
  });

  if (!inventoryItem || inventoryItem.isListed) {
    redirect(buildRedirect(`/characters/${parsed.data.characterId}`, "listingError", "listing-unavailable"));
  }

  await prisma.$transaction(async (tx) => {
    await tx.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: {
        isListed: true,
      },
    });

    await tx.marketListing.upsert({
      where: {
        inventoryItemId: inventoryItem.id,
      },
      update: {
        sellerCharacterId: parsed.data.characterId,
        buyerCharacterId: null,
        price: inventoryItem.unitPrice,
        status: "ACTIVE",
        listedAt: new Date(),
        soldAt: null,
      },
      create: {
        inventoryItemId: inventoryItem.id,
        sellerCharacterId: parsed.data.characterId,
        price: inventoryItem.unitPrice,
        status: "ACTIVE",
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: session.user.id,
        targetUserId: session.user.id,
        targetCharacterId: parsed.data.characterId,
        action: "MARKET_LISTED",
        entityType: "MarketListing",
        entityId: inventoryItem.marketListing?.id ?? inventoryItem.id,
        afterValue: JSON.stringify({
          inventoryItemId: inventoryItem.id,
          price: inventoryItem.unitPrice,
        }),
        note: `上架私人物品：${inventoryItem.name}`,
      },
    });
  });

  revalidatePath(`/characters/${parsed.data.characterId}`);
  revalidatePath("/market");
  redirect(buildRedirect(`/characters/${parsed.data.characterId}`, "listingSuccess", "listing-created"));
}

export async function cancelMarketListingAction(formData: FormData) {
  const session = await requireSession();
  const fallbackCharacterId = String(formData.get("characterId") ?? "").trim();
  const redirectPath = String(formData.get("redirectPath") ?? "").trim();
  const parsed = cancelMarketListingSchema.safeParse({
    characterId: formData.get("characterId"),
    listingId: formData.get("listingId"),
  });

  if (!parsed.success) {
    redirect(buildRedirect("/market", "marketError", "invalid-cancel"));
  }

  const listing = await prisma.marketListing.findFirst({
    where: {
      id: parsed.data.listingId,
      status: "ACTIVE",
      sellerCharacter: {
        id: parsed.data.characterId,
        userId: session.user.id,
        status: "ACTIVE",
      },
    },
    include: {
      inventoryItem: true,
      sellerCharacter: true,
    },
  });

  if (!listing) {
    if (fallbackCharacterId) {
      if (redirectPath === "/market") {
        redirect(buildRedirect("/market", "marketError", "cancel-unavailable"));
      }

      redirect(buildRedirect(`/characters/${fallbackCharacterId}`, "listingError", "cancel-unavailable"));
    }

    redirect(buildRedirect("/market", "marketError", "cancel-unavailable"));
  }

  await prisma.$transaction(async (tx) => {
    await tx.marketListing.update({
      where: { id: listing.id },
      data: {
        status: "CANCELLED",
        buyerCharacterId: null,
        soldAt: null,
      },
    });

    await tx.inventoryItem.update({
      where: { id: listing.inventoryItemId },
      data: {
        isListed: false,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: session.user.id,
        targetUserId: session.user.id,
        targetCharacterId: listing.sellerCharacterId,
        action: "MARKET_CANCELLED",
        entityType: "MarketListing",
        entityId: listing.id,
        beforeValue: JSON.stringify({
          inventoryItemId: listing.inventoryItemId,
          price: listing.price,
        }),
        note: `下架私人物品：${listing.inventoryItem.name}`,
      },
    });
  });

  revalidatePath(`/characters/${listing.sellerCharacterId}`);
  revalidatePath("/market");
  if (redirectPath === "/market") {
    redirect(buildRedirect("/market", "marketSuccess", "cancel-completed"));
  }

  redirect(buildRedirect(`/characters/${listing.sellerCharacterId}`, "listingSuccess", "listing-cancelled"));
}

export async function purchaseMarketListingAction(formData: FormData) {
  const session = await requireSession();
  const parsed = purchaseMarketListingSchema.safeParse({
    buyerCharacterId: formData.get("buyerCharacterId"),
    listingId: formData.get("listingId"),
  });

  if (!parsed.success) {
    redirect(buildRedirect("/market", "marketError", "invalid-purchase"));
  }

  const [buyerCharacter, listing] = await Promise.all([
    prisma.character.findFirst({
      where: {
        id: parsed.data.buyerCharacterId,
        userId: session.user.id,
        status: "ACTIVE",
      },
    }),
    prisma.marketListing.findFirst({
      where: {
        id: parsed.data.listingId,
        status: "ACTIVE",
      },
      include: {
        inventoryItem: true,
        sellerCharacter: true,
      },
    }),
  ]);

  if (
    !buyerCharacter ||
    !listing ||
    !listing.inventoryItem.isListed ||
    listing.inventoryItem.ownershipType !== "PRIVATE" ||
    listing.inventoryItem.characterId !== listing.sellerCharacterId
  ) {
    redirect(buildRedirect("/market", "marketError", "purchase-unavailable"));
  }

  if (listing.sellerCharacter.userId === session.user.id || listing.sellerCharacterId === buyerCharacter.id) {
    redirect(buildRedirect("/market", "marketError", "self-purchase"));
  }

  if (buyerCharacter.gold < listing.price) {
    redirect(buildRedirect("/market", "marketError", "insufficient-gold"));
  }

  await prisma.$transaction(async (tx) => {
    await tx.character.update({
      where: { id: buyerCharacter.id },
      data: {
        gold: {
          decrement: listing.price,
        },
      },
    });

    await tx.character.update({
      where: { id: listing.sellerCharacterId },
      data: {
        gold: {
          increment: listing.price,
        },
      },
    });

    await tx.inventoryItem.update({
      where: { id: listing.inventoryItemId },
      data: {
        characterId: buyerCharacter.id,
        isListed: false,
        unitPrice: listing.price,
      },
    });

    await tx.marketListing.update({
      where: { id: listing.id },
      data: {
        status: "SOLD",
        buyerCharacterId: buyerCharacter.id,
        soldAt: new Date(),
      },
    });

    await tx.auditLog.createMany({
      data: [
        {
          actorUserId: session.user.id,
          targetUserId: session.user.id,
          targetCharacterId: buyerCharacter.id,
          action: "MARKET_PURCHASED",
          entityType: "MarketListing",
          entityId: listing.id,
          afterValue: JSON.stringify({
            role: "buyer",
            price: listing.price,
            inventoryItemId: listing.inventoryItemId,
          }),
          note: `市场购入私人物品：${listing.inventoryItem.name}`,
        },
        {
          actorUserId: session.user.id,
          targetUserId: listing.sellerCharacter.userId,
          targetCharacterId: listing.sellerCharacterId,
          action: "MARKET_PURCHASED",
          entityType: "MarketListing",
          entityId: listing.id,
          afterValue: JSON.stringify({
            role: "seller",
            price: listing.price,
            inventoryItemId: listing.inventoryItemId,
          }),
          note: `市场售出私人物品：${listing.inventoryItem.name}`,
        },
      ],
    });
  });

  revalidatePath("/market");
  revalidatePath(`/characters/${buyerCharacter.id}`);
  revalidatePath(`/characters/${listing.sellerCharacterId}`);
  redirect(buildRedirect("/market", "marketSuccess", "purchase-completed"));
}
