FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
ENV DATABASE_URL="file:./sqlite/dev.db"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /app/prisma/sqlite
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npx prisma db push --schema=./prisma/schema.prisma
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="file:./sqlite/dev.db"

COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["sh", "-c", "mkdir -p /app/prisma/sqlite && ./node_modules/.bin/prisma db push --schema=/app/prisma/schema.prisma && node server.js"]
