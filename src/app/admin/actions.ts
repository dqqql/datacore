"use server";

import { randomInt } from "crypto";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession, requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  adjustUserHonorSchema,
  createShopItemSchema,
  selectUserSchema,
  updateShopItemSchema,
} from "@/lib/schemas";

function buildRedirect(pathname: string, key: string, value: string) {
  const searchParams = new URLSearchParams({ [key]: value });
  return `${pathname}?${searchParams.toString()}`;
}

function buildAdminShopsRedirect(params: Record<string, string | null | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `/admin/shops?${queryString}` : "/admin/shops";
}

function readAdminShopReturnState(formData: FormData) {
  return {
    page: formData.get("returnPage")?.toString() ?? undefined,
    mode: formData.get("returnMode")?.toString() ?? undefined,
    itemId: formData.get("returnItemId")?.toString() ?? undefined,
    shopId: formData.get("returnShopId")?.toString() ?? undefined,
  };
}

function generatePasswordCodes(count: number) {
  const prefix = Date.now().toString(36).toUpperCase();

  return Array.from({ length: count }, (_, index) => {
    const randomPart = randomInt(100000, 999999).toString();
    return `OTP-${prefix}-${String(index + 1).padStart(4, "0")}-${randomPart}`;
  });
}

function getShopPathFromSlug(shopSlug: string) {
  if (shopSlug === "honor") {
    return "/shops/honor";
  }

  return "/shops/guild";
}

class AdminShopActionError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

function snapshotShopItem(item: {
  shopId: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  importedSource: string | null;
  sortOrder: number;
  isActive: boolean;
}) {
  return {
    shopId: item.shopId,
    name: item.name,
    description: item.description,
    category: item.category,
    price: item.price,
    importedSource: item.importedSource,
    sortOrder: item.sortOrder,
    isActive: item.isActive,
  };
}

async function consumeOneTimePassword(tx: Prisma.TransactionClient, code: string) {
  const password = await tx.oneTimePassword.findFirst({
    where: {
      code,
      isUsed: false,
      pool: {
        isActive: true,
      },
    },
    select: {
      id: true,
      poolId: true,
    },
  });

  if (!password) {
    throw new AdminShopActionError("invalid-otp");
  }

  const consumed = await tx.oneTimePassword.updateMany({
    where: {
      id: password.id,
      isUsed: false,
      poolId: password.poolId,
    },
    data: {
      isUsed: true,
      usedAt: new Date(),
    },
  });

  if (consumed.count !== 1) {
    throw new AdminShopActionError("invalid-otp");
  }
}

async function requireShopMaintenanceAccess() {
  const session = await requireSession();
  return {
    session,
    requiresOtp: session.user.role !== "ADMIN",
  };
}

function revalidateShopPaths(shopSlug: string) {
  revalidatePath("/admin/shops");
  revalidatePath("/admin/audit");
  revalidatePath(getShopPathFromSlug(shopSlug));
}

export async function adjustUserHonorAction(formData: FormData) {
  const session = await requireAdminSession();
  const parsed = adjustUserHonorSchema.safeParse({
    userId: formData.get("userId"),
    delta: formData.get("delta"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    redirect(buildRedirect("/admin/users", "honorError", "invalid-honor-adjustment"));
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
  });

  if (!targetUser) {
    redirect(buildRedirect("/admin/users", "honorError", "user-not-found"));
  }

  const nextHonor = targetUser.honor + parsed.data.delta;

  if (nextHonor < 0) {
    redirect(buildRedirect("/admin/users", "honorError", "honor-below-zero"));
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUser.id },
      data: {
        honor: nextHonor,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: session.user.id,
        targetUserId: targetUser.id,
        action: "USER_HONOR_UPDATED",
        entityType: "User",
        entityId: targetUser.id,
        beforeValue: String(targetUser.honor),
        afterValue: String(nextHonor),
        note: parsed.data.reason,
      },
    });
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
  redirect(buildRedirect("/admin/users", "honorSuccess", "honor-adjusted"));
}

