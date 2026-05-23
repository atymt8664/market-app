# Souq Arab EU API — monorepo image. Build context: Classified-Marketplace/ repo root.
FROM node:22-bookworm-slim AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.6.5 --activate

COPY . .

RUN pnpm install --frozen-lockfile

WORKDIR /app/artifacts/api-server
RUN pnpm run build
WORKDIR /app

FROM node:22-bookworm-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/artifacts/api-server

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=build /app/artifacts/api-server/dist ./dist
COPY --from=build /app/artifacts/api-server/package.json ./package.json
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/artifacts/api-server/node_modules ./node_modules
COPY --from=build /app/lib /app/lib

WORKDIR /app/artifacts/api-server

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3001/api/healthz || exit 1

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
