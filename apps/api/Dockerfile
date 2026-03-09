FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN bun install --frozen-lockfile

# Copy source
COPY packages/ ./packages/
COPY apps/ ./apps/
COPY drizzle.config.ts ./
COPY drizzle/ ./drizzle/
COPY tsconfig.json ./

# Build frontend
RUN cd apps/web && bun run build

# Run API (serves static files from apps/web/dist)
EXPOSE 3000
CMD ["bun", "apps/api/src/index.ts"]
