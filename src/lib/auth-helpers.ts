import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { prisma } from "@/lib/prisma";

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

  if (!currentCharacter && user.characters.length > 0) {
    currentCharacter = user.characters[0];

    await prisma.user.update({
      where: { id: user.id },
      data: { currentCharacterId: currentCharacter.id },
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