export async function refreshPasswordPoolAction() {
  const session = await requireAdminSession();

  const count = 10;
  const codes = generatePasswordCodes(count);

  await prisma.$transaction(async (tx) => {
    await tx.oneTimePasswordPool.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    const pool = await tx.oneTimePasswordPool.create({
      data: {
        createdByUserId: session.user.id,
        isActive: true,
      },
    });

    await tx.oneTimePassword.createMany({
      data: codes.map((code) => ({
        poolId: pool.id,
        code,
      })),
    });

    await tx.auditLog.create({
      data: {
        actorUserId: session.user.id,
        targetUserId: session.user.id,
        action: "SHOP_PASSWORD_POOL_REFRESHED",
        entityType: "OneTimePasswordPool",
        entityId: pool.id,
        afterValue: JSON.stringify({ count }),
        note: `刷新一次性密码池，共生成 ${count} 组密码`,
      },
    });
  });

  revalidatePath("/admin/passwords");
  revalidatePath("/admin/audit");
  redirect(buildRedirect("/admin/passwords", "otpSuccess", "pool-refreshed"));
}

export async function createShopItemAction(formData: FormData) {
  const { session, requiresOtp } = await requireShopMaintenanceAccess();
  const returnState = readAdminShopReturnState(formData);
  const otpCode = String(formData.get("otpCode") ?? "").trim();
  const parsed = createShopItemSchema.safeParse({
    shopId: formData.get("shopId"),
    name: formData.get("name"),
    description: formData.get("description"),
    category: formData.get("category"),
    price: formData.get("price"),
    importedSource: formData.get("importedSource"),
    sortOrder: formData.get("sortOrder"),
  });

  if (!parsed.success) {
    redirect(
      buildAdminShopsRedirect({
        shopError: "invalid-shop-item",
        page: returnState.page,
        mode: "create",
        shopId: returnState.shopId,
      }),
    );
  }

  const shop = await prisma.shop.findUnique({
    where: { id: parsed.data.shopId },
    select: { id: true, slug: true, name: true },
  });

  if (!shop) {
    redirect(
      buildAdminShopsRedirect({
        shopError: "shop-not-found",
        page: returnState.page,
        mode: "create",
        shopId: returnState.shopId,
      }),
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (requiresOtp) {
        if (!otpCode) {
          throw new AdminShopActionError("invalid-otp");
        }

        await consumeOneTimePassword(tx, otpCode);
      }

      const createdItem = await tx.shopItem.create({
        data: {
          shopId: shop.id,
          name: parsed.data.name,
          description: parsed.data.description,
          category: parsed.data.category,
          price: parsed.data.price,
          importedSource: parsed.data.importedSource,
          sortOrder: parsed.data.sortOrder,
          isActive: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: session.user.id,
          targetUserId: session.user.id,
          action: "SHOP_ITEM_UPDATED",
          entityType: "ShopItem",
          entityId: createdItem.id,
          beforeValue: null,
          afterValue: JSON.stringify(snapshotShopItem(createdItem)),
          note: requiresOtp
            ? `成员新建商店条目：${createdItem.name}（${shop.name}）`
            : `管理员新建商店条目：${createdItem.name}（${shop.name}）`,
        },
      });
    });
  } catch (error) {
    if (error instanceof AdminShopActionError && error.code === "invalid-otp") {
      redirect(
        buildAdminShopsRedirect({
          shopError: "invalid-otp",
          page: returnState.page,
          mode: "create",
          shopId: returnState.shopId ?? shop.id,
        }),
      );
    }

    throw error;
  }

  revalidateShopPaths(shop.slug);
  redirect(
    buildAdminShopsRedirect({
      shopSuccess: "shop-item-created",
      page: returnState.page,
    }),
  );
}

