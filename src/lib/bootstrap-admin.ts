import { readFile } from "fs/promises";
import path from "path";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

function resolvePasswordFilePath(filePath: string) {
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

async function readMountedPassword() {
  const filePath = process.env.ADMIN_PASSWORD_FILE;

  if (!filePath) {
    return null;
  }

  try {
    const password = await readFile(resolvePasswordFilePath(filePath), "utf8");
    const trimmed = password.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

export async function ensureAdminUserFromFile() {
  const username = process.env.ADMIN_USERNAME?.trim() || "总管理员";
  const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || username;
  const mountedPassword = await readMountedPassword();

  if (!mountedPassword) {
    return null;
  }

  const existing = await prisma.user.findUnique({
    where: { username },
  });

  if (!existing) {
    const passwordHash = await hash(mountedPassword, 10);

    return prisma.user.create({
      data: {
        username,
        displayName,
        passwordHash,
        role: "ADMIN",
      },
    });
  }

  const passwordMatches = await compare(mountedPassword, existing.passwordHash);

  if (passwordMatches && existing.role === "ADMIN" && existing.displayName === displayName) {
    return existing;
  }

  const passwordHash = passwordMatches ? existing.passwordHash : await hash(mountedPassword, 10);

  return prisma.user.update({
    where: { id: existing.id },
    data: {
      displayName,
      role: "ADMIN",
      passwordHash,
    },
  });
}
