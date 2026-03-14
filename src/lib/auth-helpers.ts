import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

export class ActionPasswordError extends Error {
  constructor(public readonly code: "missing" | "invalid") {
    super(code);
  }
}

export async function requireSession() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session;
}

export async function requireAdminSession() {
  const session = await requireSession();

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return session;
}

async function verifyActionPassword(sessionUserId: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: {
      passwordHash: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw new ActionPasswordError("invalid");
  }

  const isValid = await compare(password, user.passwordHash);

  if (!isValid) {
    throw new ActionPasswordError("invalid");
  }
}

export async function requireActionPassword(formData: FormData) {
  const session = await requireSession();

  if (session.user.role === "ADMIN") {
    return session;
  }

  const password = String(formData.get("actionPassword") ?? "");

  if (!password.trim()) {
    throw new ActionPasswordError("missing");
  }

  await verifyActionPassword(session.user.id, password);
  return session;
}

export async function requireActionPasswordValue(password: string) {
  const session = await requireSession();

  if (session.user.role === "ADMIN") {
    return session;
  }

  if (!password.trim()) {
    throw new ActionPasswordError("missing");
  }

  await verifyActionPassword(session.user.id, password);
  return session;
}

export async function getUserContext() {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      currentCharacter: true,
      characters: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  let currentCharacter = user.currentCharacter;
  const isCurrentCharacterActive = currentCharacter?.status === "ACTIVE";

  if (!isCurrentCharacterActive && user.characters.length > 0) {
    currentCharacter = user.characters[0];

    await prisma.user.update({
      where: { id: user.id },
      data: { currentCharacterId: currentCharacter.id },
    });
  } else if (!isCurrentCharacterActive && user.characters.length === 0 && user.currentCharacterId) {
    currentCharacter = null;

    await prisma.user.update({
      where: { id: user.id },
      data: { currentCharacterId: null },
    });
  }

  return {
    session,
    user,
    characters: user.characters,
    currentCharacter,
  };
}

export async function requirePlayerCharacter() {
  const context = await getUserContext();

  if (context.session.user.role === "PLAYER" && context.characters.length === 0) {
    redirect("/bootstrap/character");
  }

  return context;
}
