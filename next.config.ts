import type { NextConfig } from "next";

function normalizeAllowedOrigin(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("*.")) {
    return normalized;
  }

  try {
    return new URL(normalized).host;
  } catch {
    return normalized.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}

const allowedOrigins = Array.from(
  new Set(
    [
      process.env.AUTH_URL,
      process.env.NEXTAUTH_URL,
      ...(process.env.SERVER_ACTIONS_ALLOWED_ORIGINS ?? "").split(","),
    ]
      .filter((value): value is string => Boolean(value?.trim()))
      .map(normalizeAllowedOrigin)
      .filter(Boolean),
  ),
);

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
};

export default nextConfig;
