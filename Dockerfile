FROM node:24-bookworm-slim AS build

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY artifacts/api-server/package.json artifacts/api-server/package.json
COPY artifacts/mindful-campus/package.json artifacts/mindful-campus/package.json
COPY lib/api-client-react/package.json lib/api-client-react/package.json
COPY lib/api-spec/package.json lib/api-spec/package.json
COPY lib/api-zod/package.json lib/api-zod/package.json
COPY lib/db/package.json lib/db/package.json

RUN pnpm install --frozen-lockfile

COPY artifacts ./artifacts
COPY lib ./lib

ENV NODE_ENV=production
ENV BASE_PATH=/
ENV PORT=5173
RUN pnpm --filter @workspace/mindful-campus build
RUN pnpm --filter @workspace/api-server build

FROM node:24-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV FRONTEND_DIST=/app/artifacts/mindful-campus/dist/public

COPY --from=build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build /app/artifacts/mindful-campus/dist/public ./artifacts/mindful-campus/dist/public

EXPOSE 10000
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]