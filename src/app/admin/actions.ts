"use server";

import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { adjustUserHonorSchema, refreshPasswordPoolSchema } from "@/lib/schemas";

function buildRedirect(pathname: string, key: string, value: string) {
  const searchParams = new URLSearchParams({ [key]: value });
  return `${pathname}?${searchParams.toString()}`;
}

function generatePasswordCodes(count: number) {
  const prefix = Date.now().toString(36).toUpperCase();

  return Array.from({ length: count }, (_, index) => {
    const randomPart = randomInt(100000, 999999).toString();
    return `OTP-${prefix}-${String(index + 1).padStart(4, "0")}-${randomPart}`;
  });
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

export async function refreshPasswordPoolAction(formData: FormData) {
  const session = await requireAdminSession();
  const parsed = refreshPasswordPoolSchema.safeParse({
    count: formData.get("count"),
  });

  if (!parsed.success) {
    redirect(buildRedirect("/admin/passwords", "otpError", "invalid-count"));
  }

  const codes = generatePasswordCodes(parsed.data.count);

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
        afterValue: JSON.stringify({
          count: parsed.data.count,
        }),
        note: `刷新一次性密码池，生成 ${parsed.data.count} 条密码`,
      },
    });
  });

  revalidatePath("/admin/passwords");
  revalidatePath("/admin/audit");
  redirect(buildRedirect("/admin/passwords", "otpSuccess", "pool-refreshed"));
}
