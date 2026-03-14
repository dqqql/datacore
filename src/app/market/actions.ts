"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ActionPasswordError, requireActionPassword } from "@/lib/auth-helpers";
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

class MarketActionError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

export async function createMarketListingAction(formData: FormData) {
  let session;
  const fallbackCharacterId = String(formData.get("characterId") ?? "").trim();

  try {
    session = await requireActionPassword(formData);
  } catch (error) {
    if (error instanceof ActionPasswordError) {
      if (fallbackCharacterId) {
        redirect(buildRedirect(`/characters/${fallbackCharacterId}`, "listingError", "password-invalid"));
      }

      redirect("/characters?characterError=password-invalid");
    }

    throw error;
  }

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

  try {
    await prisma.$transaction(async (tx) => {
      const listedItem = await tx.inventoryItem.updateMany({
        where: {
          id: inventoryItem.id,
          characterId: parsed.data.characterId,
          ownershipType: "PRIVATE",
          isListed: false,
        },
        data: {
          isListed: true,
        },
      });

      if (listedItem.count !== 1) {
        throw new MarketActionError("listing-unavailable");
      }

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
          note: `市场上架私人物品：${inventoryItem.name}`,
        },
      });
    });
  } catch (error) {
    if (error instanceof MarketActionError && error.code === "listing-unavailable") {
      redirect(buildRedirect(`/characters/${parsed.data.characterId}`, "listingError", "listing-unavailable"));
    }

    throw error;
  }

  revalidatePath(`/characters/${parsed.data.characterId}`);
  revalidatePath("/market");
  redirect(buildRedirect(`/characters/${parsed.data.characterId}`, "listingSuccess", "listing-created"));
}

export async function cancelMarketListingAction(formData: FormData) {
  let session;
  const fallbackCharacterId = String(formData.get("characterId") ?? "").trim();
  const redirectPath = String(formData.get("redirectPath") ?? "").trim();

  try {
    session = await requireActionPassword(formData);
  } catch (error) {
    if (error instanceof ActionPasswordError) {
      if (redirectPath === "/market") {
        redirect(buildRedirect("/market", "marketError", "password-invalid"));
      }

      if (fallbackCharacterId) {
        redirect(buildRedirect(`/characters/${fallbackCharacterId}`, "listingError", "password-invalid"));
      }

      redirect("/market?marketError=password-invalid");
    }

    throw error;
  }

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

  try {
    await prisma.$transaction(async (tx) => {
      const cancelledListing = await tx.marketListing.updateMany({
        where: {
          id: listing.id,
          sellerCharacterId: listing.sellerCharacterId,
          status: "ACTIVE",
        },
        data: {
          status: "CANCELLED",
          buyerCharacterId: null,
          soldAt: null,
        },
      });

      if (cancelledListing.count !== 1) {
        throw new MarketActionError("cancel-unavailable");
      }

      const restoredItem = await tx.inventoryItem.updateMany({
        where: {
          id: listing.inventoryItemId,
          characterId: listing.sellerCharacterId,
          isListed: true,
          ownershipType: "PRIVATE",
        },
        data: {
          isListed: false,
        },
      });

      if (restoredItem.count !== 1) {
        throw new MarketActionError("cancel-unavailable");
      }

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
          note: `市场下架私人物品：${listing.inventoryItem.name}`,
        },
      });
    });
  } catch (error) {
    if (error instanceof MarketActionError && error.code === "cancel-unavailable") {
      if (redirectPath === "/market") {
        redirect(buildRedirect("/market", "marketError", "cancel-unavailable"));
      }

      redirect(buildRedirect(`/characters/${fallbackCharacterId}`, "listingError", "cancel-unavailable"));
    }

    throw error;
  }

  revalidatePath(`/characters/${listing.sellerCharacterId}`);
  revalidatePath("/market");
  if (redirectPath === "/market") {
    redirect(buildRedirect("/market", "marketSuccess", "cancel-completed"));
  }

  redirect(buildRedirect(`/characters/${listing.sellerCharacterId}`, "listingSuccess", "listing-cancelled"));
}

export async function purchaseMarketListingAction(formData: FormData) {
  let session;

  try {
    session = await requireActionPassword(formData);
  } catch (error) {
    if (error instanceof ActionPasswordError) {
      redirect(buildRedirect("/market", "marketError", "password-invalid"));
    }

    throw error;
  }

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

  try {
    await prisma.$transaction(async (tx) => {
      const deductedBuyer = await tx.character.updateMany({
        where: {
          id: buyerCharacter.id,
          userId: session.user.id,
          status: "ACTIVE",
          gold: {
            gte: listing.price,
          },
        },
        data: {
          gold: {
            decrement: listing.price,
          },
        },
      });

      if (deductedBuyer.count !== 1) {
        throw new MarketActionError("insufficient-gold");
      }

      const soldListing = await tx.marketListing.updateMany({
        where: {
          id: listing.id,
          sellerCharacterId: listing.sellerCharacterId,
          status: "ACTIVE",
        },
        data: {
          status: "SOLD",
          buyerCharacterId: buyerCharacter.id,
          soldAt: new Date(),
        },
      });

      if (soldListing.count !== 1) {
        throw new MarketActionError("purchase-unavailable");
      }

      const transferredItem = await tx.inventoryItem.updateMany({
        where: {
          id: listing.inventoryItemId,
          characterId: listing.sellerCharacterId,
          isListed: true,
          ownershipType: "PRIVATE",
        },
        data: {
          characterId: buyerCharacter.id,
          isListed: false,
          unitPrice: listing.price,
        },
      });

      if (transferredItem.count !== 1) {
        throw new MarketActionError("purchase-unavailable");
      }

      await tx.character.update({
        where: { id: listing.sellerCharacterId },
        data: {
          gold: {
            increment: listing.price,
          },
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
            note: `市场购入条目：${listing.inventoryItem.name}`,
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
            note: `市场售出条目：${listing.inventoryItem.name}`,
          },
        ],
      });
    });
  } catch (error) {
    if (error instanceof MarketActionError) {
      if (error.code === "insufficient-gold") {
        redirect(buildRedirect("/market", "marketError", "insufficient-gold"));
      }

      if (error.code === "purchase-unavailable") {
        redirect(buildRedirect("/market", "marketError", "purchase-unavailable"));
      }
    }

    throw error;
  }

  revalidatePath("/market");
  revalidatePath(`/characters/${buyerCharacter.id}`);
  revalidatePath(`/characters/${listing.sellerCharacterId}`);
  redirect(buildRedirect("/market", "marketSuccess", "purchase-completed"));
}
