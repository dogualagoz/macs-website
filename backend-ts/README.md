# MACS Backend (`backend-ts`)

TypeScript/Bun backend for the MACS Club website, built with Bun `1.3.5`, Hono (`@hono/zod-openapi`), Zod, Drizzle ORM, `postgres` (Postgres.js), and Pino. Runs on port `8000` inside Docker (bound on host to `127.0.0.1:8010` via [docker-compose.yml](../docker-compose.yml)).

For production rollout, shadow verification, nginx cutover, monitoring, and rollback instructions, see [docs/backend-ts-cutover.md](../docs/backend-ts-cutover.md) and [deploy/nginx/README.md](../deploy/nginx/README.md).

## Requirements

- [Bun](https://bun.sh/) `1.3.5` (pinned via `packageManager` and CI)
- PostgreSQL `13+` (for integration tests and runtime)

## Quick Start

```bash
cd backend-ts
bun install --frozen-lockfile
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5434/macs_db"
export JWT_SECRET_KEY="$(openssl rand -hex 32)"
bun run migrate
bun run dev
```

In non-production (`NODE_ENV != "production"` unless overridden by `DOCS_ENABLED=false`), OpenAPI 3.1 / Swagger UI is served at `/docs/` (`/openapi.json`).

## Scripts (`package.json`)

| Script | Command | Purpose |
|---|---|---|
| `dev` | `bun --watch src/server.ts` | Start dev server with hot reload |
| `start` | `bun src/server.ts` | Start server (used by Docker `CMD`) |
| `migrate` | `bun src/db/migrate.ts` | Apply `drizzle/` SQL migrations (`0000_baseline.sql`, `0001_perf_indexes.sql`) |
| `typecheck` | `tsc --noEmit` | Run strict TypeScript typecheck |
| `lint` | `eslint .` | Run ESLint across TS sources and tests |
| `test` | `bun test src` | Run unit & security test suite |
| `test:int` | `bun test test/integration` | Run PostgreSQL integration suite (needs `TEST_DATABASE_URL` or local PG) |
| `test:contract` | `bun contract/run.ts` | Run contract parity runner |
| `test:bench` | `bun test bench` | Run cache/warmup benchmark tests |
| `verify:static` | `bunx tsc --noEmit && bunx eslint . && bun test src && bun test bench` | Static + unit + benchmark verification bundle |

Additional test & contract scripts:

- Contract harness tests: `bun test test/contract-harness.test.ts`
- Differential parity check: `bun contract/differential.ts`
- Read-only production shadow-diff: `OLD_URL=http://127.0.0.1:8000 NEW_URL=http://127.0.0.1:8010 bun contract/shadow-diff.ts --max-ids 100000`

## Environment Variables (`src/config/env.ts`)

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | *(required)* | `postgres://` or `postgresql://` URL with host |
| `JWT_SECRET_KEY` | *(required)* | **Minimum 16 characters** (`z.string().min(16)`) |
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `PORT` | `8000` | HTTP listen port (`1..65535`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | JWT expiry in minutes |
| `ADMIN_SECRET_KEY` | empty / `null` | Optional admin registration secret |
| `MAX_LOGIN_ATTEMPTS` | `5` | Per-account lockout threshold |
| `LOCKOUT_DURATION` | `15` | Lockout duration in minutes |
| `MIN_PASSWORD_LENGTH` | `6` | Minimum password length |
| `MAX_UPLOAD_SIZE` | `5242880` | Max file size in bytes (5 MiB) |
| `UPLOAD_DIR` | `static/uploads` | Upload directory (`/app/static/uploads` in Docker) |
| `STATIC_DIR` | `static` | Static directory (`/app/static` in Docker) |
| `CORS_ORIGINS` | merged with `DEFAULT_ORIGINS` | Comma-separated extra allowed origins |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |
| `RATELIMIT_ENABLED` | `true` | Enable in-process IP & route rate limiting |
| `RESPONSE_CACHE` | `true` | Enable bounded single-flight response cache |
| `NOMINATIM_USER_AGENT` | `MACS-Website/1.0 (contact@macs.com)` | Nominatim geocoding `User-Agent` |
| `RUN_MIGRATIONS` | `true` | Applied at container boot via `docker-entrypoint.sh` |
| `DOCS_ENABLED` | `NODE_ENV !== "production"` | Toggle `/docs/` and `/openapi.json` |

## Operator CLI (`scripts/`)

Run inside the container (`docker exec -i macs-backend-ts bun ...`) or locally with `DATABASE_URL` and `JWT_SECRET_KEY` set. Passwords are always read from `stdin` (never CLI flags):

```bash
# List users
bun scripts/list-users.ts [--json]

# Create an approved admin account (password via stdin)
printf '%s\n' '<STRONG_PASSWORD>' | bun scripts/create-admin.ts --email admin@macsclub.com.tr --full-name "Admin Name"

# Reset a user's password (password via stdin)
printf '%s\n' '<NEW_PASSWORD>' | bun scripts/reset-password.ts --email user@macsclub.com.tr

# Update approval status / role / active flag
bun scripts/set-user-access.ts --email user@macsclub.com.tr --status approved --role admin --active true
```

## Security & Runtime Behavior

- **Global rate limiter**: `1200/min` (burst `200`) per client IP (`src/security/config.ts`). `/uploads/*`, `/static/*`, and `/health*` bypass the global IP bucket while still running header/URL guards and security headers.
- **Write & route limits**: global write bucket `60/min`, plus strict per-route limits (login IP shield `20` failures / `15 min`, auth routes, upload `20/min`, ZIP export `3/hr`).
- **Timeouts & uploads**: generic handler timeout is `15s`; `POST /api/upload/` has a dedicated `120s` handler timeout with `MAX_UPLOAD_SIZE + 262144` streaming byte enforcement.
- **Static / Upload serving**: `GET` and `HEAD` share prefix containment validation and return matching `Content-Length`, `Content-Type`, and `Cache-Control` headers (`HEAD` uses `stat()` without reading file contents).
- **Safe logging & shutdown**: errors are logged via classified fields (`reqId`, `errorName`, SQLSTATE `code`, sanitized `path`) without raw error messages or secrets; `SIGTERM`/`SIGINT` stops cache warmup before draining (`cache.stop()` -> `server.stop(false)` -> `cache.drain()` -> `sql.end()`) and flushes Pino buffers even on forced-exit timeout.
