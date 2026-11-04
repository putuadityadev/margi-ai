# Deploying MARGI AI (single VPS)

Needs: a Linux VPS with Docker, a domain pointing at it (A record), ports 80 and 443 open.

1. Clone the repository and `cp deploy/production.env.example .env.production`, then fill it in
   (domain, database password, `ADMIN_EMAILS`, OpenRouter and TomTom keys, optional Google keys).
2. Build and start: `docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build`.
   The API applies database migrations on start.
3. Load the reviewed place catalogue once:
   `docker compose -f docker-compose.prod.yml --env-file .env.production run --rm api node dist/scripts/seed-catalog.js`
   then restart the API: `docker compose -f docker-compose.prod.yml restart api`.
   Until the catalogue is loaded the API refuses to start (there is no fallback data).
4. Sign up with an address listed in `ADMIN_EMAILS` to reach `/admin`.
5. Check `https://DOMAIN/api/health/ready`, then walk through Explore, Feed, Chat, a saved plan and a Copilot reply.

Updating: `git pull`, then rerun step 2. Back up the `postgres_data` volume regularly.
