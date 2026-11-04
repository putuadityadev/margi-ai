# Deploying MARGI AI (single VPS behind Traefik)

The stack in `docker-compose.prod.yml` is built for a host that already runs Traefik (for example
Dokploy). It adds its own Postgres (pgvector) and Redis and touches nothing else on the host: only
the `margi-web` container joins Traefik's `dokploy-network`.

Needs: Docker with Compose, Traefik with a `letsencrypt` resolver and an `redirect-to-https` file
middleware, an A record for the domain pointing at the server, ports 80 and 443 open.

1. `git clone https://github.com/putuadityadev/margi-ai.git /opt/margi/app && cd /opt/margi/app`
2. `cp deploy/production.env.example .env.production`, fill it in (`chmod 600`), keep
   `TRAEFIK_ENABLE=false` until DNS is ready.
3. Start the data stores and prepare the database (first time only):
   ```
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d margi-postgres margi-redis
   docker compose -f docker-compose.prod.yml --env-file .env.production build
   docker compose -f docker-compose.prod.yml --env-file .env.production run --rm margi-api \
     sh -c "node /opt/prisma-cli/node_modules/prisma/build/index.js migrate deploy && node dist/scripts/seed-catalog.js"
   ```
   The API refuses to start while the place catalogue is empty (there is no fallback data).
4. `docker compose -f docker-compose.prod.yml --env-file .env.production up -d`
5. When the DNS record resolves, set `TRAEFIK_ENABLE=true` and run step 4 again. Traefik then
   requests the certificate and redirects HTTP to HTTPS.
6. Sign up with an address listed in `ADMIN_EMAILS` to reach `/admin`.
7. Check `https://DOMAIN/api/health/ready`, then walk through Explore, Feed, Chat, a saved plan
   and a Copilot reply.

Backups: `deploy/backup.sh` writes a compressed dump and keeps 7 days; schedule it with cron.

Updating: `git pull`, rebuild (`build`), then `up -d`. Migrations run when the API starts.
