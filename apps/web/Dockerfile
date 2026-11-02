# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    CI=true
RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile --filter @margi-ai/shared --filter web --ignore-scripts

COPY packages/shared packages/shared
COPY apps/web apps/web

ARG VITE_APP_URL=http://localhost:8080
ARG VITE_API_BASE=/api/v1
ENV VITE_APP_URL=${VITE_APP_URL} \
    VITE_API_BASE=${VITE_API_BASE}

RUN pnpm --filter @margi-ai/shared build && pnpm --filter web build

FROM nginx:alpine-slim AS runner

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/apps/web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
