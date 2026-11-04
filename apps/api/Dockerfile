# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    CI=true
RUN corepack enable

WORKDIR /workspace

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch

COPY package.json tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile --offline
RUN pnpm --filter @margi-ai/shared build && pnpm --filter api build
RUN pnpm --filter api --prod --legacy deploy /prod/api

RUN rm -rf /prod/api/dist /prod/api/prisma /prod/api/src /prod/api/test /prod/api/prisma.config.ts && \
    cp -R /workspace/apps/api/dist /prod/api/dist && \
    cp -R /workspace/apps/api/prisma /prod/api/prisma && \
    cp -R /workspace/packages/shared/data /prod/api/data

RUN node -e "const fs=require('fs'),path=require('path'),cp=require('child_process'); \
    const pnpmRoot='/workspace/node_modules/.pnpm'; \
    const outPnpm='/opt/prisma-cli/node_modules/.pnpm'; \
    fs.mkdirSync(outPnpm,{recursive:true}); \
    const skipPrefix=['@prisma+dev@','@prisma+studio-core@','mysql2@','@electric-sql+','magicast@','@babel+','recast@','typescript@']; \
    const visited=new Set(); \
    function visit(id){ \
      if(visited.has(id)||skipPrefix.some(p=>id.startsWith(p))) return; \
      visited.add(id); \
      const nm=path.join(pnpmRoot,id,'node_modules'); \
      if(!fs.existsSync(nm)) return; \
      for(const ent of fs.readdirSync(nm)){ \
        const p1=path.join(nm,ent); \
        const items=ent.startsWith('@')?fs.readdirSync(p1).map(s=>path.join(p1,s)):[p1]; \
        for(const item of items){ \
          if(fs.lstatSync(item).isSymbolicLink()){ \
            const real=fs.realpathSync(item); \
            const rel=path.relative(pnpmRoot,real).split('/')[0]; \
            if(rel&&!rel.startsWith('..')) visit(rel); \
          } \
        } \
      } \
    } \
    const prismaReal=fs.realpathSync('/workspace/apps/api/node_modules/prisma'); \
    const rootId=path.relative(pnpmRoot,prismaReal).split('/')[0]; \
    visit(rootId); \
    for(const id of visited){ \
      cp.execFileSync('cp',['-a',path.join(pnpmRoot,id),path.join(outPnpm,id)]); \
    } \
    for(const rmRel of ['@prisma/dev','@prisma/studio-core','mysql2']){ \
      fs.rmSync(path.join(outPnpm,rootId,'node_modules',rmRel),{recursive:true,force:true}); \
    } \
    for(const id of visited){ \
      if(id.startsWith('@prisma+config@')) fs.rmSync(path.join(outPnpm,id,'node_modules/magicast'),{recursive:true,force:true}); \
    } \
    fs.symlinkSync('.pnpm/'+rootId+'/node_modules/prisma','/opt/prisma-cli/node_modules/prisma'); \
    const sc='/opt/prisma-cli/node_modules/@prisma/studio-core'; \
    fs.mkdirSync(sc+'/data',{recursive:true}); \
    fs.writeFileSync(sc+'/package.json',JSON.stringify({name:'@prisma/studio-core',exports:{'./data/*':'./data/*.js'}})); \
    for(const m of ['bff','mysql2','node-sqlite','postgresjs']) fs.writeFileSync(sc+'/data/'+m+'.js','module.exports={};'); \
    const dv='/opt/prisma-cli/node_modules/@prisma/dev'; \
    fs.mkdirSync(dv+'/internal',{recursive:true}); \
    fs.writeFileSync(dv+'/package.json',JSON.stringify({name:'@prisma/dev',exports:{'./internal/state':'./internal/state.js'}})); \
    fs.writeFileSync(dv+'/internal/state.js','module.exports={ServerState:{scan:async()=>[]}};'); \
    "

RUN printf '%s\n' \
    "const { defineConfig } = require('/opt/prisma-cli/node_modules/prisma/config');" \
    "module.exports = defineConfig({" \
    "  schema: 'prisma/schema.prisma'," \
    "  migrations: { path: 'prisma/migrations' }," \
    "  datasource: { url: process.env.DATABASE_URL ?? '' }," \
    "});" \
    > /prod/api/prisma.config.cjs

RUN rm -rf \
      /prod/api/node_modules/.pnpm/typescript@* \
      /prod/api/node_modules/typescript \
      /prod/api/node_modules/.pnpm/rxjs@*/node_modules/rxjs/src \
      /prod/api/node_modules/.pnpm/zod@*/node_modules/zod/src \
      /opt/prisma-cli/node_modules/.pnpm/prisma@*/node_modules/prisma/build/studio.* \
      /opt/prisma-cli/node_modules/.pnpm/prisma@*/node_modules/prisma/build/query_compiler_* \
      /opt/prisma-cli/node_modules/.pnpm/effect@*/node_modules/effect/dist/esm && \
    find /prod/api/node_modules -path "*/@prisma/client/runtime/*" \
      \( -name "*sqlserver*" -o -name "*cockroachdb*" -o -name "*mysql*" -o -name "*sqlite*" -o -name "query_compiler_small_*" -o -name "*.mjs" \) -delete && \
    find /prod/api/node_modules /opt/prisma-cli/node_modules \
      \( -name "*.d.ts" -o -name "*.d.mts" -o -name "*.d.cts" -o -name "*.map" -o -name "*.md" \) -delete && \
    find /prod/api/node_modules \
      \( -name "dist-es" -o -name "dist-types" -o -name "_esm5" -o -name "_esm2015" \) -type d -prune -exec rm -rf {} +

FROM node:22-alpine AS runner

ARG APP_VERSION=0.1.0
ARG GIT_COMMIT=dev

ENV NODE_ENV=production \
    API_PORT=3000 \
    APP_VERSION=${APP_VERSION} \
    GIT_COMMIT=${GIT_COMMIT}

WORKDIR /app

COPY --from=builder --chown=node:node /opt/prisma-cli /opt/prisma-cli
COPY --from=builder --chown=node:node /prod/api /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null 2>&1 || exit 1

CMD ["sh", "-c", "node /opt/prisma-cli/node_modules/prisma/build/index.js migrate deploy && exec node dist/main.js"]