export async function updateShopItemAction(formData: FormData) {
  const { session, requiresOtp } = await requireShopMaintenanceAccess();
  const returnState = readAdminShopReturnState(formData);
  const otpCode = String(formData.get("otpCode") ?? "").trim();
  const parsed = updateShopItemSchema.safeParse({
    shopItemId: formData.get("shopItemId"),
    name: formData.get("name"),
    description: formData.get("description"),
    category: formData.get("category"),
    price: formData.get("price"),
    importedSource: formData.get("importedSource"),
    sortOrder: formData.get("sortOrder"),
    isActive: formData.get("isActive"),
  });

  if (!parsed.success) {
    redirect(
      buildAdminShopsRedirect({
        shopError: "invalid-shop-item",
        page: returnState.page,
        mode: "edit",
        itemId: returnState.itemId,
      }),
    );
  }

  const existingItem = await prisma.shopItem.findUnique({
    where: { id: parsed.data.shopItemId },
    include: {
      shop: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  });

  if (!existingItem) {
    redirect(
      buildAdminShopsRedirect({
        shopError: "shop-item-not-found",
        page: returnState.page,
        mode: "edit",
        itemId: returnState.itemId,
      }),
    );
  }

  const beforeSnapshot = snapshotShopItem(existingItem);

  try {
    await prisma.$transaction(async (tx) => {
      if (requiresOtp) {
        if (!otpCode) {
          throw new AdminShopActionError("invalid-otp");
        }

        await consumeOneTimePassword(tx, otpCode);
      }

      const updatedItem = await tx.shopItem.update({
        where: { id: existingItem.id },
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          category: parsed.data.category,
          price: parsed.data.price,
          importedSource: parsed.data.importedSource,
          sortOrder: parsed.data.sortOrder,
          isActive: parsed.data.isActive,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: session.user.id,
          targetUserId: session.user.id,
          action: "SHOP_ITEM_UPDATED",
          entityType: "ShopItem",
          entityId: updatedItem.id,
          beforeValue: JSON.stringify(beforeSnapshot),
          afterValue: JSON.stringify(snapshotShopItem(updatedItem)),
          note: requiresOtp
            ? `成员维护商店条目：${updatedItem.name}（${existingItem.shop.name}）`
            : `管理员维护商店条目：${updatedItem.name}（${existingItem.shop.name}）`,
        },
      });
    });
  } catch (error) {
    if (error instanceof AdminShopActionError && error.code === "invalid-otp") {
      redirect(
        buildAdminShopsRedirect({
          shopError: "invalid-otp",
          page: returnState.page,
          mode: "edit",
          itemId: returnState.itemId ?? existingItem.id,
        }),
      );
    }

    throw error;
  }

  revalidateShopPaths(existingItem.shop.slug);
  redirect(
    buildAdminShopsRedirect({
      shopSuccess: "shop-item-updated",
      page: returnState.page,
    }),
  );
}

export async function deleteUserAction(formData: FormData) {
  const session = await requireAdminSession();
  const parsed = selectUserSchema.safeParse({
    userId: formData.get("userId"),
  });

  if (!parsed.success) {
    redirect(buildRedirect("/admin/users", "userDeleteError", "invalid-user"));
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    include: {
      characters: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!targetUser) {
    redirect(buildRedirect("/admin/users", "userDeleteError", "user-not-found"));
  }

  if (targetUser.role === "ADMIN") {
    redirect(buildRedirect("/admin/users", "userDeleteError", "admin-delete-blocked"));
  }

  if (targetUser.id === session.user.id) {
    redirect(buildRedirect("/admin/users", "userDeleteError", "self-delete-blocked"));
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.delete({
      where: { id: targetUser.id },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: session.user.id,
        action: "USER_DELETED",
        entityType: "User",
        entityId: targetUser.id,
        beforeValue: JSON.stringify({
          username: targetUser.username,
          displayName: targetUser.displayName,
          role: targetUser.role,
          honor: targetUser.honor,
          characters: targetUser.characters.map((character) => ({
            id: character.id,
            name: character.name,
          })),
        }),
        note: `管理员删除账号：${targetUser.displayName}`,
      },
    });
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
  revalidatePath("/characters");
  revalidatePath("/dashboard");
  redirect(buildRedirect("/admin/users", "userDeleteSuccess", "user-deleted"));
}
