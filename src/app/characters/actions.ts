"use server";

import { hash } from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, requireSession } from "@/lib/auth-helpers";
import {
  createPrivateItemSchema,
  createCharacterSchema,
  createUserSchema,
  selectCharacterSchema,
  updateCharacterEconomySchema,
} from "@/lib/schemas";

function buildCharacterDetailRedirect(characterId: string, key: string, value: string) {
  const searchParams = new URLSearchParams({ [key]: value });
  return `/characters/${characterId}?${searchParams.toString()}`;
}

function buildCharactersRedirect(key: string, value: string) {
  const searchParams = new URLSearchParams({ [key]: value });
  return `/characters?${searchParams.toString()}`;
}

export async function createCharacterAction(formData: FormData) {
  const session = await requireSession();
  const parsed = createCharacterSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    redirect("/characters?error=invalid-character-name");
  }

  const character = await prisma.character.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
    },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      currentCharacterId: character.id,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/characters");
  redirect("/characters");
}

export async function createFirstCharacterAction(formData: FormData) {
  const session = await requireSession();
  const parsed = createCharacterSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    redirect("/bootstrap/character?error=invalid-character-name");
  }

  const character = await prisma.character.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
    },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      currentCharacterId: character.id,
    },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function selectCurrentCharacterAction(formData: FormData) {
  const session = await requireSession();
  const parsed = selectCharacterSchema.safeParse({
    characterId: formData.get("characterId"),
  });

  if (!parsed.success) {
    redirect("/characters?error=invalid-character-selection");
  }

  const character = await prisma.character.findFirst({
    where: {
      id: parsed.data.characterId,
      userId: session.user.id,
      status: "ACTIVE",
    },
  });

  if (!character) {
    redirect("/characters?error=character-not-found");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      currentCharacterId: character.id,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/characters");
  redirect(`/characters/${character.id}`);
}

export async function updateCharacterEconomyAction(formData: FormData) {
  const session = await requireSession();
  const parsed = updateCharacterEconomySchema.safeParse({
    characterId: formData.get("characterId"),
    gold: formData.get("gold"),
    reputation: formData.get("reputation"),
  });

  if (!parsed.success) {
    redirect("/characters?error=invalid-character-economy");
  }

  const character = await prisma.character.findFirst({
    where: {
      id: parsed.data.characterId,
      userId: session.user.id,
      status: "ACTIVE",
    },
  });

  if (!character) {
    redirect("/characters?error=character-not-found");
  }

  const logs: Prisma.AuditLogCreateManyInput[] = [];

  if (character.gold !== parsed.data.gold) {
    logs.push({
      actorUserId: session.user.id,
      targetUserId: session.user.id,
      targetCharacterId: character.id,
      action: "CHARACTER_GOLD_UPDATED" as const,
      entityType: "Character",
      entityId: character.id,
      beforeValue: String(character.gold),
      afterValue: String(parsed.data.gold),
      note: "玩家调整角色金币",
    });
  }

  if (character.reputation !== parsed.data.reputation) {
    logs.push({
      actorUserId: session.user.id,
      targetUserId: session.user.id,
      targetCharacterId: character.id,
      action: "CHARACTER_REPUTATION_UPDATED" as const,
      entityType: "Character",
      entityId: character.id,
      beforeValue: String(character.reputation),
      afterValue: String(parsed.data.reputation),
      note: "玩家调整角色声望",
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.character.update({
      where: { id: character.id },
      data: {
        gold: parsed.data.gold,
        reputation: parsed.data.reputation,
      },
    });

    if (logs.length > 0) {
      await tx.auditLog.createMany({
        data: logs,
      });
    }
  });

  revalidatePath("/dashboard");
  revalidatePath(`/characters/${character.id}`);
  redirect(`/characters/${character.id}`);
}

export async function createPrivateItemAction(formData: FormData) {
  const session = await requireSession();
  const fallbackCharacterId = String(formData.get("characterId") ?? "").trim();
  const parsed = createPrivateItemSchema.safeParse({
    characterId: formData.get("characterId"),
    name: formData.get("name"),
    description: formData.get("description"),
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
  });

  if (!parsed.success) {
    if (fallbackCharacterId) {
      redirect(buildCharacterDetailRedirect(fallbackCharacterId, "inventoryError", "invalid-private-item"));
    }

    redirect("/characters?error=invalid-private-item");
  }

  const character = await prisma.character.findFirst({
    where: {
      id: parsed.data.characterId,
      userId: session.user.id,
      status: "ACTIVE",
    },
  });

  if (!character) {
    redirect("/characters?error=character-not-found");
  }

  await prisma.$transaction(async (tx) => {
    const createdItem = await tx.inventoryItem.create({
      data: {
        characterId: character.id,
        name: parsed.data.name,
        description: parsed.data.description,
        quantity: parsed.data.quantity,
        unitPrice: parsed.data.unitPrice,
        ownershipType: "PRIVATE",
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: session.user.id,
        targetUserId: session.user.id,
        targetCharacterId: character.id,
        action: "PRIVATE_ITEM_CREATED",
        entityType: "InventoryItem",
        entityId: createdItem.id,
        afterValue: JSON.stringify({
          name: createdItem.name,
          quantity: createdItem.quantity,
          unitPrice: createdItem.unitPrice,
        }),
        note: `玩家登记私人物品：${createdItem.name}`,
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath(`/characters/${character.id}`);
  redirect(buildCharacterDetailRedirect(character.id, "inventorySuccess", "private-item-created"));
}

export async function archiveCharacterAction(formData: FormData) {
  const session = await requireSession();
  const redirectPath = String(formData.get("redirectPath") ?? "").trim();
  const parsed = selectCharacterSchema.safeParse({
    characterId: formData.get("characterId"),
  });

  if (!parsed.success) {
    redirect(buildCharactersRedirect("characterError", "invalid-character-selection"));
  }

  const character = await prisma.character.findFirst({
    where: {
      id: parsed.data.characterId,
      userId: session.user.id,
      status: "ACTIVE",
    },
    include: {
      sellingListings: {
        where: { status: "ACTIVE" },
        select: { id: true },
      },
    },
  });

  if (!character) {
    redirect(buildCharactersRedirect("characterError", "character-not-found"));
  }

  if (character.sellingListings.length > 0) {
    redirect(buildCharactersRedirect("characterError", "character-has-active-listings"));
  }

  await prisma.$transaction(async (tx) => {
    await tx.character.update({
      where: { id: character.id },
      data: {
        status: "ARCHIVED",
      },
    });

    const nextActiveCharacter = await tx.character.findFirst({
      where: {
        userId: session.user.id,
        status: "ACTIVE",
        id: {
          not: character.id,
        },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    await tx.user.update({
      where: { id: session.user.id },
      data: {
        currentCharacterId: nextActiveCharacter?.id ?? null,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: session.user.id,
        targetUserId: session.user.id,
        targetCharacterId: character.id,
        action: "CHARACTER_ARCHIVED",
        entityType: "Character",
        entityId: character.id,
        beforeValue: "ACTIVE",
        afterValue: "ARCHIVED",
        note: `玩家归档角色：${character.name}`,
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/characters");
  revalidatePath(`/characters/${character.id}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");

  if (redirectPath === `/characters/${character.id}`) {
    redirect(buildCharactersRedirect("characterSuccess", "character-archived"));
  }

  redirect(buildCharactersRedirect("characterSuccess", "character-archived"));
}

export async function restoreCharacterAction(formData: FormData) {
  const session = await requireAdminSession();
  const parsed = selectCharacterSchema.safeParse({
    characterId: formData.get("characterId"),
  });

  if (!parsed.success) {
    redirect("/admin/users?characterError=invalid-character-selection");
  }

  const character = await prisma.character.findFirst({
    where: {
      id: parsed.data.characterId,
      status: "ARCHIVED",
    },
    include: {
      sellingListings: {
        where: { status: "ACTIVE" },
        select: { id: true },
      },
      user: {
        select: {
          id: true,
          currentCharacterId: true,
        },
      },
    },
  });

  if (!character) {
    redirect("/admin/users?characterError=character-not-found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.character.update({
      where: { id: character.id },
      data: {
        status: "ACTIVE",
      },
    });

    if (!character.user.currentCharacterId) {
      await tx.user.update({
        where: { id: character.user.id },
        data: {
          currentCharacterId: character.id,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: session.user.id,
        targetUserId: character.user.id,
        targetCharacterId: character.id,
        action: "CHARACTER_RESTORED",
        entityType: "Character",
        entityId: character.id,
        beforeValue: "ARCHIVED",
        afterValue: "ACTIVE",
        note: `管理员恢复角色：${character.name}`,
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/characters");
  revalidatePath(`/characters/${character.id}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
  redirect("/admin/users?characterSuccess=character-restored");
}

export async function createUserAction(formData: FormData) {
  await requireAdminSession();

  const parsed = createUserSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect("/admin/users?error=invalid-user");
  }

  const existing = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });

  if (existing) {
    redirect("/admin/users?error=user-exists");
  }

  const passwordHash = await hash(parsed.data.password, 10);

  await prisma.user.create({
    data: {
      username: parsed.data.username,
      displayName: parsed.data.username,
      passwordHash,
      role: "PLAYER",
    },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}
