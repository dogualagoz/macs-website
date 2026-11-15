# Task 13 verification report

Candidate tested: `90bdbc398c4fb19185ec09d8aa307b79d6957359`; baseline: `620c94ab` in `/tmp/macs-task13-express` external git worktree. Branch: `feat/backend-ts`.

Task scope: final verification and new measurement artifacts only. No product logic, thresholds, contracts, frontend, Python backend or environment files changed. No push, remote server access or subagents. TDD not applicable: verification-only task.

## Method and environment

Bun 1.3.5; oha 1.17.0; Apple M3 Max, 14 logical/physical CPUs. Same isolated Postgres 13 container on localhost:5436, database `macs_bench_task13`, loaded by stdin from existing gitignored root `macs_db.sql`; no dump copied or committed. Full restore initially stopped at missing ACL role macs_admin; created that NOLOGIN role only in disposable Postgres, recreated DB, restored with ON_ERROR_STOP=1 successfully, applied existing migrations 0000/0001 once before both versions. No data reseeding between benchmark runs.

Order: Express cache OFF, Express cache ON, Hono cache OFF, Hono cache ON. Servers never overlap; old/new contract app containers stopped during benchmarks. Existing macs-db/macs-backend preserved per contract. Same production environment, rate limits disabled, cache flag explicit, same default logging, same bench/run.ts settings: seven endpoints, concurrency 50, 5s warmup then 20s measurement each, no headers/threshold adjustments. Every endpoint probed twice and consumed before each run; cache metadata collected honestly by bench/run.ts. CPU snapshots every 10s include server CPU, host uptime/load and top ten processes. Docker VM load includes benchmark Postgres work. No builds or test suites overlap measurements. System daemons and the user's existing apps remain active; idle laboratory conditions cannot be claimed.

## Production Docker proof

`docker build -t macs-backend-ts:v2-verify .` exit 0 (also new target rebuilt by docker compose up -d --build).
`docker run -d --name macs-v2-prod-check --network backend-ts_default -p 127.0.0.1:18010:8000 -e DATABASE_URL=$DOCKER_CONTRACT_DB_URL -e JWT_SECRET_KEY=contract-secret-key-that-is-long-enough -e RUN_MIGRATIONS=true macs-backend-ts:v2-verify`.
NODE_ENV=production inherited from image.

```text
docker exec macs-v2-prod-check id -u
10001
GET /health/ready
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Cache-Control: no-store
Vary: Accept-Encoding, Origin
{"status":"ok"}
GET /docs: 404
GET /openapi.json: 404
docker stop macs-v2-prod-check
macs-v2-prod-check
docker inspect -f '{{.State.ExitCode}}' macs-v2-prod-check
0
```

## Executed checks and output

`bun run verify:static` executes `bunx tsc --noEmit && bunx eslint . && bun test src && bun test bench`; exit 0.
`bash -n ../scripts/deploy-backend-ts.sh` and `shellcheck ../scripts/deploy-backend-ts.sh`: exit 0, no output. Local simulated deploy scenarios use fake git/docker/flock/sleep executables and assert exits plus command ordering; never execute the deployment against a real checkout/server. The repository has no existing standalone deploy dry-run test runner at this HEAD, so the nine scenarios were recreated in an isolated temporary directory.

### bun run verify:static

```text
$ bunx tsc --noEmit && bunx eslint . && bun test src && bun test bench
bun test v1.3.5 (1e86cebd)

src/app.test.ts:
(pass) GET / returns welcome [1.49ms]
(pass) GET /health [0.46ms]
(pass) system responses omit framework and automatic cache headers [0.09ms]
(pass) Hono fetch shell ignores forwarded spoofing [0.14ms]
(pass) global and write limiters use real IP and run before route parsing [4.00ms]
(pass) handler timeout returns JSON 503 with CORS and security headers [7.43ms]
(pass) production docs are disabled by default, and an explicit override enables them [9.43ms]
(pass) normalizing Content-Type preserves caller Request headers [0.92ms]
(pass) HEAD on a missing docs asset remains 404 rather than 405, and notFound precompiles route regexes once [1.29ms]
(pass) static and uploads mounts enforce resolved-prefix containment [0.10ms]
(pass) OpenAPI 3.1 info matches FastAPI [0.42ms]
(pass) all 63 operations document tags and responses [0.43ms]
(pass) seven described tags and OAuth2 password security [0.26ms]
(pass) form, JSON, multipart binary and ZIP metadata [0.23ms]
(pass) parameters and shared validation response [0.22ms]
(pass) two apps have independent registries and documents [19.96ms]
(pass) public local Swagger assets and docs bypass cache; redoc 404 [7.89ms]
(pass) exact /docs redirects to /docs/ and preserves the raw query string [0.22ms]
(pass) every relative Swagger HTML asset resolves successfully from /docs/ [3.85ms]
(pass) HEAD ZIP authenticates and lists but never resolves or opens file paths [4.67ms]

src/middleware/http.test.ts:
(pass) missing/non-Bearer Authorization: %s [1.96ms]
(pass) missing/non-Bearer Authorization: Basic secret [1.20ms]
(pass) missing/non-Bearer Authorization: bearer secret [0.74ms]
(pass) valid token loads the current user [1.32ms]
(pass) current user authorization: Kimlik doğrulanamadı [1.34ms]
(pass) current user authorization: Hesap aktif değil [1.24ms]
(pass) current user authorization: Hesabınız henüz onaylanmadı [1.09ms]
(pass) token errors preserve all four messages and Bearer challenge [5.83ms]
(pass) rate limit: 4th request is 429, counters are per-route and per-IP [1.42ms]
(pass) RATELIMIT_ENABLED=false allows 20 requests [2.04ms]
(pass) unknown path is JSON 404; known path unsupported method is 405 with Allow [1.56ms]
(pass) body >2 MB is 413 for JSON and form [4.54ms]
(pass) malformed JSON is FastAPI 422 [2.05ms]
(pass) PG 23505 maps to 409 [0.99ms]
(pass) PG 23503 maps to 409 [0.74ms]
(pass) PG 57014 maps to 503 [1.05ms]
(pass) Drizzle-wrapped PG 23505 maps to 409 [0.80ms]
(pass) Drizzle-wrapped PG 23503 maps to 409 [0.92ms]
(pass) Drizzle-wrapped PG 57014 maps to 503 [0.78ms]
(pass) plain and nested causes preserve PostgreSQL error mapping [1.49ms]
(pass) non-object, cyclic and excessive cause chains fall back to 500 [3.83ms]
(pass) unexpected error includes CORS headers and logs a stack [1.22ms]
(pass) HttpError headers are emitted with a single detail envelope [0.86ms]
(pass) every response carries security headers and validated request ID [3.28ms]
(pass) request completion logs exactly one line with correlation fields [1.44ms]
(pass) CORS allows configured origins, rejects others, preflight is 200 [1.05ms]
(pass) forwarded-for spoofing shares the default socket IP bucket [0.94ms]
(pass) non-PG inherited error code __proto__ stays a JSON 500 [0.79ms]
(pass) non-PG inherited error code constructor stays a JSON 500 [0.99ms]
(pass) non-PG inherited error code toString stays a JSON 500 [0.73ms]

src/config/env.test.ts:
(pass) parseEnv applies defaults [0.16ms]
(pass) parseEnv disables DOCS_ENABLED by default in production and enables otherwise [0.30ms]
(pass) parseEnv fails fast without JWT_SECRET_KEY [0.07ms]
(pass) parseEnv normalizes an empty ADMIN_SECRET_KEY to disabled [0.03ms]
(pass) parseEnv merges CORS_ORIGINS without duplicates [0.01ms]
(pass) parseEnv accepts uppercase LOG_LEVEL
(pass) parseEnv parses configured values and postgres URLs [0.20ms]
(pass) parseEnv disables boolean flags for off [0.04ms]
(pass) parseEnv disables boolean flags for false [0.03ms]
(pass) parseEnv disables boolean flags for 0
(pass) parseEnv enables boolean flags for on [0.01ms]
(pass) parseEnv enables boolean flags for true
(pass) parseEnv enables boolean flags for 1
(pass) parseEnv rejects invalid DATABASE_URL= [0.10ms]
(pass) parseEnv rejects invalid DATABASE_URL=https://db.test/x [0.03ms]
(pass) parseEnv rejects invalid DATABASE_URL=postgresql:// [0.01ms]
(pass) parseEnv rejects invalid JWT_SECRET_KEY=short [0.03ms]
(pass) parseEnv rejects invalid NODE_ENV=invalid [0.06ms]
(pass) parseEnv rejects invalid LOG_LEVEL=trace [0.02ms]
(pass) parseEnv rejects invalid PORT=65536 [0.02ms]
(pass) parseEnv rejects invalid PORT=1.5 [0.03ms]
(pass) parseEnv rejects invalid ACCESS_TOKEN_EXPIRE_MINUTES=0 [0.03ms]
(pass) parseEnv rejects invalid MAX_LOGIN_ATTEMPTS=-1 [0.04ms]
(pass) parseEnv rejects invalid LOCKOUT_DURATION=invalid [0.04ms]
(pass) parseEnv rejects invalid MIN_PASSWORD_LENGTH=0 [0.04ms]
(pass) parseEnv rejects invalid MAX_UPLOAD_SIZE=0 [0.02ms]
(pass) parseEnv rejects invalid UPLOAD_DIR= [0.05ms]
(pass) parseEnv rejects invalid STATIC_DIR= [0.05ms]
(pass) parseEnv rejects invalid RATELIMIT_ENABLED=invalid [0.05ms]
(pass) parseEnv rejects invalid RESPONSE_CACHE=invalid [0.03ms]
(pass) parseEnv rejects invalid RUN_MIGRATIONS=invalid [0.02ms]
(pass) parseEnv rejects invalid NOMINATIM_USER_AGENT=
(pass) parseEnv requires DATABASE_URL [0.08ms]
(pass) parseRunMigrations shares booleanFlag semantics for 0/off/false/1/on/true/unset [0.22ms]

src/security/security.test.ts:
(pass) security primitives > exact defaults
(pass) security primitives > single hop X-Real-IP only from private/loopback/test sockets
(pass) security primitives > token burst, fractional refill, cap, and LRU touch [0.64ms]
(pass) security primitives > fixed windows reset at boundary and remain bounded [0.15ms]
(pass) security primitives > login check precedes DB: twenty failures allowed, next blocked; window resets [0.13ms]
(pass) security primitives > login LRU checks refresh recency; successful checks do not count as failures [0.05ms]
(pass) security primitives > clean login probes cannot allocate entries or evict a blocked IP [0.08ms]
(pass) security primitives > checking an expired login entry deletes it without allocating a replacement [0.03ms]
(pass) security primitives > headers: API/docs policies, exact HTTPS only, remove disclosure [0.09ms]
(pass) security primitives > raw path/method guards and exact URL length boundary
(pass) security primitives > header count/UTF8 bytes boundaries (wire name + colon-space + CRLF) [0.38ms]
(pass) security primitives > bounded reader accepts exact/empty and cancels chunked overflow immediately [0.30ms]
(pass) security primitives > overflow remains 413 even if producer cancellation fails [0.10ms]
(pass) security primitives > dishonest small Content-Length cannot bypass streaming cap [0.09ms]
(pass) security primitives > Content-Length over limit rejected without pulling [0.07ms]
(pass) security primitives > body middleware preserves JSON/form validators, default cap, and 413 [1.71ms]
(pass) security primitives > handler timeout succeeds, propagates errors, and returns 503 [2.28ms]
(pass) security primitives > security logger allowlists fields and removes query/secret path segments
(pass) security primitives > security logs retain actual static routes and redact ids and free text [0.37ms]
(pass) security primitives > Hono route limit slowapi JSON and disable switch [0.47ms]

src/lib/native-validation.test.ts:
(pass) order: 401 precedes 422, including malformed JSON [2.04ms]
(pass) order: 403 precedes 422 [1.37ms]
(pass) bodyInvalid overrides malformed JSON and schema failure [0.96ms]
(pass) malformed field produces the entire FastAPI body [1.44ms]
(pass) status 204 skips serialization and sends empty body [1.21ms]
(pass) handler returning null sends JSON null [0.94ms]
(pass) Response leaves ownership with handler [0.66ms]
(pass) extra query params are ignored and parsed inputs reach handler [1.55ms]
(pass) form bodies are parsed before validation [1.11ms]
(pass) missing body field retains parent input in the entire 422 envelope [0.93ms]
(pass) protected route registration requires an injected user loader [0.24ms]
(pass) form-only route rejects JSON credentials as missing fields [0.83ms]
(pass) unauthenticated text body precedes media type validation [0.72ms]
(pass) rate limit precedes auth and params/query/body validation [2.98ms]
(pass) native OpenAPI hook retains raw input; JSON errors and overrides match FastAPI [1.50ms]
(pass) native param and query failures are tested separately (F11 validator ordering) [1.26ms]
(pass) legacy JSON route maps non-JSON media to a model_attributes_type 422 [0.77ms]
(pass) legacy JSON media types are case insensitive [0.89ms]

src/lib/cache.test.ts:
(pass) exported cache v2 constants match specification
(pass) cacheKey sorts query, ignores undefined values, and encodes separators without collisions
(pass) selectEncoding respects q=0 exclusions, quality weights, priority, and explicit identity exclusion
(pass) compressBytes skips payloads < 1024 bytes and precompresses >= 1024 bytes with lossless round-trip [1.44ms]
(pass) entry expires at ttl without extending on a hit and releases byteSize [0.10ms]
(pass) LRU evicts the least recently used at max
(pass) replacing a key refreshes LRU position, updates byteSize, and never exceeds capacity
(pass) byte cap evicts LRU entries when maxBytes is exceeded and rejects single entry > maxBytes
(pass) invalidate removes only mapped domains and updates byteSize
(pass) INVALIDATES includes embedded creator and member/project dependencies
(pass) generations advance for every mapped domain even with no entries
(pass) disabled cache never stores [0.29ms]
(pass) weakEtag is stable, body-sensitive, weak, and identical for string and Uint8Array [0.03ms]
(pass) getOrLoad coalesces 10 concurrent misses into 1 loader call and clears inFlight on rejection [17.68ms]
(pass) getOrLoad caches literal 'null' 200 payload (F2) but never caches non-cacheable or 404 results [0.14ms]
(pass) generation race guard (F29): invalidate during in-flight getOrLoad returns payload without caching [0.15ms]
(pass) warmupStartup fills up to 7 registered keys with max concurrency 2 [46.36ms]
(pass) invalidate re-warms only keys seen within recent 10-minute window with max concurrency 2 and respects stop/drain [82.81ms]
(pass) warmupRegistry is bounded by maxEntries/LRU and prunes expired/evicted registrations [0.38ms]
(pass) warmup failures report only safe classifications (keyHash + path, no query/PII/message/stack), walk error cause codes, fall back to logger.error, keep peers warming, and retry on next trigger [0.87ms]
(pass) empty invalidation targets do not even consult warmup clock [0.07ms]

src/lib/http-error.test.ts:
(pass) HttpError preserves validation items as detail without a wrapper [0.04ms]
(pass) unauthorized carries the detail and Bearer challenge [0.08ms]

src/lib/slug.test.ts:
(pass) createSlug(Yapay Zekâ & Öğrenme Günü) matches python unidecode [0.23ms]
(pass) createSlug(İstanbul Şişli ÇAĞRI) matches python unidecode [0.05ms]
(pass) createSlug(ığüşöç IĞÜŞÖÇ) matches python unidecode [0.01ms]
(pass) createSlug(C++ / C# Atölyesi) matches python unidecode
(pass) createSlug(  --Merhaba   Dünya!!  ) matches python unidecode [0.01ms]
(pass) createSlug(München Straße) matches python unidecode
(pass) createSlug(Kahve ☕ Sohbeti) matches python unidecode [0.02ms]
(pass) createSlug(½ maraton №5) matches python unidecode [0.02ms]
(pass) createSlug(ﬁnal ’tırnak’ “çift”) matches python unidecode [0.01ms]
(pass) createSlug(Ǆ ǅ æ Æ ß þ) matches python unidecode
(pass) createSlug(é café) matches python unidecode
(pass) createSlug(€100 Ödül) matches python unidecode
(pass) createSlug() matches python unidecode
(pass) createSlug(!!!) matches python unidecode
(pass) createSlug(MACS 2026 Bahar Tanışma) matches python unidecode
(pass) createSlug(Hackathon'26: 48 Saat) matches python unidecode
(pass) createSlug(Ağ Güvenliği 101 — CTF) matches python unidecode [0.01ms]
(pass) createSlug(a_b.c/d\e) matches python unidecode
(pass) createSlug(ÀÁÂÃÄÅ àáâãäå Ññ Øø Łł Đđ) matches python unidecode [0.02ms]
(pass) createSlug(Œuvre cœur) matches python unidecode
(pass) transliterate maps Latin letters, symbols and combining marks [0.04ms]
(pass) resolveSlug handles collisions and empty bases [0.07ms]
(pass) non-latin title yields empty base [0.01ms]

src/lib/public-cache.test.ts:
(pass) public cache negotiates compressed variants and consistent conditional responses [2.63ms]

src/lib/jwt.test.ts:
(pass) accepts python-jose token [0.78ms]
(pass) sign/verify round trip, exp = now + minutes [0.40ms]
(pass) expired [0.40ms]
(pass) expiration boundary is rejected [0.23ms]
(pass) bad signature [0.10ms]
(pass) garbage [0.03ms]
(pass) missing or empty sub: %s [0.23ms]
(pass) missing or empty sub:  [0.13ms]
(pass) rejects algorithms other than HS256 [0.15ms]
(pass) strips Bearer prefix [0.09ms]
(pass) rejects signed tokens with missing or wrong claims: {"sub":"a@b.co","exp":4102444800} [0.21ms]
(pass) rejects signed tokens with missing or wrong claims: {"sub":"a@b.co","role":"admin"} [0.12ms]
(pass) rejects signed tokens with missing or wrong claims: {"sub":"a@b.co","role":123,"exp":4102444800} [0.07ms]
(pass) rejects signed tokens with missing or wrong claims: {"sub":"a@b.co","role":"admin","exp":"4102444800"} [0.07ms]
(pass) rejects non-string subject in a valid HS256 token [0.16ms]
(pass) rejects a tampered payload [0.13ms]

src/lib/storage.test.ts:
(pass) local disk creates directory, saves bytes, sorted flat regular files only, removes idempotently [2.77ms]
(pass) localDiskStorage rejects traversal on every method [0.73ms]
(pass) signature .jpg <Buffer ff d8 ff> → true [0.24ms]
(pass) signature .jpeg <Buffer ff d8 ff> → true [0.36ms]
(pass) signature .png <Buffer 89 50 4e 47 0d 0a 1a 0a> → true [0.29ms]
(pass) signature .gif <Buffer 47 49 46 38 37 61> → true [0.29ms]
(pass) signature .gif <Buffer 47 49 46 38 39 61> → true [0.27ms]
(pass) signature .webp <Buffer 52 49 46 46 31 32 33 34 57 45 42 50> → true [0.19ms]
(pass) signature .webp <Buffer 52 49 46 46 31 32 33 34 57 41 56 45> → false [0.45ms]
(pass) signature .webp <Buffer 52 49 46 46 31 32 33 34 57 45 42> → false [0.16ms]
(pass) signature .png <Buffer 89 50 4e> → false [0.32ms]
(pass) signature .png <Buffer 4d 5a 20 6e 6f 74 20 61 20 70 6e 67> → false [0.32ms]
(pass) signature .bmp <Buffer 42 4d> → false [0.39ms]
(pass) signature .toString <Buffer 78> → false [0.29ms]
(pass) saveImage lowercases extension and validates before any write [1.30ms]

src/lib/password.test.ts:
(pass) verifies passlib hash [204.21ms]
(pass) rejects wrong password [197.11ms]
(pass) 72-byte truncation matches bcrypt 4.0.1 [605.70ms]
(pass) truncation counts UTF-8 bytes, not characters [402.46ms]
(pass) truncation may cut inside a multibyte character [579.51ms]
(pass) hashPassword truncates ASCII input before Bun can prehash it [585.37ms]
(pass) malformed or empty input returns false, never throws [0.21ms]
(pass) hashPassword emits a cost-12 bcrypt hash and verifies [390.23ms]

src/lib/datetime.test.ts:
(pass) pgToNaiveIso(2026-05-01 11:00:00) preserves wall time and microseconds
(pass) pgToNaiveIso(2026-05-01 11:00:00.5) preserves wall time and microseconds
(pass) pgToNaiveIso(2026-05-01T11:00:00) preserves wall time and microseconds
(pass) pgToNaiveIso(2026-05-01T11:00:00.123456) preserves wall time and microseconds
(pass) pgToNaiveIso(%s) preserves wall time and microseconds
(pass) pgToUtcIso(2026-05-01 11:00:00.123456+00) handles text and json_agg formats
(pass) pgToUtcIso(2026-05-01 11:00:00+00) handles text and json_agg formats
(pass) pgToUtcIso(2026-05-01 11:00:00.12+00) handles text and json_agg formats
(pass) pgToUtcIso(2026-05-01T11:00:00.123456+00:00) handles text and json_agg formats
(pass) pgToUtcIso(2026-05-01T11:00:00Z) handles text and json_agg formats
(pass) pgToUtcIso(%s) handles text and json_agg formats
(pass) pgToUtcIso rejects non-UTC or missing offsets: 2026-05-01 14:00:00+03
(pass) pgToUtcIso rejects non-UTC or missing offsets: 2026-05-01T14:00:00+03:00
(pass) pgToUtcIso rejects non-UTC or missing offsets: 2026-05-01 11:00:00
(pass) parseDateTimeInput(2026-05-01T10:00:00) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-05-01T10:00) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-05-01 10:00:00.250) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-05-01T10:00:00Z) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-05-01T10:00:00+03:00) produces a naive UTC PG literal [0.56ms]
(pass) parseDateTimeInput(2026-01-01T01:30:00+03:00) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-05-01) produces a naive UTC PG literal
(pass) parseDateTimeInput(2024-02-29T23:59:59.123456-02:30) produces a naive UTC PG literal
(pass) parseDateTimeInput(0099-01-01T00:00:00) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-05-01T10:00:00.000000) produces a naive UTC PG literal
(pass) parseDateTimeInput rejects invalid date
(pass) parseDateTimeInput rejects invalid date yarin
(pass) parseDateTimeInput rejects invalid date 2026-13-01T00:00:00
(pass) parseDateTimeInput rejects invalid date 2026-02-30T00:00:00
(pass) parseDateTimeInput rejects invalid date 2026-05-01T25:00:00
(pass) parseDateTimeInput rejects invalid date 2026-00-01
(pass) parseDateTimeInput rejects invalid date 2026-01-00
(pass) parseDateTimeInput rejects invalid date 2025-02-29
(pass) parseDateTimeInput rejects invalid date 2026-05-01T10:60:00
(pass) parseDateTimeInput rejects invalid date 2026-05-01T10:00:60
(pass) parseDateTimeInput rejects invalid date 2026-05-01T10:00:00+24:00
(pass) parseDateTimeInput rejects invalid date 2026-05-01T10:00:00+03:60
(pass) parseDateTimeInput rejects invalid date 2026-05-01T10:00:00junk
(pass) parseDateTimeInput rejects invalid date 0000-01-01
(pass) parseDateTimeInput rejects invalid date 2026-05-01T10:00:00

(pass) slugTimestamp uses UTC

src/lib/validation.test.ts:
(pass) missing body field
(pass) query int parsing
(pass) query le bound
(pass) query ge bound
(pass) qInt default + absent
(pass) qInt rejects floats and blanks [0.89ms]
(pass) qBool [0.02ms]
(pass) enum [0.25ms]
(pass) string bounds [0.23ms]
(pass) custom refine → value_error [0.24ms]
(pass) path int [0.08ms]
(pass) nested array loc
(pass) qStr normalizes empty and absent values [0.27ms]
(pass) query helpers reject non-scalar values
(pass) query defaults apply only when absent
(pass) datetime input becomes a PostgreSQL literal [0.18ms]
(pass) validationError stores items without double nesting
(pass) primitive type errors and missing query input [0.20ms]
(pass) bodyInt matches Pydantic 2.11.7 lax int accept, reject, and error-type table [0.27ms]
(pass) intentional int4 safety deviation: reject integers beyond Number.MAX_SAFE_INTEGER (Pydantic accepts; old DB writes fail) [0.26ms]
(pass) bodyBool matches Pydantic lax aliases, defaults, nullability and error types [0.38ms]
(pass) bodyFloat matches Pydantic coordinate parsing and bounded error types [0.03ms]
(pass) qBool accepts Pydantic single-letter query aliases

 271 pass
 0 fail
 1517 expect() calls
Ran 271 tests across 14 files. [3.51s]
bun test v1.3.5 (1e86cebd)

bench/compare.test.ts:
(pass) passes when p95 and RPS equal the baseline [1.88ms]
(pass) fails on slower p95 even with high RPS
(pass) fails on lower RPS even with low p95 [0.21ms]
(pass) fails on missing endpoint [0.05ms]
(pass) fails when successRate is below 0.999 [0.04ms]
(pass) accepts successRate of exactly 0.999
(pass) 2x target does not affect gate and respects custom multiplier [0.10ms]
(pass) every endpoint must pass
(pass) empty baseline, extra endpoint, invalid numbers and invalid multiplier fail closed [0.24ms]
(pass) CLI reads benchmark envelopes and reports pass, target miss and fail exit codes [64.78ms]
(pass) CLI rejects cached and missing cache metadata, and informational mode never passes a gate [221.85ms]

bench/run.test.ts:
(pass) two-request cache probe observes [ "MISS", "MISS" ] as false [1.98ms]
(pass) two-request cache probe observes [ "MISS", "HIT" ] as true [1.03ms]
(pass) two-request cache probe observes [ "HIT", "HIT" ] as true [1.03ms]
(pass) two-request cache probe observes [ undefined, undefined ] as false [0.95ms]
(pass) cache probe rejects non-200 responses rather than asserting cache-off [0.99ms]

 16 pass
 0 fail
 76 expect() calls
Ran 16 tests across 2 files. [319.00ms]
```

### bun test test/contract-harness.test.ts

```text
bun test v1.3.5 (1e86cebd)

test/contract-harness.test.ts:
(pass) normalization preserves supported 422 msg/input and strips only P4 metadata [1.31ms]
(pass) normalization changes volatile values and unordered lists only [0.15ms]
(pass) deviation IDs are registered and unknown IDs fail closed [0.21ms]
(pass) matcher requires method, pathname, query and exact expected response shape
(pass) user pagination and redoc deviations do not approve unrelated differences
(pass) new-side unhandled 500 is an unexpected differential diff: /projects?status=X [1.29ms]
(pass) new-side unhandled 500 is an unexpected differential diff: /projects/admin?status=X
(pass) new-side unhandled 500 is an unexpected differential diff: /users?skip=-1
(pass) new-side unhandled 500 is an unexpected differential diff: /users?limit=-1
(pass) new-side unhandled 500 is an unexpected differential diff: /health
(pass) ZIP normalization ignores container metadata but preserves entry bytes and names
(pass) differential compares JSON and ZIP as separate formats and detects regressions [0.55ms]
(pass) client requires target configuration and rejects reset URLs outside isolated databases [83.67ms]
(pass) project role deviation k approves only role values on project GET responses [0.44ms]
(pass) sponsor update deviation l approves only PUT /sponsors/:id with old 500 and new 422 [0.24ms]
(pass) shared compare module passes raw responses to approvedDeviation and validates record IDs [0.26ms]
(pass) deviation n matches only raw static traversal, with exact 404 to 400 envelopes
(pass) deviation m is restricted to GET docs paths and approved statuses [0.15ms]

 18 pass
 0 fail
 154 expect() calls
Ran 18 tests across 1 file. [99.00ms]
```

### bun test test/integration (default isolated PG localhost:5436/macs_test)

```text
bun test v1.3.5 (1e86cebd)

test/integration/migrate.test.ts:
(pass) baseline on empty DB reproduces contract/schema.sql [128.92ms]
(pass) second run applies nothing [44.30ms]
(pass) on alembic-managed DB at head: baseline is a no-op [163.77ms]
(pass) refuses when alembic_version is not head [26.66ms]
(pass) refuses snapshot with empty alembic_version and no completed baseline [26.78ms]
(pass) refuses unknown state: users table exists, no alembic_version, no __bun_migrations [16.05ms]
(pass) an empty ledger does not authorize an empty alembic_version [24.91ms]
(pass) file starting with "-- no-transaction" runs outside a transaction [46.42ms]
(pass) failed transactional baseline rolls back DDL and ledger insert, releases lock [35.05ms]
(pass) ledger insert failure rolls back the complete baseline [35.93ms]
(pass) concurrent pools serialize migrations and release the session lock [165.50ms]
(pass) migration restores the reserved session message setting [45.29ms]
(pass) CLI RUN_MIGRATIONS=0 skips without a reachable DB [81.32ms]
(pass) CLI RUN_MIGRATIONS=off skips without a reachable DB [67.92ms]
(pass) CLI RUN_MIGRATIONS=false skips without a reachable DB [64.44ms]
(pass) CLI RUN_MIGRATIONS=OFF skips without a reachable DB [61.84ms]
(pass) CLI RUN_MIGRATIONS=FALSE skips without a reachable DB [61.69ms]
(pass) CLI RUN_MIGRATIONS=1 runs migrations when enabled or unset [107.67ms]
(pass) CLI RUN_MIGRATIONS=on runs migrations when enabled or unset [112.56ms]
(pass) CLI RUN_MIGRATIONS=true runs migrations when enabled or unset [102.39ms]
(pass) CLI RUN_MIGRATIONS=unset runs migrations when enabled or unset [105.02ms]
(pass) CLI rejects invalid RUN_MIGRATIONS flag [61.78ms]
(pass) no-transaction splits semicolons followed by spaces, tabs and CRLF [46.87ms]
(pass) 0001 creates the five expected valid indexes, matches schema and is idempotent [69.65ms]
(pass) concurrent migration rebuilds its invalid index and preserves unrelated invalid indexes [55.90ms]
(pass) concurrent migration refuses to record an index that remains invalid [44.33ms]
(pass) concurrent migration refuses to record an index that remains missing [43.96ms]
(pass) failed concurrent build leaves no applied ledger row [39.22ms]
(pass) no-transaction disables timeout and restores settings after failure=%s [182.06ms]
(pass) no-transaction disables timeout and restores settings after failure=%s [177.21ms]

test/integration/required-bodies.test.ts:
(pass) auth registration requires body; empty login form reports missing credentials [25.76ms]
(pass) users body routes require body while query-only profile PUT accepts none [18.38ms]
(pass) sponsors create, partial update and geocode require body without Content-Type [15.65ms]
(pass) members create and partial update require body without Content-Type [13.02ms]
(pass) uploads missing body reports missing file without Content-Type [8.12ms]

test/integration/security.test.ts:
(pass) socket IP ignores XFF; loopback real-IP splits global/write buckets and LRU eviction resets only evicted IPs [21.96ms]
(pass) 21st failed login blocks before SQL, other IP and account lockout stay independent [1094.56ms]
(pass) size guards, chunked body and handler timeout produce safe security logs [122.40ms]
(pass) idleTimeout closes a stalled keepalive TCP client [3270.38ms]
(pass) security headers, CORS on successes/errors and intentional error logging [20.53ms]
(pass) production docs toggle, path/method sanitation and auth before validation [41.06ms]

test/integration/auth-users.test.ts:
(pass) auth/users database integration > unconfigured admin registration returns exact 500 before querying users [11.34ms]
(pass) auth/users database integration > unconfigured admin registration preserves validation and rate limit precedence [8.08ms]
(pass) auth/users database integration > 11th login in a minute returns exact 429 [29.65ms]
(pass) auth/users database integration > user list uses two public-only SQL queries including authentication [12.11ms]
(pass) auth/users database integration > expired lockout unlocks with SQL clock even with skewed token clock [218.46ms]
(pass) auth/users database integration > concurrent failed logins do not lose increments or bypass lockout [1033.07ms]
(pass) concurrent createUser calls map the unique violation to duplicate-email 400 [216.16ms]
(pass) serializeUser coerces NULL counter, preserves microseconds, and excludes credentials [10.20ms]
(pass) every user UPDATE refreshes updated_at including CLI services and auth mutations [830.50ms]
(pass) SQL lockout includes a NULL timestamp reset and configured duration boundary [420.67ms]
(pass) list ties use id descending and pagination returns the full total [7.47ms]
(pass) login shield check and failures require enabled POST login [13.17ms]
(pass) PG user JSON is one credential-free CTE with UTC precision and empty-page total [9.87ms]
(pass) login shield rejects before validation and DB and receives resolved IP [6.70ms]
(pass) native JSON validation preserves original input with mixed-case content type [8.86ms]
(pass) user aggregation explicitly orders equal timestamps by descending id [7.79ms]

test/integration/events.test.ts:
(pass) events database integration > public list uses one joined SQL, never selects credentials, and ignores Authorization [14.28ms]
(pass) events database integration > featured flagged and fallback reads each use one SQL [10.81ms]
(pass) events database integration > category delete rollback leaves event references intact when repo DELETE fails [9.11ms]
(pass) events database integration > PG JSON coerces NULL flags without losing datetime microseconds [8.05ms]
(pass) events database integration > invalid create bodies retain custom 400 after auth [9.20ms]
(pass) events database integration > body-model event routes reject absent bodies without Content-Type [14.88ms]
(pass) events database integration > empty featured is 200 null while missing detail is 404 [8.64ms]
(pass) events database integration > create accepts datetime-local, Z and explicit offsets [23.19ms]
(pass) events database integration > slug race maps real unique violation to 409 and preserves one row [14.39ms]
(pass) events database integration > concurrent featured writes and failed featured updates preserve exactly one featured event [20.99ms]
(pass) events database integration > empty sort and equal values have deterministic id ASC tie-breaking [12.85ms]
(pass) events database integration > past first flagged event triggers fallback even if a later flagged event is upcoming [10.24ms]

test/integration/members-sponsors.test.ts:
(pass) members and sponsors database integration > sponsor reads build ordered JSON in exactly one SQL with slash parity [15.81ms]
(pass) members and sponsors database integration > NULL sponsor booleans serialize to false while nullable fields remain null [9.74ms]
(pass) members and sponsors database integration > NULL sponsor active rows never match false [10.70ms]
(pass) members and sponsors database integration > geocode preserves sponsor cache generation and entries [10.90ms]
(pass) members and sponsors database integration > member public reads build PG JSON in exactly one query without user_id [11.39ms]
(pass) members and sponsors database integration > leaderboard issues exactly one aggregate SQL and returns required counts [9.69ms]
(pass) members and sponsors database integration > public lists use at most two SQL, project memberships included, and no credential/user_id projection [10.37ms]
(pass) members and sponsors database integration > member writes invalidate members and projects only after commit; rollback keeps caches warm [17.50ms]
(pass) members and sponsors database integration > member deletion cascades only its memberships in the database [16.03ms]
(pass) members and sponsors database integration > member serializer coerces NULL active to false and preserves timestamp precision [8.26ms]
(pass) members and sponsors database integration > NULL contribution_count serializes to zero and SUM ignores it [11.16ms]
(pass) members and sponsors database integration > leaderboard excludes members with only filtered projects and breaks aggregate ties by id [9.01ms]
(pass) members and sponsors database integration > members with tied creation dates order by descending id [7.66ms]
(pass) members and sponsors database integration > sponsor categories include inactive sponsors, exclude empty category and support both slash forms [10.19ms]
(pass) members and sponsors database integration > invalid sponsor update is rejected with 422 before writing and preserves cached GET /sponsors/:id [18.58ms]
(pass) geocode with injected upstream (no real network) > success maps fields and sends exact URL parameters, User-Agent and timeout signal [8.13ms]
(pass) geocode with injected upstream (no real network) > geocode creates a five-second AbortSignal timeout [7.51ms]
(pass) geocode with injected upstream (no real network) > configured geocode User-Agent is forwarded [7.63ms]
(pass) geocode with injected upstream (no real network) > empty upstream array returns exact 404 [6.91ms]
(pass) geocode with injected upstream (no real network) > upstream AbortError returns exact 504 [7.35ms]
(pass) geocode with injected upstream (no real network) > upstream TimeoutError returns exact 504 [11.19ms]
(pass) geocode with injected upstream (no real network) > upstream network returns exact logged 500 [8.97ms]
(pass) geocode with injected upstream (no real network) > upstream http503 returns exact logged 500 [9.07ms]
(pass) geocode with injected upstream (no real network) > malformed upstream JSON returns the logged service error [8.52ms]
(pass) geocode with injected upstream (no real network) > invalid geocode shape {"payload":{"unexpected":true}} retains the legacy unhandled 500 behavior [7.42ms]
(pass) geocode with injected upstream (no real network) > invalid geocode shape {"payload":[null]} retains the legacy unhandled 500 behavior [8.31ms]
(pass) geocode with injected upstream (no real network) > invalid geocode shape {"payload":["bad"]} retains the legacy unhandled 500 behavior [7.22ms]
(pass) geocode with injected upstream (no real network) > invalid geocode shape {"payload":[{}]} retains the legacy unhandled 500 behavior [8.98ms]
(pass) geocode with injected upstream (no real network) > invalid geocode shape {"payload":[{"lat":"invalid","lon":"29","display_name":"İstanbul"}]} retains the legacy unhandled 500 behavior [8.26ms]
(pass) geocode with injected upstream (no real network) > invalid geocode shape {"payload":[{"lat":"41","lon":"29"}]} retains the legacy unhandled 500 behavior [9.58ms]
(pass) geocode with injected upstream (no real network) > authentication and input validation happen before upstream fetch [8.11ms]
(pass) geocode with injected upstream (no real network) > geocode rate limit is ten per minute [19.15ms]

test/integration/cache.test.ts:
(pass) public GET sets headers; identical and reordered queries HIT with zero SQL [12.49ms]
(pass) different query values and paths never share a response [10.25ms]
(pass) If-None-Match handles lists, whitespace, strong/weak tags and wildcard with no body [8.65ms]
(pass) Authorization garbage bypasses cache reads/writes and conditional responses [10.27ms]
(pass) Authorization valid bypasses cache reads/writes and conditional responses [12.60ms]
(pass) Authorization empty bypasses cache reads/writes and conditional responses [11.98ms]
(pass) /users/me is no-store with or without credentials [8.72ms]
(pass) /users is no-store with or without credentials [8.73ms]
(pass) /auth/missing is no-store with or without credentials [7.34ms]
(pass) /events/admin is no-store with or without credentials [8.82ms]
(pass) /projects/admin is no-store with or without credentials [10.28ms]
(pass) write invalidates own domain while leaving unrelated domains warm [12.16ms]
(pass) validation and rolled-back writes do not invalidate [21.75ms]
(pass) member rename invalidates embedded project members [14.13ms]
(pass) project soft delete invalidates leaderboard and 204 member delete invalidates projects [21.14ms]
(pass) user rename invalidates events creator [11.45ms]
(pass) login success=%s invalidates events after committed login metadata changes [215.73ms]
(pass) login success=%s invalidates events after committed login metadata changes [216.59ms]
(pass) login without a committed write leaves cache warm [15.50ms]
(pass) failed-login invalidation callback runs after the real SQL COMMIT [215.86ms]
(pass) expired lockout reset commits and invalidates even when inactive login is rejected [226.76ms]
(pass) TTL expiry reruns the public handler and preserves conditional HTTP semantics [11.55ms]
(pass) HEAD bypasses shared cache and leaves warm GET entries intact [11.99ms]
(pass) non-200 public route and JSON null retain correct eligibility [7.19ms]
(pass) 404 and 422 responses are no-store and never cached [11.27ms]
(pass) RESPONSE_CACHE=false disables application storage while retaining ETag/304 [11.70ms]
(pass) health/system endpoint / is no-store [6.86ms]
(pass) health/system endpoint /health is no-store [7.52ms]
(pass) health/system endpoint /health/ready is no-store [7.44ms]
(pass) paused GET cannot repopulate stale data after a committed write with an empty cache [12.14ms]
(pass) write invalidation waits until its transaction commits [12.83ms]
(pass) cache HIT still applies query validation and rate limits [7.12ms]
(pass) v2 cached byte variants and uncached authorized compression [15.93ms]
(pass) 20 concurrent project misses execute exactly one SQL query [10.12ms]
(pass) unknown query spam shares one normalized cache key [11.10ms]
(pass) seven startup benchmark keys match HTTP keys and invalidation rewarms sponsors [18.49ms]

test/integration/db.test.ts:
(pass) session timezone is UTC [2.82ms]
(pass) statement_timeout is 10s [0.54ms]
(pass) timestamps come back as strings [0.47ms]
(pass) raw sql Date parameters preserve the exact UTC instant [2.75ms]
(pass) raw sql naive timestamp strings retain wall time and microseconds [2.35ms]
(pass) counter counts statements [2.48ms]
(pass) GET /health/ready 200 when DB up [1.78ms]
(pass) GET /health/ready 503 when DB down [2.32ms]
(pass) readiness returns 503 within two seconds when the pool is occupied [2025.00ms]
(pass) Drizzle schema preserves timestamp strings, enums and server defaults [17.03ms]
(pass) tokenFor signs claims using the testDeps secret [0.30ms]

test/integration/explain.test.ts:
(pass) benchmark capture records exact SQL and bindings and restores debug on success and failure [6.76ms]

test/integration/scripts.test.ts:
(pass) admin CLI subprocesses > create-admin creates approved admin that can log in using only first stdin line [510.96ms]
(pass) admin CLI subprocesses > create-admin normalizes mixed-case domains and rejects the normalized duplicate [567.69ms]
(pass) admin CLI subprocesses > reset-password normalizes the mixed-case domain of an API-registered user [920.21ms]
(pass) admin CLI subprocesses > set-user-access normalizes the mixed-case domain of an API-registered user [496.87ms]
(pass) admin CLI subprocesses > duplicate email exits 1 [78.48ms]
(pass) admin CLI subprocesses > rejects password-bearing flag --password [60.07ms]
(pass) admin CLI subprocesses > rejects password-bearing flag --password [58.18ms]
(pass) admin CLI subprocesses > rejects password-bearing flag --new-password [59.04ms]
(pass) admin CLI subprocesses > rejects password-bearing flag --hashed-password [60.67ms]
(pass) admin CLI subprocesses > configured minimum uses exact Turkish error [75.72ms]
(pass) admin CLI subprocesses > reset-password clears lockout and rotates password timestamp [714.60ms]
(pass) admin CLI subprocesses > reset-password unknown email exits 2 [79.28ms]
(pass) admin CLI subprocesses > reset-password validates minimum before changing credentials [278.88ms]
(pass) admin CLI subprocesses > set-user-access approves pending user [286.37ms]
(pass) admin CLI subprocesses > set-user-access maps both active values and updates role [148.94ms]
(pass) admin CLI subprocesses > set-user-access unknown email exits 2 [79.69ms]
(pass) admin CLI subprocesses > set-user-access rejects absent change flags and invalid values [219.41ms]
(pass) admin CLI subprocesses > list-users --json returns seven public UserResponses [74.35ms]
(pass) admin CLI subprocesses > list-users renders table and empty result [141.19ms]
(pass) admin CLI subprocesses > list-users includes users beyond its first service page [76.52ms]
(pass) admin CLI subprocesses > pipe passwords preserve spaces and support CRLF or EOF without newline [1409.78ms]
(pass) admin CLI subprocesses > invalid and missing email report field name [170.42ms]
(pass) admin CLI subprocesses > rejects unknown, positional and duplicate arguments without leaking values [219.34ms]
(pass) admin CLI subprocesses > password input requires a nonempty first line [128.73ms]
(pass) admin CLI subprocesses > every script refuses missing DATABASE_URL [224.68ms]
(pass) admin CLI subprocesses > database failures have clear safe stderr and exit 1 [68.98ms]
(pass) admin CLI subprocesses > TTY password input disables echo and handles match [554.17ms]
(pass) admin CLI subprocesses > TTY password input disables echo and handles mismatch [306.39ms]
(pass) admin CLI subprocesses > TTY password input disables echo and handles interrupt [301.20ms]
(pass) admin CLI subprocesses > TTY password input disables echo and handles eof [308.24ms]

test/integration/projects.test.ts:
(pass) projects database integration > list embeds members in exactly 1 CTE SQL independent of five projects and membership count [25.10ms]
(pass) projects database integration > featured, detail, slug and project members use at most 2 SQL [17.45ms]
(pass) projects database integration > create is atomic including project insert, earlier memberships and featured flags [24.27ms]
(pass) projects database integration > update is atomic including scalar fields, old memberships and featured flags [19.70ms]
(pass) projects database integration > used category deletion nulls all associated projects including hidden ones and stamps updated_at [13.20ms]
(pass) projects database integration > category delete rollback preserves project categories and timestamps if delete fails [10.72ms]
(pass) projects database integration > admin domain list also uses exactly one CTE SQL and preserves inactive projects [8.43ms]
(pass) projects database integration > admin HTTP list counts auth plus one CTE [11.11ms]
(pass) projects database integration > missing and deleted project members return null and HTTP 404 (F15) [11.16ms]
(pass) projects database integration > every required body rejects missing JSON after authentication [13.82ms]
(pass) projects database integration > PG JSON coerces NULL project booleans and json_agg member timestamps retain UTC microseconds [17.03ms]
(pass) projects database integration > body integer and boolean coercions apply to category, memberships and contributions [30.26ms]
{"level":50,"time":1794741720904,"pid":75893,"hostname":"Yusuf-MacBook-Pro-2.local","err":{"type":"Error","message":"Project status is null","stack":"Error: Project status is null\n    at <anonymous> (/Users/yusufefetasdelen/Documents/GitHub/macs-website/backend-ts/src/modules/projects/service.ts:52:42)\n    at processTicksAndRejections (native:7:39)"},"reqId":"a451edb8-88b4-4b73-b6aa-62cb1aa06eb5","msg":"Unhandled request error"}
(pass) projects database integration > null status update preserves serialization failure and rollback [12.96ms]
(pass) projects database integration > tied timestamps order by descending id; empty page preserves total [11.26ms]
(pass) maximum safe skip produces a bigint page without overflow [9.01ms]

test/integration/sql-json.test.ts:
(pass) sql-json PG13 golden parity > sqlNaiveIso(2026-05-01 11:00:00) matches pgToNaiveIso -> 2026-05-01T11:00:00 [4.59ms]
(pass) sql-json PG13 golden parity > sqlNaiveIso(2026-05-01 11:00:00.5) matches pgToNaiveIso -> 2026-05-01T11:00:00.500000 [0.75ms]
(pass) sql-json PG13 golden parity > sqlNaiveIso(2026-05-01 11:00:00.12) matches pgToNaiveIso -> 2026-05-01T11:00:00.120000 [0.81ms]
(pass) sql-json PG13 golden parity > sqlNaiveIso(2026-05-01 11:00:00.123456) matches pgToNaiveIso -> 2026-05-01T11:00:00.123456 [0.77ms]
(pass) sql-json PG13 golden parity > sqlNaiveIso(2026-05-01 11:00:00.000001) matches pgToNaiveIso -> 2026-05-01T11:00:00.000001 [0.67ms]
(pass) sql-json PG13 golden parity > sqlNaiveIso(0099-01-01 00:00:00) matches pgToNaiveIso -> 0099-01-01T00:00:00 [0.72ms]
(pass) sql-json PG13 golden parity > sqlNaiveIso maps NULL::timestamp to SQL NULL and JSON null [0.57ms]
(pass) sql-json PG13 golden parity > sqlUtcIso(2026-05-01 11:00:00+00) matches pgToUtcIso -> 2026-05-01T11:00:00Z [0.80ms]
(pass) sql-json PG13 golden parity > sqlUtcIso(2026-05-01 11:00:00.5+00) matches pgToUtcIso -> 2026-05-01T11:00:00.500000Z [0.72ms]
(pass) sql-json PG13 golden parity > sqlUtcIso(2026-05-01 11:00:00.12+00) matches pgToUtcIso -> 2026-05-01T11:00:00.120000Z [0.67ms]
(pass) sql-json PG13 golden parity > sqlUtcIso(2026-05-01 11:00:00.123456+00) matches pgToUtcIso -> 2026-05-01T11:00:00.123456Z [0.66ms]
(pass) sql-json PG13 golden parity > sqlUtcIso(2026-05-01 11:00:00.000001+00) matches pgToUtcIso -> 2026-05-01T11:00:00.000001Z [1.02ms]
(pass) sql-json PG13 golden parity > sqlUtcIso(0099-01-01 00:00:00+00) matches pgToUtcIso -> 0099-01-01T00:00:00Z [0.74ms]
(pass) sql-json PG13 golden parity > sqlUtcIso maps NULL::timestamptz to SQL NULL and JSON null [0.48ms]
(pass) sql-json PG13 golden parity > sqlUtcIso and sqlNaiveIso are independent of non-UTC session TimeZone (Europe/Istanbul +03) [1.72ms]
(pass) sql-json PG13 golden parity > sqlBoolFalse and sqlIntZero coerce NULL to false and 0::int [0.39ms]
(pass) sql-json PG13 golden parity > json_build_object round-trips Turkish UTF-8, quotes, backslashes, and newlines cleanly [0.92ms]
(pass) sql-json PG13 golden parity > helpers accept Drizzle AnyColumn references against live schema columns [2.06ms]

test/integration/uploads.test.ts:
(pass) auth runs before multipart parsing, including oversized or malformed multipart [4.03ms]
(pass) rejected upload leaves no file behind: extension, signature, size [7.92ms]
(pass) native multipart maps wrong or missing field to exact FastAPI 422 and distinguishes extra files [4.17ms]
(pass) valid uppercase upload is UUID v4, served from both paths; static missing, dotfiles and directories are 404 [4.20ms]
(pass) size exactly at configured max succeeds; max + 1 reports floored MB [2.61ms]
(pass) download-all empty dir and admin authorization [1.70ms]
(pass) ZIP contains every uploaded filename at root, UTC filename, no appended JSON or double send [8.96ms]
(pass) real ZIP stream aborts and closes on client disconnect mid-stream [20.40ms]
(pass) multipart parser failure returns 400 without writing a file [5.87ms]
(pass) upload 20/minute and download-all 3/hour limits have independent counters [26.84ms]
(pass) ZIP setup error before headers returns JSON 500, logs failure and aborts archive [2.92ms]
(pass) Bun socket preserves encoded traversal for request-head rejection [4.65ms]
(pass) Bun normalizes dot segments without exposing files outside static roots [4.17ms]
(pass) chunked multipart exceeding the streaming cap returns 413 without writing files [5.10ms]
(pass) multipart media type is case insensitive [3.04ms]

 227 pass
 0 fail
 1464 expect() calls
Ran 227 tests across 13 files. [22.79s]
```

### TARGET_KIND=old TARGET_URL=http://127.0.0.1:8001 CONTRACT_DB_URL_OLD=$CONTRACT_DB_URL_OLD CONTRACT_DB_URL_NEW=$CONTRACT_DB_URL_NEW bun contract/run.ts

```text
bun test v1.3.5 (1e86cebd)

contract/system.test.ts:
(pass) system > GET / and /health [24.51ms]
(pass) system > unknown path → 404 Not Found [10.92ms]
(pass) system > POST /users → 405 [262.14ms]
(pass) system > security headers [11.95ms]
(pass) system > CORS allows macsclub.com.tr [11.08ms]

contract/auth.test.ts:
(pass) auth contract > register creates pending moderator with exact public fields [233.73ms]
(pass) auth contract > /auth/register normalizes only the email domain [233.19ms]
(pass) auth contract > /auth/register/admin normalizes only the email domain [217.70ms]
(pass) auth contract > login preserves the raw username and requires the exact stored email case [442.58ms]
(pass) auth contract > register duplicate email [12.02ms]
(pass) auth contract > register short password [10.52ms]
(pass) auth contract > register invalid email [10.26ms]
(pass) auth contract > register missing fields [10.93ms]
(pass) auth contract > register/admin wrong secret yanlis [11.02ms]
(pass) auth contract > register/admin wrong secret xxxxxxxxxxxxxxxxxxxxx [9.49ms]
(pass) auth contract > register/admin correct secret [226.67ms]
(pass) auth contract > login returns compatible claims and one-hour expiry [227.98ms]
(pass) auth contract > login eligibility admin@example.com [223.09ms]
(pass) auth contract > login eligibility unknown@example.com [12.28ms]
(pass) auth contract > login eligibility pending@example.com [221.93ms]
(pass) auth contract > login eligibility inactive@example.com [231.72ms]
(pass) auth contract > login rejects JSON as missing form fields [12.72ms]
(pass) auth contract > empty login form field username is missing [12.25ms]
(pass) auth contract > empty login form field password is missing [12.36ms]
(pass) auth contract > locked account applies deviation a [12.32ms]
(pass) auth contract > corrupt hash applies deviation b [15.53ms]
(skip) auth contract > five failures persist and lock sixth attempt
(pass) auth contract > successful login resets failed counter and stamps last_login [904.07ms]

contract/users.test.ts:
(pass) users contract > me rejects token %s [10.98ms]
(pass) users contract > me rejects token abc [9.89ms]
(pass) users contract > me eligibility rejected@example.com [16.18ms]
(pass) users contract > me eligibility inactive@example.com [11.19ms]
(pass) users contract > deleted user token is rejected [223.54ms]
(pass) users contract > access changes apply immediately to existing token [439.01ms]
(pass) users contract > put me uses query name and ignores missing or empty name [221.62ms]
(pass) users contract > password rejects invalid change {"current_password":"yanlis","new_password":"yeni123","confirm_password":"yeni123"} [417.13ms]
(pass) users contract > password rejects invalid change {"current_password":"parola123","new_password":"parola123","confirm_password":"parola123"} [611.06ms]
(pass) users contract > password confirmation mismatch is field validation [218.84ms]
(pass) users contract > short new password does not add a spurious confirmation error [231.24ms]
(pass) users contract > password change persists timestamp and changes login [1281.46ms]
(pass) users contract > list requires admin [225.33ms]
(pass) users contract > list default uses public fields and newest-first order [224.07ms]
(pass) users contract > list bounds limit=0 [224.59ms]
(pass) users contract > list bounds limit=101 [222.63ms]
(pass) users contract > list bounds skip=-1 [228.61ms]
(pass) users contract > get missing user [222.16ms]
(pass) users contract > get noninteger user [236.18ms]
(pass) users contract > access invalid enum [234.80ms]
(pass) users contract > admin cannot change own access [235.15ms]
(pass) users contract > admin cannot delete self [231.83ms]
(pass) users contract > delete user [227.84ms]
(pass) users contract > delete me [12.98ms]
(pass) users contract > delete user with events applies FK deviation e [231.90ms]
(skip) users contract > old python-jose token accepted

contract/events.test.ts:
(pass) events contract > default list orders active undeleted events and exposes exact response shape [14.81ms]
(pass) events contract > list query status=upcoming [13.79ms]
(pass) events contract > list query status=past [12.39ms]
(pass) events contract > list query search=BAHAR [13.44ms]
(pass) events contract > list query category_id=1 [12.65ms]
(pass) events contract > list query category_id=0 [12.42ms]
(pass) events contract > list query skip=1&limit=2 [13.81ms]
(pass) events contract > list query sort_by=title&sort_desc=true [12.72ms]
(pass) events contract > invalid status returns FastAPI enum error [9.56ms]
(pass) events contract > unknown sort rejected [10.17ms]
(pass) events contract > pagination validation limit=1000000 [10.76ms]
(pass) events contract > pagination validation skip=-1 [10.27ms]
(pass) events contract > every public GET ignores garbage and expired Authorization [39.93ms]
(pass) events contract > admin list requires staff and includes inactive events [14.92ms]
(pass) events contract > featured uses flagged event then nearest future event then null [28.20ms]
(pass) events contract > detail /events/by-slug/bahar-senligi [12.05ms]
(pass) events contract > detail /events/by-slug/yok [10.63ms]
(pass) events contract > detail /events/by-slug/pasif-etkinlik [11.24ms]
(pass) events contract > detail /events/3 [11.09ms]
(pass) events contract > detail /events/4 [11.63ms]
(pass) events contract > detail /events/999 [11.88ms]
(pass) events contract > create requires staff [14.01ms]
(pass) events contract > create minimal uses defaults and embedded creator [15.10ms]
(pass) events contract > create datetime 2026-05-01T10:00 [14.59ms]
(pass) events contract > create datetime 2026-05-01T10:00:00Z [14.09ms]
(pass) events contract > create datetime 2026-05-01T10:00:00+03:00 [12.86ms]
(pass) events contract > create invalid schema and malformed JSON return 400 [23.90ms]
(pass) events contract > create unknown category and duplicate title [19.41ms]
(skip) events contract > empty slug base uses distinct timestamps (P3)
(pass) events contract > create and update featured unset others [25.34ms]
(pass) events contract > partial update preserves slug, updates timestamp, regenerates title slug, clears category [33.52ms]
(pass) events contract > update supports inactive events and rejects deleted or missing category [24.50ms]
(pass) events contract > soft delete hides event and cannot be repeated [18.55ms]
(pass) events contract > hard delete requires admin and finds soft-deleted events [21.40ms]
(pass) events contract > categories CRUD preserves description on update and nulls associated events on delete [46.60ms]

contract/members.test.ts:
(pass) members contract > default list includes inactive members with exact shape and microsecond timestamps [15.58ms]
(pass) members contract > list query is_active=true [16.27ms]
(pass) members contract > list query is_active=false [20.89ms]
(pass) members contract > list query is_active=t [15.01ms]
(pass) members contract > list query is_active=n [17.24ms]
(pass) members contract > list query search=ayşe [18.11ms]
(pass) members contract > list query skip=1&limit=2 [15.37ms]
(pass) members contract > list query search=missing [18.81ms]
(pass) members contract > invalid query limit=201 [13.86ms]
(pass) members contract > invalid query skip=-1 [21.65ms]
(pass) members contract > invalid query is_active=garbage [15.84ms]
(pass) members contract > leaderboard counts only active undeleted projects and includes projectless active member [23.51ms]
(pass) members contract > member stats count all memberships including deleted and inactive projects [20.34ms]
(pass) members contract > member projects return ordered memberships and exact shape [17.46ms]
(pass) members contract > every public GET ignores garbage Authorization [32.30ms]
(pass) members contract > missing member /members/999 [12.99ms]
(pass) members contract > missing member /members/999/stats [13.86ms]
(pass) members contract > missing member /members/999/projects [12.94ms]
(pass) members contract > invalid member ID reports path location [12.55ms]
(pass) members contract > create uses active default, allows inactive names and rejects duplicate active names [23.84ms]
(pass) members contract > partial update preserves omissions and allows explicit null profile_image [21.23ms]
(pass) members contract > delete is hard, empty and cannot be repeated [24.39ms]
(pass) members contract > mutations require approved staff [25.55ms]
(pass) members contract > body validation reports missing and wrong string/boolean types [19.01ms]

contract/sponsors.test.ts:
(pass) sponsors contract > default list filters active sponsors and returns exact shape with null updated_at [16.35ms]
(pass) sponsors contract > list query is_active=false [15.99ms]
(pass) sponsors contract > list query is_active=f [12.28ms]
(pass) sponsors contract > list query is_active=y [16.17ms]
(pass) sponsors contract > list query category=Kafe [14.42ms]
(pass) sponsors contract > list query category=kafe [13.94ms]
(pass) sponsors contract > list query skip=1&limit=2 [14.10ms]
(pass) sponsors contract > list query category= [14.16ms]
(pass) sponsors contract > categories include inactive categories and omit empty values in sorted order [13.38ms]
(pass) sponsors contract > public list, categories and detail ignore garbage Authorization [19.15ms]
(pass) sponsors contract > missing and non-integer sponsor IDs [15.35ms]
(pass) sponsors contract > invalid query limit=201 [12.59ms]
(pass) sponsors contract > invalid query skip=-1 [11.82ms]
(pass) sponsors contract > invalid query is_active=x [14.62ms]
(pass) sponsors contract > create validation {"name":"A","category":"Kafe"} [16.41ms]
(pass) sponsors contract > create validation {"name":"AB","category":"A"} [13.72ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","latitude":91} [12.81ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","longitude":-181} [13.95ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","image_url":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"} [14.00ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","discount_info":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"} [13.16ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","is_featured":"1.0"} [11.23ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","latitude":"0x1"} [12.35ms]
(pass) sponsors contract > create minimal sponsor uses defaults and null optional fields [14.60ms]
(pass) sponsors contract > create and update coerce numeric strings and lax boolean aliases [15.67ms]
(pass) sponsors contract > update preserves omissions and clears nullable fields [22.21ms]
(pass) sponsors contract > long discount_info on update applies deviation l (old 500 after commit, new 422 without write) [25.99ms]
(pass) sponsors contract > explicit null is_active on update applies deviation l (old 500 after commit, new 422 without write) [27.89ms]
(pass) sponsors contract > explicit null is_featured on update applies deviation l (old 500 after commit, new 422 without write) [26.67ms]
(pass) sponsors contract > delete returns empty 204 and repeat or update missing returns exact 404 [17.94ms]
(pass) sponsors contract > all writes and geocode require approved staff [23.62ms]
(pass) sponsors contract > geocode validates short address before contacting upstream [13.42ms]

contract/projects.test.ts:
(pass) projects contract > default list has exact shape, embedded members and category [20.57ms]
(pass) projects contract > list filter skip=2&limit=2 [16.01ms]
(pass) projects contract > list filter status=COMPLETED [18.62ms]
(pass) projects contract > list filter search=mobil [18.85ms]
(pass) projects contract > list filter category_id=1 [15.96ms]
(pass) projects contract > list filter category_id=0 [12.70ms]
(pass) projects contract > list filter status= [14.55ms]
(pass) projects contract > invalid status is explicit deviation f on public and admin lists [19.19ms]
(pass) projects contract > list validation limit=101 [11.27ms]
(pass) projects contract > list validation limit=0 [9.47ms]
(pass) projects contract > list validation skip=-1 [10.94ms]
(pass) projects contract > list validation category_id=no [9.89ms]
(pass) projects contract > admin pagination includes inactive projects and requires staff [20.50ms]
(pass) projects contract > public GETs ignore garbage Authorization [31.09ms]
(pass) projects contract > featured embeds members, falls back to newest and returns exact 404 [31.41ms]
(pass) projects contract > hidden or missing detail /projects/3 [15.51ms]
(pass) projects contract > hidden or missing detail /projects/4 [13.93ms]
(pass) projects contract > hidden or missing detail /projects/999 [11.29ms]
(pass) projects contract > hidden or missing detail /projects/by-slug/yok [11.60ms]
(pass) projects contract > hidden or missing detail /projects/by-slug/pasif-proje [10.31ms]
(pass) projects contract > slug detail embeds members [11.44ms]
(pass) projects contract > writes require approved staff [33.48ms]
(pass) projects contract > minimal create uses defaults and empty members [14.48ms]
(pass) projects contract > create members returns empty, reads embed roles, duplicates are retained [20.95ms]
(pass) projects contract > unknown member create rolls back project on new target (P6) [20.64ms]
(pass) projects contract > category lookup uses create 404 and update 400 [15.79ms]
(pass) projects contract > create validates status [17.43ms]
(pass) projects contract > create validates project_type [12.02ms]
(pass) projects contract > create validates category_id [11.79ms]
(pass) projects contract > create validates is_active [11.46ms]
(pass) projects contract > create validates started_at [11.75ms]
(pass) projects contract > duplicate slug timestamp and featured uniqueness [16.90ms]
(pass) projects contract > update keeps identical slug, handles naive dates and all content fields [13.12ms]
(pass) projects contract > update replaces and clears memberships and allows inactive projects [23.93ms]
(pass) projects contract > update changes title and featured, clears category and handles missing project [18.83ms]
(pass) projects contract > soft delete and admin-only hard delete cascade member projects [25.48ms]
(pass) projects contract > project members shape, inactive project allowed, deleted project hidden [14.11ms]
(pass) projects contract > add member exact response, duplicate and missing member errors [20.53ms]
(pass) projects contract > update member preserves omitted/null fields, changes role and contribution [18.93ms]
(pass) projects contract > remove member and missing relation error [13.81ms]
(pass) projects contract > member HTTP deletion cascades to project members (F06) [17.80ms]
(pass) projects contract > categories CRUD, duplicate name and used category deletion parity (F07) [35.04ms]

contract/uploads.test.ts:
(pass) uploads contract > upload requires authentication [11.00ms]
(pass) uploads contract > reject extension script.sh [10.38ms]
(pass) uploads contract > reject extension dosya [11.15ms]
(pass) uploads contract > reject invalid image sahte.png Uint8Array(15) [ 77, 90, 194, 144, 0, 32, 110, 111, 116, 32, 97, 32, 112, 110, 103 ] [10.40ms]
(pass) uploads contract > reject invalid image x.webp Uint8Array(12) [ 82, 73, 70, 70, 49, 50, 51, 52, 87, 65, 86, 69 ] [10.94ms]
(pass) uploads contract > reject invalid image x.webp Uint8Array(11) [ 82, 73, 70, 70, 49, 50, 51, 52, 87, 69, 66 ] [10.87ms]
(pass) uploads contract > reject invalid image x.png Uint8Array(3) [ 137, 80, 78 ] [11.20ms]
(pass) uploads contract > accept FOTO.PNG with UUID v4 and serve bytes through both mounts [14.38ms]
(pass) uploads contract > accept gecerli.png with UUID v4 and serve bytes through both mounts [12.28ms]
(pass) uploads contract > oversized image gets exact 413 [58.55ms]
(pass) uploads contract > wrong multipart field gets exact missing-file validation [11.96ms]
(pass) uploads contract > missing static files return JSON 404 [9.69ms]
(pass) uploads contract > download-all requires admin [11.00ms]
(pass) uploads contract > download-all is complete ZIP with uploaded filenames at root [19.59ms]

contract/legacy-pytest-port.test.ts:
(pass) auth > test_register_creates_pending_account_without_privileges [453.23ms]
(pass) auth > test_pending_account_cannot_log_in [447.37ms]
(pass) users > test_approved_user_can_read_own_profile [226.60ms]
(pass) users > test_rejected_user_is_denied [12.64ms]
(pass) users > test_inactive_user_is_denied [11.83ms]
(pass) users > test_missing_token_is_denied [11.79ms]
(pass) users > test_moderator_cannot_list_users [224.46ms]
(pass) users > test_admin_can_approve_pending_account [659.33ms]
(pass) users > test_admin_cannot_change_own_access [228.87ms]
(pass) events > test_self_registered_account_cannot_create_events [229.42ms]
(pass) events > test_moderator_can_create_event [232.66ms]
(pass) events > test_moderator_cannot_hard_delete_event [457.30ms]
(pass) events > test_admin_can_hard_delete_event [237.98ms]
(pass) events > test_anonymous_cannot_create_event [10.27ms]
(pass) events > test_unknown_sort_field_is_rejected [9.51ms]
(pass) events > test_allowed_sort_field_works [12.92ms]
(pass) events > test_limit_above_cap_is_rejected[/events] [9.72ms]
(pass) events > test_negative_skip_is_rejected [11.17ms]
(pass) sponsors > test_limit_above_cap_is_rejected[/sponsors/] [10.23ms]
(pass) uploads > test_upload_requires_authentication [10.41ms]
(pass) uploads > test_upload_rejects_non_image_extension [232.27ms]
(pass) uploads > test_upload_rejects_content_that_is_not_really_an_image [227.64ms]
(pass) uploads > test_upload_rejects_oversized_file [722.44ms]
(pass) uploads > test_upload_accepts_valid_png [672.80ms]
(pass) uploads > test_rejected_upload_leaves_no_file_behind [671.37ms]
(pass) projects > used_project_category_delete_is_204_parity [233.20ms]

3 tests skipped:
(skip) auth contract > five failures persist and lock sixth attempt
(skip) users contract > old python-jose token accepted
(skip) events contract > empty slug base uses distinct timestamps (P3)

 223 pass
 3 skip
 0 fail
 810 expect() calls
Ran 226 tests across 9 files. [18.87s]
```

### TARGET_KIND=new TARGET_URL=http://127.0.0.1:8011 CONTRACT_DB_URL_OLD=$CONTRACT_DB_URL_OLD CONTRACT_DB_URL_NEW=$CONTRACT_DB_URL_NEW bun contract/run.ts

```text
bun test v1.3.5 (1e86cebd)

contract/system.test.ts:
(pass) system > GET / and /health [31.10ms]
(pass) system > unknown path → 404 Not Found [14.50ms]
(pass) system > POST /users → 405 [236.69ms]
(pass) system > security headers [15.00ms]
(pass) system > CORS allows macsclub.com.tr [13.83ms]

contract/auth.test.ts:
(pass) auth contract > register creates pending moderator with exact public fields [216.02ms]
(pass) auth contract > /auth/register normalizes only the email domain [222.06ms]
(pass) auth contract > /auth/register/admin normalizes only the email domain [215.46ms]
(pass) auth contract > login preserves the raw username and requires the exact stored email case [431.26ms]
(pass) auth contract > register duplicate email [14.51ms]
(pass) auth contract > register short password [10.64ms]
(pass) auth contract > register invalid email [12.66ms]
(pass) auth contract > register missing fields [12.23ms]
(pass) auth contract > register/admin wrong secret yanlis [10.70ms]
(pass) auth contract > register/admin wrong secret xxxxxxxxxxxxxxxxxxxxx [11.37ms]
(pass) auth contract > register/admin correct secret [224.47ms]
(pass) auth contract > login returns compatible claims and one-hour expiry [220.45ms]
(pass) auth contract > login eligibility admin@example.com [217.35ms]
(pass) auth contract > login eligibility unknown@example.com [12.24ms]
(pass) auth contract > login eligibility pending@example.com [210.36ms]
(pass) auth contract > login eligibility inactive@example.com [216.26ms]
(pass) auth contract > login rejects JSON as missing form fields [14.87ms]
(pass) auth contract > empty login form field username is missing [14.22ms]
(pass) auth contract > empty login form field password is missing [11.82ms]
(pass) auth contract > locked account applies deviation a [19.27ms]
(pass) auth contract > corrupt hash applies deviation b [16.17ms]
(pass) auth contract > five failures persist and lock sixth attempt [1277.69ms]
(pass) auth contract > successful login resets failed counter and stamps last_login [837.52ms]

contract/users.test.ts:
(pass) users contract > me rejects token %s [12.79ms]
(pass) users contract > me rejects token abc [10.49ms]
(pass) users contract > me eligibility rejected@example.com [16.57ms]
(pass) users contract > me eligibility inactive@example.com [11.76ms]
(pass) users contract > deleted user token is rejected [220.51ms]
(pass) users contract > access changes apply immediately to existing token [431.08ms]
(pass) users contract > put me uses query name and ignores missing or empty name [225.29ms]
(pass) users contract > password rejects invalid change {"current_password":"yanlis","new_password":"yeni123","confirm_password":"yeni123"} [423.57ms]
(pass) users contract > password rejects invalid change {"current_password":"parola123","new_password":"parola123","confirm_password":"parola123"} [629.41ms]
(pass) users contract > password confirmation mismatch is field validation [229.91ms]
(pass) users contract > short new password does not add a spurious confirmation error [221.89ms]
(pass) users contract > password change persists timestamp and changes login [1236.39ms]
(pass) users contract > list requires admin [218.62ms]
(pass) users contract > list default uses public fields and newest-first order [223.65ms]
(pass) users contract > list bounds limit=0 [216.96ms]
(pass) users contract > list bounds limit=101 [220.05ms]
(pass) users contract > list bounds skip=-1 [218.62ms]
(pass) users contract > get missing user [217.36ms]
(pass) users contract > get noninteger user [222.75ms]
(pass) users contract > access invalid enum [214.26ms]
(pass) users contract > admin cannot change own access [219.15ms]
(pass) users contract > admin cannot delete self [218.27ms]
(pass) users contract > delete user [225.16ms]
(pass) users contract > delete me [16.06ms]
(pass) users contract > delete user with events applies FK deviation e [220.19ms]
(pass) users contract > old python-jose token accepted [15.25ms]

contract/events.test.ts:
(pass) events contract > default list orders active undeleted events and exposes exact response shape [14.06ms]
(pass) events contract > list query status=upcoming [15.87ms]
(pass) events contract > list query status=past [12.78ms]
(pass) events contract > list query search=BAHAR [12.40ms]
(pass) events contract > list query category_id=1 [13.13ms]
(pass) events contract > list query category_id=0 [14.15ms]
(pass) events contract > list query skip=1&limit=2 [15.95ms]
(pass) events contract > list query sort_by=title&sort_desc=true [12.87ms]
(pass) events contract > invalid status returns FastAPI enum error [12.08ms]
(pass) events contract > unknown sort rejected [13.66ms]
(pass) events contract > pagination validation limit=1000000 [13.15ms]
(pass) events contract > pagination validation skip=-1 [12.74ms]
(pass) events contract > every public GET ignores garbage and expired Authorization [32.76ms]
(pass) events contract > admin list requires staff and includes inactive events [15.84ms]
(pass) events contract > featured uses flagged event then nearest future event then null [35.40ms]
(pass) events contract > detail /events/by-slug/bahar-senligi [12.80ms]
(pass) events contract > detail /events/by-slug/yok [13.19ms]
(pass) events contract > detail /events/by-slug/pasif-etkinlik [10.35ms]
(pass) events contract > detail /events/3 [11.28ms]
(pass) events contract > detail /events/4 [12.13ms]
(pass) events contract > detail /events/999 [11.22ms]
(pass) events contract > create requires staff [12.75ms]
(pass) events contract > create minimal uses defaults and embedded creator [15.21ms]
(pass) events contract > create datetime 2026-05-01T10:00 [15.74ms]
(pass) events contract > create datetime 2026-05-01T10:00:00Z [15.62ms]
(pass) events contract > create datetime 2026-05-01T10:00:00+03:00 [16.00ms]
(pass) events contract > create invalid schema and malformed JSON return 400 [16.75ms]
(pass) events contract > create unknown category and duplicate title [18.18ms]
(pass) events contract > empty slug base uses distinct timestamps (P3) [1125.78ms]
(pass) events contract > create and update featured unset others [27.07ms]
(pass) events contract > partial update preserves slug, updates timestamp, regenerates title slug, clears category [41.31ms]
(pass) events contract > update supports inactive events and rejects deleted or missing category [24.15ms]
(pass) events contract > soft delete hides event and cannot be repeated [16.92ms]
(pass) events contract > hard delete requires admin and finds soft-deleted events [17.08ms]
(pass) events contract > categories CRUD preserves description on update and nulls associated events on delete [35.51ms]

contract/members.test.ts:
(pass) members contract > default list includes inactive members with exact shape and microsecond timestamps [13.20ms]
(pass) members contract > list query is_active=true [13.61ms]
(pass) members contract > list query is_active=false [13.23ms]
(pass) members contract > list query is_active=t [11.37ms]
(pass) members contract > list query is_active=n [11.75ms]
(pass) members contract > list query search=ayşe [11.80ms]
(pass) members contract > list query skip=1&limit=2 [11.85ms]
(pass) members contract > list query search=missing [9.82ms]
(pass) members contract > invalid query limit=201 [10.70ms]
(pass) members contract > invalid query skip=-1 [10.23ms]
(pass) members contract > invalid query is_active=garbage [8.78ms]
(pass) members contract > leaderboard counts only active undeleted projects and includes projectless active member [14.32ms]
(pass) members contract > member stats count all memberships including deleted and inactive projects [13.55ms]
(pass) members contract > member projects return ordered memberships and exact shape [11.97ms]
(pass) members contract > every public GET ignores garbage Authorization [14.72ms]
(pass) members contract > missing member /members/999 [9.93ms]
(pass) members contract > missing member /members/999/stats [10.28ms]
(pass) members contract > missing member /members/999/projects [9.25ms]
(pass) members contract > invalid member ID reports path location [11.17ms]
(pass) members contract > create uses active default, allows inactive names and rejects duplicate active names [16.09ms]
(pass) members contract > partial update preserves omissions and allows explicit null profile_image [17.17ms]
(pass) members contract > delete is hard, empty and cannot be repeated [18.53ms]
(pass) members contract > mutations require approved staff [16.58ms]
(pass) members contract > body validation reports missing and wrong string/boolean types [14.57ms]

contract/sponsors.test.ts:
(pass) sponsors contract > default list filters active sponsors and returns exact shape with null updated_at [12.72ms]
(pass) sponsors contract > list query is_active=false [9.91ms]
(pass) sponsors contract > list query is_active=f [11.10ms]
(pass) sponsors contract > list query is_active=y [12.24ms]
(pass) sponsors contract > list query category=Kafe [10.36ms]
(pass) sponsors contract > list query category=kafe [11.89ms]
(pass) sponsors contract > list query skip=1&limit=2 [11.81ms]
(pass) sponsors contract > list query category= [11.51ms]
(pass) sponsors contract > categories include inactive categories and omit empty values in sorted order [10.82ms]
(pass) sponsors contract > public list, categories and detail ignore garbage Authorization [13.54ms]
(pass) sponsors contract > missing and non-integer sponsor IDs [15.55ms]
(pass) sponsors contract > invalid query limit=201 [11.28ms]
(pass) sponsors contract > invalid query skip=-1 [11.37ms]
(pass) sponsors contract > invalid query is_active=x [13.59ms]
(pass) sponsors contract > create validation {"name":"A","category":"Kafe"} [13.39ms]
(pass) sponsors contract > create validation {"name":"AB","category":"A"} [12.28ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","latitude":91} [11.72ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","longitude":-181} [12.03ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","image_url":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"} [15.13ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","discount_info":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"} [11.08ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","is_featured":"1.0"} [12.70ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","latitude":"0x1"} [11.95ms]
(pass) sponsors contract > create minimal sponsor uses defaults and null optional fields [11.53ms]
(pass) sponsors contract > create and update coerce numeric strings and lax boolean aliases [14.72ms]
(pass) sponsors contract > update preserves omissions and clears nullable fields [17.34ms]
(pass) sponsors contract > long discount_info on update applies deviation l (old 500 after commit, new 422 without write) [14.05ms]
(pass) sponsors contract > explicit null is_active on update applies deviation l (old 500 after commit, new 422 without write) [14.18ms]
(pass) sponsors contract > explicit null is_featured on update applies deviation l (old 500 after commit, new 422 without write) [15.37ms]
(pass) sponsors contract > delete returns empty 204 and repeat or update missing returns exact 404 [15.55ms]
(pass) sponsors contract > all writes and geocode require approved staff [17.80ms]
(pass) sponsors contract > geocode validates short address before contacting upstream [10.85ms]

contract/projects.test.ts:
(pass) projects contract > default list has exact shape, embedded members and category [11.80ms]
(pass) projects contract > list filter skip=2&limit=2 [11.58ms]
(pass) projects contract > list filter status=COMPLETED [17.53ms]
(pass) projects contract > list filter search=mobil [13.01ms]
(pass) projects contract > list filter category_id=1 [12.90ms]
(pass) projects contract > list filter category_id=0 [12.40ms]
(pass) projects contract > list filter status= [12.69ms]
(pass) projects contract > invalid status is explicit deviation f on public and admin lists [14.57ms]
(pass) projects contract > list validation limit=101 [11.43ms]
(pass) projects contract > list validation limit=0 [10.38ms]
(pass) projects contract > list validation skip=-1 [9.50ms]
(pass) projects contract > list validation category_id=no [10.38ms]
(pass) projects contract > admin pagination includes inactive projects and requires staff [16.54ms]
(pass) projects contract > public GETs ignore garbage Authorization [21.82ms]
(pass) projects contract > featured embeds members, falls back to newest and returns exact 404 [28.04ms]
(pass) projects contract > hidden or missing detail /projects/3 [11.56ms]
(pass) projects contract > hidden or missing detail /projects/4 [13.60ms]
(pass) projects contract > hidden or missing detail /projects/999 [11.68ms]
(pass) projects contract > hidden or missing detail /projects/by-slug/yok [12.11ms]
(pass) projects contract > hidden or missing detail /projects/by-slug/pasif-proje [12.75ms]
(pass) projects contract > slug detail embeds members [13.50ms]
(pass) projects contract > writes require approved staff [29.93ms]
(pass) projects contract > minimal create uses defaults and empty members [16.92ms]
(pass) projects contract > create members returns empty, reads embed roles, duplicates are retained [20.25ms]
(pass) projects contract > unknown member create rolls back project on new target (P6) [19.09ms]
(pass) projects contract > category lookup uses create 404 and update 400 [17.26ms]
(pass) projects contract > create validates status [13.30ms]
(pass) projects contract > create validates project_type [12.50ms]
(pass) projects contract > create validates category_id [12.47ms]
(pass) projects contract > create validates is_active [11.67ms]
(pass) projects contract > create validates started_at [11.89ms]
(pass) projects contract > duplicate slug timestamp and featured uniqueness [15.33ms]
(pass) projects contract > update keeps identical slug, handles naive dates and all content fields [15.80ms]
(pass) projects contract > update replaces and clears memberships and allows inactive projects [25.64ms]
(pass) projects contract > update changes title and featured, clears category and handles missing project [20.37ms]
(pass) projects contract > soft delete and admin-only hard delete cascade member projects [22.48ms]
(pass) projects contract > project members shape, inactive project allowed, deleted project hidden [14.02ms]
(pass) projects contract > add member exact response, duplicate and missing member errors [24.21ms]
(pass) projects contract > update member preserves omitted/null fields, changes role and contribution [22.98ms]
(pass) projects contract > remove member and missing relation error [17.11ms]
(pass) projects contract > member HTTP deletion cascades to project members (F06) [17.38ms]
(pass) projects contract > categories CRUD, duplicate name and used category deletion parity (F07) [32.22ms]

contract/uploads.test.ts:
(pass) uploads contract > upload requires authentication [13.06ms]
(pass) uploads contract > reject extension script.sh [16.43ms]
(pass) uploads contract > reject extension dosya [12.93ms]
(pass) uploads contract > reject invalid image sahte.png Uint8Array(15) [ 77, 90, 194, 144, 0, 32, 110, 111, 116, 32, 97, 32, 112, 110, 103 ] [13.01ms]
(pass) uploads contract > reject invalid image x.webp Uint8Array(12) [ 82, 73, 70, 70, 49, 50, 51, 52, 87, 65, 86, 69 ] [12.20ms]
(pass) uploads contract > reject invalid image x.webp Uint8Array(11) [ 82, 73, 70, 70, 49, 50, 51, 52, 87, 69, 66 ] [13.54ms]
(pass) uploads contract > reject invalid image x.png Uint8Array(3) [ 137, 80, 78 ] [11.22ms]
(pass) uploads contract > accept FOTO.PNG with UUID v4 and serve bytes through both mounts [15.82ms]
(pass) uploads contract > accept gecerli.png with UUID v4 and serve bytes through both mounts [18.88ms]
(pass) uploads contract > oversized image gets exact 413 [57.98ms]
(pass) uploads contract > wrong multipart field gets exact missing-file validation [16.02ms]
(pass) uploads contract > missing static files return JSON 404 [10.86ms]
(pass) uploads contract > download-all requires admin [16.38ms]
(pass) uploads contract > download-all is complete ZIP with uploaded filenames at root [29.66ms]

contract/legacy-pytest-port.test.ts:
(pass) auth > test_register_creates_pending_account_without_privileges [429.77ms]
(pass) auth > test_pending_account_cannot_log_in [419.86ms]
(pass) users > test_approved_user_can_read_own_profile [218.81ms]
(pass) users > test_rejected_user_is_denied [11.02ms]
(pass) users > test_inactive_user_is_denied [10.66ms]
(pass) users > test_missing_token_is_denied [9.29ms]
(pass) users > test_moderator_cannot_list_users [220.06ms]
(pass) users > test_admin_can_approve_pending_account [630.02ms]
(pass) users > test_admin_cannot_change_own_access [225.53ms]
(pass) events > test_self_registered_account_cannot_create_events [233.74ms]
(pass) events > test_moderator_can_create_event [233.65ms]
(pass) events > test_moderator_cannot_hard_delete_event [434.51ms]
(pass) events > test_admin_can_hard_delete_event [224.27ms]
(pass) events > test_anonymous_cannot_create_event [12.92ms]
(pass) events > test_unknown_sort_field_is_rejected [11.46ms]
(pass) events > test_allowed_sort_field_works [11.74ms]
(pass) events > test_limit_above_cap_is_rejected[/events] [12.17ms]
(pass) events > test_negative_skip_is_rejected [9.21ms]
(pass) sponsors > test_limit_above_cap_is_rejected[/sponsors/] [12.09ms]
(pass) uploads > test_upload_requires_authentication [10.38ms]
(pass) uploads > test_upload_rejects_non_image_extension [216.67ms]
(pass) uploads > test_upload_rejects_content_that_is_not_really_an_image [216.11ms]
(pass) uploads > test_upload_rejects_oversized_file [693.15ms]
(pass) uploads > test_upload_accepts_valid_png [645.48ms]
(pass) uploads > test_rejected_upload_leaves_no_file_behind [639.42ms]
(pass) projects > used_project_category_delete_is_204_parity [225.16ms]

 226 pass
 0 fail
 838 expect() calls
Ran 226 tests across 9 files. [20.54s]
```

### bun test contract/shadow-diff.test.ts

```text
bun test v1.3.5 (1e86cebd)

contract/shadow-diff.test.ts:
(pass) shadow-diff production parity script > reports 0 diffs on contract compose with OLD_URL=:8001 NEW_URL=:8011 and honors --max-ids [299.27ms]
(pass) shadow-diff production parity script > exits 1 and reports /events/1 and title field path when event title changes in new DB [182.58ms]
(pass) shadow-diff production parity script > never logs creator email values when nested creator field differs [180.55ms]
(pass) shadow-diff production parity script > rejects missing or identical target URLs and invalid CLI flags [118.73ms]

 4 pass
 0 fail
 30 expect() calls
Ran 4 tests across 1 file. [804.00ms]
```

### python3 /tmp/macs-task13-deploy-dry.py

```text
first: exit 0 expected 0
deployed previous-sha

upgrade: exit 0 expected 0
deployed previous-sha

dirty: exit 1 expected 1
uncommitted changes on server

locked: exit 1 expected 1
deploy already in progress

snapshot-fail: exit 1 expected 1
failed to capture pre-deploy snapshot for existing macs-backend-ts (HAS_PREV_SERVICE=0, PREV_IMAGE_ID=sha256:previous)

build-fail: exit 1 expected 1
build failed; running backend-ts left untouched

unhealthy: exit 1 expected 1
deploy failed, rolled back to previous-sha

rollback-fail: exit 2 expected 2
rollback failed for previous-sha: restored container did not become healthy

first-unhealthy: exit 1 expected 1
deploy failed, rolled back to previous-sha

9/9 deploy dry-run scenarios PASS; git/docker are fake executables; no server accessed
```

## Initial differential contamination

First differential after the full contract suites: 132 requests, 1 unexpected ZIP diff, 12 approved deviations. Each target's independent upload tests left different randomly named PNGs in tmpfs; database reset does not clean upload directories. No comparison assertion or normalization changed. A fresh recreation of only the old/new app containers clears those disposable upload directories; differential must be rerun after that recreation. Shadow crawl on seeded data: 48 requests, 0 diffs.

## Reproduction scripts (temporary; no product changes)

### /tmp/macs-task13-bench.py

```python
import os, subprocess, time, urllib.request, json, signal
from pathlib import Path
root=Path('/Users/yusufefetasdelen/Documents/GitHub/macs-website')
evidence=Path('/tmp/macs-task13-evidence')
paths=['/events?limit=100','/events/featured','/projects?limit=100','/projects/featured','/members/leaderboard','/members','/sponsors/']
def observe(log, server):
    log.write(subprocess.check_output(['uptime'],text=True))
    log.write(subprocess.check_output(['ps','-p',str(server.pid),'-o','pid,pcpu,pmem,etime,comm'],text=True))
    rows=subprocess.check_output(['ps','-axo','pid,pcpu,pmem,comm'],text=True).splitlines()
    log.write('\n'.join(sorted(rows[1:],key=lambda x:float(x.split()[1]),reverse=True)[:10])+'\n')
    log.flush()
for flavor,cwd,port in [('express',Path('/tmp/macs-task13-express/backend-ts'),18020),('v2',root/'backend-ts',18021)]:
    for cache in [False,True]:
        label=flavor+('-cached' if cache else '-uncached')
        env={**os.environ,'DATABASE_URL':'$BENCH_DATABASE_URL','JWT_SECRET_KEY':'contract-secret-key-that-is-long-enough','PORT':str(port),'NODE_ENV':'production','RATELIMIT_ENABLED':'false','RESPONSE_CACHE':str(cache).lower(),'RUN_MIGRATIONS':'false'}
        with open(evidence/(label+'-server.log'),'w') as slog,open(evidence/(label+'-cpu.log'),'w') as cpu,open(evidence/(label+'-bench.log'),'w') as blog:
            server=subprocess.Popen(['bun','--no-env-file','src/server.ts'],cwd=cwd,env=env,stdout=slog,stderr=slog)
            try:
                for i in range(100):
                    try:
                        with urllib.request.urlopen(f'http://127.0.0.1:{port}/health/ready',timeout=1) as r:
                            if r.status==200: break
                    except Exception: time.sleep(.1)
                else: raise RuntimeError(label+' readiness failed')
                probes={}
                for path in paths:
                    observations=[]
                    for _ in range(2):
                        with urllib.request.urlopen(f'http://127.0.0.1:{port}'+path) as r:
                            r.read(); observations.append(r.headers.get('x-cache'))
                    probes[path]=observations
                (evidence/(label+'-probes.json')).write_text(json.dumps(probes,indent=2)+'\n')
                observe(cpu,server)
                bench=subprocess.Popen(['bun','bench/run.ts','--target',f'http://127.0.0.1:{port}','--out',str(root/'backend-ts/bench'/('result-'+label+'.json')),'--label',label],cwd=cwd,env=env,stdout=blog,stderr=blog)
                while bench.poll() is None:
                    time.sleep(10); observe(cpu,server)
                if bench.returncode: raise RuntimeError(label+' benchmark failed')
                print(label+' complete',flush=True)
            finally:
                server.send_signal(signal.SIGTERM)
                try: server.wait(timeout=15)
                except subprocess.TimeoutExpired: server.kill(); server.wait()
                print(label+' server exit '+str(server.returncode),flush=True)
```

### /tmp/macs-task13-deploy-dry.py

```python
import os,subprocess,tempfile,json
from pathlib import Path
script='/Users/yusufefetasdelen/Documents/GitHub/macs-website/scripts/deploy-backend-ts.sh'
fake='''#!/usr/bin/env python3
import os,sys,json
from pathlib import Path
cmd=Path(sys.argv[0]).name; a=sys.argv[1:]; mode=os.environ['SCENARIO']; state=Path(os.environ['FAKE_STATE'])
s=json.loads(state.read_text()) if state.exists() else {'up':0}
with open(os.environ['TRACE'],'a') as log: log.write(cmd+' '+ ' '.join(a)+'\\n')
def done(code=0,out=''):
 print(out,end=''); sys.exit(code)
if cmd=='flock': done(1 if mode=='locked' else 0)
if cmd=='sleep': done()
if cmd=='git':
 if a[:2]==['status','--porcelain']: done(out=' M dirty\\n' if mode=='dirty' else '')
 if a[:2]==['rev-parse','HEAD']: done(out='previous-sha\\n')
 done()
if a[:2]==['container','inspect']: done(1 if mode in ['first','first-unhealthy'] else 0)
if a[:2]==['image','inspect']: done(1 if mode in ['first','first-unhealthy'] else 0,out='sha256:previous\\n')
if a and a[0]=='inspect':
 if '.Image' in ' '.join(a): done(out='sha256:previous\\n')
 healthy= mode not in ['unhealthy','rollback-fail','first-unhealthy'] or (s['up']>=2 and mode!='rollback-fail')
 done(out=('healthy' if healthy else 'unhealthy')+'\\n')
if a and a[0]=='compose':
 if 'config' in a:
  if mode=='snapshot-fail': done(1)
  done(out='backend-ts\\n' if '--services' in a else 'services: {}\\n')
 if 'build' in a: done(1 if mode=='build-fail' else 0)
 if 'up' in a:
  s['up']+=1; state.write_text(json.dumps(s)); done()
 done()
done()
'''
with tempfile.TemporaryDirectory(prefix='macs-task13-dry-') as temp:
 p=Path(temp); bindir=p/'bin'; bindir.mkdir(); repo=p/'repo'; repo.mkdir()
 for file in ['docker-compose.yml','docker-compose.prod.yml']: (repo/file).write_text('services: {}\n')
 for cmd in ['docker','git','flock','sleep']:
  f=bindir/cmd; f.write_text(fake); f.chmod(0o755)
 for scenario,expected in [('first',0),('upgrade',0),('dirty',1),('locked',1),('snapshot-fail',1),('build-fail',1),('unhealthy',1),('rollback-fail',2),('first-unhealthy',1)]:
  trace=p/(scenario+'.trace'); state=p/(scenario+'.state')
  env={**os.environ,'PATH':str(bindir)+':'+os.environ['PATH'],'SCENARIO':scenario,'FAKE_STATE':str(state),'TRACE':str(trace),'REPO_DIR':str(repo),'LOCK_FILE':str(p/'lock'),'HEALTH_TIMEOUT_SECONDS':'2','HEALTH_POLL_INTERVAL_SECONDS':'1'}
  result=subprocess.run(['bash',script],env=env,text=True,capture_output=True)
  print(scenario+': exit '+str(result.returncode)+' expected '+str(expected)+'\n'+result.stdout+result.stderr)
  assert result.returncode==expected
  calls=trace.read_text()
  if scenario in ['dirty','locked','snapshot-fail']: assert 'git merge' not in calls
  if scenario=='unhealthy': assert '--no-build --force-recreate backend-ts' in calls
  if scenario=='first-unhealthy': assert 'rm -f -s backend-ts' in calls
print('9/9 deploy dry-run scenarios PASS; git/docker are fake executables; no server accessed')
```

## Verification notes

The requested ~/.Codex/CONVENTIONS.md does not exist on this machine; followed supplied AGENTS instructions and implementer contract. Integration output contains one intentional level=50 log for the null-project-status negative case; its test passes. OLD suite has three existing skips; NEW has none. No assertion weakened.

## Final status: DONE_WITH_CONCERNS

All verification work executed. Uncached speed gate PASS 7/7; cached p95 gate FAIL 6/7. Controller must decide whether to accept or dispatch profiling/fixes. No thresholds, assertions or application code were changed.

| Endpoint | OFF Express p95/RPS | OFF v2 p95/RPS | ON Express p95/RPS | ON v2 p95/RPS | cached p95 |
|---|---:|---:|---:|---:|---|
| /events?limit=100 | 18.167 ms / 3215.48 | 4.359 ms / 14777.48 | 2.306 ms / 30189.12 | 2.657 ms / 26346.91 | FAIL |
| /events/featured | 29.368 ms / 2045.43 | 2.946 ms / 22367.52 | 1.953 ms / 39064.68 | 2.597 ms / 30201.50 | FAIL |
| /projects?limit=100 | 41.837 ms / 1508.32 | 5.885 ms / 11078.00 | 2.975 ms / 21217.05 | 2.765 ms / 25980.59 | PASS |
| /projects/featured | 18.179 ms / 3663.52 | 3.011 ms / 21623.61 | 2.037 ms / 36330.55 | 2.525 ms / 29898.72 | FAIL |
| /members/leaderboard | 18.169 ms / 3864.66 | 4.104 ms / 17664.04 | 2.001 ms / 36772.49 | 2.642 ms / 27895.89 | FAIL |
| /members | 13.847 ms / 5910.25 | 3.656 ms / 19486.00 | 1.998 ms / 36987.67 | 2.666 ms / 27596.31 | FAIL |
| /sponsors/ | 21.313 ms / 3199.66 | 3.847 ms / 17479.02 | 2.217 ms / 32328.30 | 2.754 ms / 27007.92 | FAIL |

Cached p95 regressions: events list, events featured, projects featured, members leaderboard, members list, sponsors. Projects list passes. Cached throughput is recorded but is not an additional binding gate. compare.ts --informational retains exit 1 by design; it does not convert cached data into an uncached pass. All 28 endpoint measurements have successRate=1.0. Both versions correctly observed cache false/true for OFF/ON.

### bun bench/compare.ts --baseline bench/result-express-uncached.json --candidate bench/result-v2-uncached.json (exit 0)

```text
Endpoint	p95 old (ms)	p95 new (ms)	RPS old	RPS new	gate
/events?limit=100	18.167	4.359	3215.48	14777.48	PASS
/events/featured	29.368	2.946	2045.43	22367.52	PASS
/projects?limit=100	41.837	5.885	1508.32	11078.00	PASS
/projects/featured	18.179	3.011	3663.52	21623.61	PASS
/members/leaderboard	18.169	4.104	3864.66	17664.04	PASS
/members	13.847	3.656	5910.25	19486.00	PASS
/sponsors/	21.313	3.847	3199.66	17479.02	PASS
GATE PASS (7/7)
```

### bun bench/compare.ts --baseline bench/result-express-cached.json --candidate bench/result-v2-cached.json --informational (expected exit 1)

```text
Endpoint	p95 old (ms)	p95 new (ms)	RPS old	RPS new	gate
/events?limit=100	2.306	2.657	30189.12	26346.91	FAIL
TARGET MISS: /events?limit=100 x0.87
/events/featured	1.953	2.597	39064.68	30201.50	FAIL
TARGET MISS: /events/featured x0.77
/projects?limit=100	2.975	2.765	21217.05	25980.59	PASS
TARGET MISS: /projects?limit=100 x1.22
/projects/featured	2.037	2.525	36330.55	29898.72	FAIL
TARGET MISS: /projects/featured x0.82
/members/leaderboard	2.001	2.642	36772.49	27895.89	FAIL
TARGET MISS: /members/leaderboard x0.76
/members	1.998	2.666	36987.67	27596.31	FAIL
TARGET MISS: /members x0.75
/sponsors/	2.217	2.754	32328.30	27007.92	FAIL
TARGET MISS: /sponsors/ x0.84
INFORMATIONAL ONLY: comparison cannot satisfy the cache-off gate
```

### OLD_URL=http://127.0.0.1:8001 NEW_URL=http://127.0.0.1:8011 bun contract/differential.ts (TARGET_KIND/URL and CONTRACT_DB_URL_OLD/NEW supplied as above; exit 0)

```text
approved P5: GET /redoc (200 → 404)
approved h: GET /users?skip=-1 (500 → 422)
approved h: GET /users?limit=-1 (500 → 422)
approved h: GET /users?limit=0 (200 → 422)
approved h: GET /users?limit=100000 (200 → 422)
approved P1: GET /sponsors (307 → 200)
approved k: GET /projects (200 → 200)
approved k: GET /projects?limit=100 (200 → 200)
approved k: GET /projects?skip=1&limit=2 (200 → 200)
approved f: GET /projects?status=X (500 → 422)
approved k: GET /projects/admin (200 → 200)
approved f: GET /projects/admin?status=X (500 → 422)
differential: 132 requests, 0 diffs (12 approved deviations)
```

### OLD_URL=http://127.0.0.1:8001 NEW_URL=http://127.0.0.1:8011 bun contract/shadow-diff.ts (exit 0)

```text
shadow-diff: 48 requests, 0 diffs
```

### DATABASE_URL=$BENCH_DATABASE_URL JWT_SECRET_KEY=<public contract fixture> bun bench/explain.ts --phase after (exit 0)

```text
{
  "phase": "after",
  "tableRows": {
    "events": 31,
    "projects": 31,
    "members": 14,
    "sponsors": 28
  },
  "queryCounts": {
    "/events?limit=100": 1,
    "/events?limit=100&status=upcoming&sort_by=start_time": 1,
    "/events/featured": 1,
    "/events/by-slug/macs-log-26-20251021-133805": 1,
    "/projects?limit=100": 1,
    "/projects/featured": 1,
    "/projects/by-slug/endless-zombie": 1,
    "/members": 1,
    "/members/leaderboard": 1,
    "/sponsors/": 1,
    "/sponsors/categories": 1
  }
}
```

### bun run verify:static (final exit 0)

```text
$ bunx tsc --noEmit && bunx eslint . && bun test src && bun test bench
bun test v1.3.5 (1e86cebd)

src/app.test.ts:
(pass) GET / returns welcome [1.56ms]
(pass) GET /health [0.38ms]
(pass) system responses omit framework and automatic cache headers [0.10ms]
(pass) Hono fetch shell ignores forwarded spoofing [0.08ms]
(pass) global and write limiters use real IP and run before route parsing [4.10ms]
(pass) handler timeout returns JSON 503 with CORS and security headers [7.80ms]
(pass) production docs are disabled by default, and an explicit override enables them [9.64ms]
(pass) normalizing Content-Type preserves caller Request headers [0.97ms]
(pass) HEAD on a missing docs asset remains 404 rather than 405, and notFound precompiles route regexes once [1.31ms]
(pass) static and uploads mounts enforce resolved-prefix containment [0.43ms]
(pass) OpenAPI 3.1 info matches FastAPI [0.10ms]
(pass) all 63 operations document tags and responses [0.69ms]
(pass) seven described tags and OAuth2 password security [0.17ms]
(pass) form, JSON, multipart binary and ZIP metadata
(pass) parameters and shared validation response
(pass) two apps have independent registries and documents [24.61ms]
(pass) public local Swagger assets and docs bypass cache; redoc 404 [8.69ms]
(pass) exact /docs redirects to /docs/ and preserves the raw query string [0.30ms]
(pass) every relative Swagger HTML asset resolves successfully from /docs/ [3.92ms]
(pass) HEAD ZIP authenticates and lists but never resolves or opens file paths [4.99ms]

src/middleware/http.test.ts:
(pass) missing/non-Bearer Authorization: %s [1.78ms]
(pass) missing/non-Bearer Authorization: Basic secret [1.82ms]
(pass) missing/non-Bearer Authorization: bearer secret [0.78ms]
(pass) valid token loads the current user [1.62ms]
(pass) current user authorization: Kimlik doğrulanamadı [1.16ms]
(pass) current user authorization: Hesap aktif değil [1.22ms]
(pass) current user authorization: Hesabınız henüz onaylanmadı [0.99ms]
(pass) token errors preserve all four messages and Bearer challenge [4.35ms]
(pass) rate limit: 4th request is 429, counters are per-route and per-IP [1.20ms]
(pass) RATELIMIT_ENABLED=false allows 20 requests [1.69ms]
(pass) unknown path is JSON 404; known path unsupported method is 405 with Allow [0.97ms]
(pass) body >2 MB is 413 for JSON and form [4.48ms]
(pass) malformed JSON is FastAPI 422 [1.32ms]
(pass) PG 23505 maps to 409 [1.07ms]
(pass) PG 23503 maps to 409 [0.62ms]
(pass) PG 57014 maps to 503 [1.17ms]
(pass) Drizzle-wrapped PG 23505 maps to 409 [0.80ms]
(pass) Drizzle-wrapped PG 23503 maps to 409 [0.89ms]
(pass) Drizzle-wrapped PG 57014 maps to 503 [0.33ms]
(pass) plain and nested causes preserve PostgreSQL error mapping [1.80ms]
(pass) non-object, cyclic and excessive cause chains fall back to 500 [3.88ms]
(pass) unexpected error includes CORS headers and logs a stack [0.78ms]
(pass) HttpError headers are emitted with a single detail envelope [0.90ms]
(pass) every response carries security headers and validated request ID [2.50ms]
(pass) request completion logs exactly one line with correlation fields [1.65ms]
(pass) CORS allows configured origins, rejects others, preflight is 200 [0.79ms]
(pass) forwarded-for spoofing shares the default socket IP bucket [1.18ms]
(pass) non-PG inherited error code __proto__ stays a JSON 500 [0.59ms]
(pass) non-PG inherited error code constructor stays a JSON 500 [1.05ms]
(pass) non-PG inherited error code toString stays a JSON 500 [0.70ms]

src/config/env.test.ts:
(pass) parseEnv applies defaults [0.23ms]
(pass) parseEnv disables DOCS_ENABLED by default in production and enables otherwise [0.22ms]
(pass) parseEnv fails fast without JWT_SECRET_KEY [0.06ms]
(pass) parseEnv normalizes an empty ADMIN_SECRET_KEY to disabled [0.02ms]
(pass) parseEnv merges CORS_ORIGINS without duplicates
(pass) parseEnv accepts uppercase LOG_LEVEL
(pass) parseEnv parses configured values and postgres URLs [0.21ms]
(pass) parseEnv disables boolean flags for off
(pass) parseEnv disables boolean flags for false
(pass) parseEnv disables boolean flags for 0
(pass) parseEnv enables boolean flags for on [0.09ms]
(pass) parseEnv enables boolean flags for true [0.02ms]
(pass) parseEnv enables boolean flags for 1
(pass) parseEnv rejects invalid DATABASE_URL=
(pass) parseEnv rejects invalid DATABASE_URL=https://db.test/x
(pass) parseEnv rejects invalid DATABASE_URL=postgresql://
(pass) parseEnv rejects invalid JWT_SECRET_KEY=short
(pass) parseEnv rejects invalid NODE_ENV=invalid [0.20ms]
(pass) parseEnv rejects invalid LOG_LEVEL=trace
(pass) parseEnv rejects invalid PORT=65536
(pass) parseEnv rejects invalid PORT=1.5
(pass) parseEnv rejects invalid ACCESS_TOKEN_EXPIRE_MINUTES=0 [0.12ms]
(pass) parseEnv rejects invalid MAX_LOGIN_ATTEMPTS=-1 [0.04ms]
(pass) parseEnv rejects invalid LOCKOUT_DURATION=invalid
(pass) parseEnv rejects invalid MIN_PASSWORD_LENGTH=0 [0.09ms]
(pass) parseEnv rejects invalid MAX_UPLOAD_SIZE=0 [0.02ms]
(pass) parseEnv rejects invalid UPLOAD_DIR=
(pass) parseEnv rejects invalid STATIC_DIR=
(pass) parseEnv rejects invalid RATELIMIT_ENABLED=invalid [0.10ms]
(pass) parseEnv rejects invalid RESPONSE_CACHE=invalid
(pass) parseEnv rejects invalid RUN_MIGRATIONS=invalid
(pass) parseEnv rejects invalid NOMINATIM_USER_AGENT=
(pass) parseEnv requires DATABASE_URL
(pass) parseRunMigrations shares booleanFlag semantics for 0/off/false/1/on/true/unset [0.36ms]

src/security/security.test.ts:
(pass) security primitives > exact defaults
(pass) security primitives > single hop X-Real-IP only from private/loopback/test sockets [0.02ms]
(pass) security primitives > token burst, fractional refill, cap, and LRU touch [0.36ms]
(pass) security primitives > fixed windows reset at boundary and remain bounded
(pass) security primitives > login check precedes DB: twenty failures allowed, next blocked; window resets [0.12ms]
(pass) security primitives > login LRU checks refresh recency; successful checks do not count as failures
(pass) security primitives > clean login probes cannot allocate entries or evict a blocked IP
(pass) security primitives > checking an expired login entry deletes it without allocating a replacement
(pass) security primitives > headers: API/docs policies, exact HTTPS only, remove disclosure
(pass) security primitives > raw path/method guards and exact URL length boundary [0.32ms]
(pass) security primitives > header count/UTF8 bytes boundaries (wire name + colon-space + CRLF) [0.29ms]
(pass) security primitives > bounded reader accepts exact/empty and cancels chunked overflow immediately
(pass) security primitives > overflow remains 413 even if producer cancellation fails [0.33ms]
(pass) security primitives > dishonest small Content-Length cannot bypass streaming cap [0.13ms]
(pass) security primitives > Content-Length over limit rejected without pulling [0.06ms]
(pass) security primitives > body middleware preserves JSON/form validators, default cap, and 413 [1.78ms]
(pass) security primitives > handler timeout succeeds, propagates errors, and returns 503 [2.29ms]
(pass) security primitives > security logger allowlists fields and removes query/secret path segments
(pass) security primitives > security logs retain actual static routes and redact ids and free text [0.57ms]
(pass) security primitives > Hono route limit slowapi JSON and disable switch [0.05ms]

src/lib/native-validation.test.ts:
(pass) order: 401 precedes 422, including malformed JSON [1.12ms]
(pass) order: 403 precedes 422 [1.33ms]
(pass) bodyInvalid overrides malformed JSON and schema failure [0.85ms]
(pass) malformed field produces the entire FastAPI body [1.11ms]
(pass) status 204 skips serialization and sends empty body [0.91ms]
(pass) handler returning null sends JSON null [0.77ms]
(pass) Response leaves ownership with handler [0.56ms]
(pass) extra query params are ignored and parsed inputs reach handler [1.10ms]
(pass) form bodies are parsed before validation [0.34ms]
(pass) missing body field retains parent input in the entire 422 envelope [1.80ms]
(pass) protected route registration requires an injected user loader [0.03ms]
(pass) form-only route rejects JSON credentials as missing fields [0.87ms]
(pass) unauthenticated text body precedes media type validation [0.86ms]
(pass) rate limit precedes auth and params/query/body validation [1.55ms]
(pass) native OpenAPI hook retains raw input; JSON errors and overrides match FastAPI [1.62ms]
(pass) native param and query failures are tested separately (F11 validator ordering) [0.67ms]
(pass) legacy JSON route maps non-JSON media to a model_attributes_type 422 [1.51ms]
(pass) legacy JSON media types are case insensitive [0.87ms]

src/lib/cache.test.ts:
(pass) exported cache v2 constants match specification
(pass) cacheKey sorts query, ignores undefined values, and encodes separators without collisions [0.47ms]
(pass) selectEncoding respects q=0 exclusions, quality weights, priority, and explicit identity exclusion [0.08ms]
(pass) compressBytes skips payloads < 1024 bytes and precompresses >= 1024 bytes with lossless round-trip [1.02ms]
(pass) entry expires at ttl without extending on a hit and releases byteSize
(pass) LRU evicts the least recently used at max
(pass) replacing a key refreshes LRU position, updates byteSize, and never exceeds capacity
(pass) byte cap evicts LRU entries when maxBytes is exceeded and rejects single entry > maxBytes
(pass) invalidate removes only mapped domains and updates byteSize
(pass) INVALIDATES includes embedded creator and member/project dependencies
(pass) generations advance for every mapped domain even with no entries [0.35ms]
(pass) disabled cache never stores
(pass) weakEtag is stable, body-sensitive, weak, and identical for string and Uint8Array
(pass) getOrLoad coalesces 10 concurrent misses into 1 loader call and clears inFlight on rejection [20.05ms]
(pass) getOrLoad caches literal 'null' 200 payload (F2) but never caches non-cacheable or 404 results [0.23ms]
(pass) generation race guard (F29): invalidate during in-flight getOrLoad returns payload without caching [0.10ms]
(pass) warmupStartup fills up to 7 registered keys with max concurrency 2 [48.40ms]
(pass) invalidate re-warms only keys seen within recent 10-minute window with max concurrency 2 and respects stop/drain [82.89ms]
(pass) warmupRegistry is bounded by maxEntries/LRU and prunes expired/evicted registrations [0.46ms]
(pass) warmup failures report only safe classifications (keyHash + path, no query/PII/message/stack), walk error cause codes, fall back to logger.error, keep peers warming, and retry on next trigger [0.87ms]
(pass) empty invalidation targets do not even consult warmup clock

src/lib/http-error.test.ts:
(pass) HttpError preserves validation items as detail without a wrapper [0.06ms]
(pass) unauthorized carries the detail and Bearer challenge

src/lib/slug.test.ts:
(pass) createSlug(Yapay Zekâ & Öğrenme Günü) matches python unidecode [0.31ms]
(pass) createSlug(İstanbul Şişli ÇAĞRI) matches python unidecode
(pass) createSlug(ığüşöç IĞÜŞÖÇ) matches python unidecode
(pass) createSlug(C++ / C# Atölyesi) matches python unidecode
(pass) createSlug(  --Merhaba   Dünya!!  ) matches python unidecode
(pass) createSlug(München Straße) matches python unidecode
(pass) createSlug(Kahve ☕ Sohbeti) matches python unidecode
(pass) createSlug(½ maraton №5) matches python unidecode
(pass) createSlug(ﬁnal ’tırnak’ “çift”) matches python unidecode
(pass) createSlug(Ǆ ǅ æ Æ ß þ) matches python unidecode
(pass) createSlug(é café) matches python unidecode
(pass) createSlug(€100 Ödül) matches python unidecode
(pass) createSlug() matches python unidecode
(pass) createSlug(!!!) matches python unidecode
(pass) createSlug(MACS 2026 Bahar Tanışma) matches python unidecode
(pass) createSlug(Hackathon'26: 48 Saat) matches python unidecode
(pass) createSlug(Ağ Güvenliği 101 — CTF) matches python unidecode [0.25ms]
(pass) createSlug(a_b.c/d\e) matches python unidecode
(pass) createSlug(ÀÁÂÃÄÅ àáâãäå Ññ Øø Łł Đđ) matches python unidecode
(pass) createSlug(Œuvre cœur) matches python unidecode [0.03ms]
(pass) transliterate maps Latin letters, symbols and combining marks
(pass) resolveSlug handles collisions and empty bases [0.10ms]
(pass) non-latin title yields empty base

src/lib/public-cache.test.ts:
(pass) public cache negotiates compressed variants and consistent conditional responses [3.00ms]

src/lib/jwt.test.ts:
(pass) accepts python-jose token [1.07ms]
(pass) sign/verify round trip, exp = now + minutes [0.37ms]
(pass) expired [0.26ms]
(pass) expiration boundary is rejected [0.21ms]
(pass) bad signature [0.09ms]
(pass) garbage [0.01ms]
(pass) missing or empty sub: %s [0.21ms]
(pass) missing or empty sub:  [0.11ms]
(pass) rejects algorithms other than HS256 [0.15ms]
(pass) strips Bearer prefix [0.09ms]
(pass) rejects signed tokens with missing or wrong claims: {"sub":"a@b.co","exp":4102444800} [0.22ms]
(pass) rejects signed tokens with missing or wrong claims: {"sub":"a@b.co","role":"admin"} [0.10ms]
(pass) rejects signed tokens with missing or wrong claims: {"sub":"a@b.co","role":123,"exp":4102444800} [0.08ms]
(pass) rejects signed tokens with missing or wrong claims: {"sub":"a@b.co","role":"admin","exp":"4102444800"} [0.09ms]
(pass) rejects non-string subject in a valid HS256 token [0.12ms]
(pass) rejects a tampered payload [0.15ms]

src/lib/storage.test.ts:
(pass) local disk creates directory, saves bytes, sorted flat regular files only, removes idempotently [2.87ms]
(pass) localDiskStorage rejects traversal on every method [0.55ms]
(pass) signature .jpg <Buffer ff d8 ff> → true [0.42ms]
(pass) signature .jpeg <Buffer ff d8 ff> → true [0.17ms]
(pass) signature .png <Buffer 89 50 4e 47 0d 0a 1a 0a> → true [0.17ms]
(pass) signature .gif <Buffer 47 49 46 38 37 61> → true [0.16ms]
(pass) signature .gif <Buffer 47 49 46 38 39 61> → true [0.35ms]
(pass) signature .webp <Buffer 52 49 46 46 31 32 33 34 57 45 42 50> → true [0.33ms]
(pass) signature .webp <Buffer 52 49 46 46 31 32 33 34 57 41 56 45> → false [0.16ms]
(pass) signature .webp <Buffer 52 49 46 46 31 32 33 34 57 45 42> → false [0.20ms]
(pass) signature .png <Buffer 89 50 4e> → false [0.35ms]
(pass) signature .png <Buffer 4d 5a 20 6e 6f 74 20 61 20 70 6e 67> → false [0.31ms]
(pass) signature .bmp <Buffer 42 4d> → false [0.34ms]
(pass) signature .toString <Buffer 78> → false [0.34ms]
(pass) saveImage lowercases extension and validates before any write [1.32ms]

src/lib/password.test.ts:
(pass) verifies passlib hash [202.45ms]
(pass) rejects wrong password [201.44ms]
(pass) 72-byte truncation matches bcrypt 4.0.1 [610.32ms]
(pass) truncation counts UTF-8 bytes, not characters [400.38ms]
(pass) truncation may cut inside a multibyte character [619.04ms]
(pass) hashPassword truncates ASCII input before Bun can prehash it [603.52ms]
(pass) malformed or empty input returns false, never throws [0.26ms]
(pass) hashPassword emits a cost-12 bcrypt hash and verifies [406.00ms]

src/lib/datetime.test.ts:
(pass) pgToNaiveIso(2026-05-01 11:00:00) preserves wall time and microseconds
(pass) pgToNaiveIso(2026-05-01 11:00:00.5) preserves wall time and microseconds
(pass) pgToNaiveIso(2026-05-01T11:00:00) preserves wall time and microseconds
(pass) pgToNaiveIso(2026-05-01T11:00:00.123456) preserves wall time and microseconds
(pass) pgToNaiveIso(%s) preserves wall time and microseconds
(pass) pgToUtcIso(2026-05-01 11:00:00.123456+00) handles text and json_agg formats
(pass) pgToUtcIso(2026-05-01 11:00:00+00) handles text and json_agg formats
(pass) pgToUtcIso(2026-05-01 11:00:00.12+00) handles text and json_agg formats
(pass) pgToUtcIso(2026-05-01T11:00:00.123456+00:00) handles text and json_agg formats
(pass) pgToUtcIso(2026-05-01T11:00:00Z) handles text and json_agg formats
(pass) pgToUtcIso(%s) handles text and json_agg formats
(pass) pgToUtcIso rejects non-UTC or missing offsets: 2026-05-01 14:00:00+03
(pass) pgToUtcIso rejects non-UTC or missing offsets: 2026-05-01T14:00:00+03:00
(pass) pgToUtcIso rejects non-UTC or missing offsets: 2026-05-01 11:00:00
(pass) parseDateTimeInput(2026-05-01T10:00:00) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-05-01T10:00) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-05-01 10:00:00.250) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-05-01T10:00:00Z) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-05-01T10:00:00+03:00) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-01-01T01:30:00+03:00) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-05-01) produces a naive UTC PG literal
(pass) parseDateTimeInput(2024-02-29T23:59:59.123456-02:30) produces a naive UTC PG literal
(pass) parseDateTimeInput(0099-01-01T00:00:00) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-05-01T10:00:00.000000) produces a naive UTC PG literal
(pass) parseDateTimeInput rejects invalid date
(pass) parseDateTimeInput rejects invalid date yarin
(pass) parseDateTimeInput rejects invalid date 2026-13-01T00:00:00
(pass) parseDateTimeInput rejects invalid date 2026-02-30T00:00:00
(pass) parseDateTimeInput rejects invalid date 2026-05-01T25:00:00
(pass) parseDateTimeInput rejects invalid date 2026-00-01
(pass) parseDateTimeInput rejects invalid date 2026-01-00
(pass) parseDateTimeInput rejects invalid date 2025-02-29
(pass) parseDateTimeInput rejects invalid date 2026-05-01T10:60:00
(pass) parseDateTimeInput rejects invalid date 2026-05-01T10:00:60
(pass) parseDateTimeInput rejects invalid date 2026-05-01T10:00:00+24:00
(pass) parseDateTimeInput rejects invalid date 2026-05-01T10:00:00+03:60
(pass) parseDateTimeInput rejects invalid date 2026-05-01T10:00:00junk
(pass) parseDateTimeInput rejects invalid date 0000-01-01
(pass) parseDateTimeInput rejects invalid date 2026-05-01T10:00:00

(pass) slugTimestamp uses UTC

src/lib/validation.test.ts:
(pass) missing body field [0.02ms]
(pass) query int parsing
(pass) query le bound
(pass) query ge bound [0.93ms]
(pass) qInt default + absent [0.05ms]
(pass) qInt rejects floats and blanks [0.18ms]
(pass) qBool [0.17ms]
(pass) enum
(pass) string bounds
(pass) custom refine → value_error
(pass) path int [0.68ms]
(pass) nested array loc [0.21ms]
(pass) qStr normalizes empty and absent values [0.06ms]
(pass) query helpers reject non-scalar values
(pass) query defaults apply only when absent
(pass) datetime input becomes a PostgreSQL literal
(pass) validationError stores items without double nesting
(pass) primitive type errors and missing query input
(pass) bodyInt matches Pydantic 2.11.7 lax int accept, reject, and error-type table [0.75ms]
(pass) intentional int4 safety deviation: reject integers beyond Number.MAX_SAFE_INTEGER (Pydantic accepts; old DB writes fail) [0.29ms]
(pass) bodyBool matches Pydantic lax aliases, defaults, nullability and error types [0.16ms]
(pass) bodyFloat matches Pydantic coordinate parsing and bounded error types [0.46ms]
(pass) qBool accepts Pydantic single-letter query aliases

 271 pass
 0 fail
 1517 expect() calls
Ran 271 tests across 14 files. [3.57s]
bun test v1.3.5 (1e86cebd)

bench/compare.test.ts:
(pass) passes when p95 and RPS equal the baseline [1.51ms]
(pass) fails on slower p95 even with high RPS
(pass) fails on lower RPS even with low p95 [0.29ms]
(pass) fails on missing endpoint
(pass) fails when successRate is below 0.999
(pass) accepts successRate of exactly 0.999
(pass) 2x target does not affect gate and respects custom multiplier [0.20ms]
(pass) every endpoint must pass [0.03ms]
(pass) empty baseline, extra endpoint, invalid numbers and invalid multiplier fail closed [0.14ms]
(pass) CLI reads benchmark envelopes and reports pass, target miss and fail exit codes [64.55ms]
(pass) CLI rejects cached and missing cache metadata, and informational mode never passes a gate [221.46ms]

bench/run.test.ts:
(pass) two-request cache probe observes [ "MISS", "MISS" ] as false [2.21ms]
(pass) two-request cache probe observes [ "MISS", "HIT" ] as true [1.09ms]
(pass) two-request cache probe observes [ "HIT", "HIT" ] as true [0.93ms]
(pass) two-request cache probe observes [ undefined, undefined ] as false [1.01ms]
(pass) cache probe rejects non-200 responses rather than asserting cache-off [0.96ms]

 16 pass
 0 fail
 76 expect() calls
Ran 16 tests across 2 files. [320.00ms]
```

## CPU and query-plan findings

# Task 13 measurement provenance

Candidate: 90bdbc398c4fb19185ec09d8aa307b79d6957359; Express baseline: 620c94ab.
Bun 1.3.5, oha 1.17.0, Apple M3 Max (14 CPUs). Same local PG13 dump database, default migrated schema; table counts: events=31, projects=31, members=14, sponsors=28. No dump included.
Sequential runs: Express uncached → Express cached → Hono uncached → Hono cached; no server overlap. Production mode, rate limit disabled, explicit cache flag, same default logging, c=50, 5s warmup, 20s measurement, seven original endpoints. Cache probe evidence confirms all MISS with cache OFF and all HIT with cache ON.

Uncached: bench/compare.ts PASS 7/7. Cached: unchanged compare.ts --informational exits 1 by design; binding cached p95-only gate FAIL 6/7 (projects list passes). gates.json applies exactly the specified criteria; no thresholds changed, no rerun selection. All 28 measured success rates are 1.0.

CPU files sample uptime/load and process CPU every 10 seconds, including server and top ten processes. Docker VM includes Postgres load. No builds/test suites overlapped measurements; existing user apps, macs-db and macs-backend stayed running. Exact idle-host equivalence cannot be claimed. Explain files are current-run EXPLAIN ANALYZE BUFFERS, 11 routes at one SQL each. Five forced-index probes prove eligibility only; natural small-table plans may use sequential scans. These are not large-dataset scalability results or proof of the cached regression's root cause.

express-uncached: server CPU 1.5–181.0%; host 1-minute load 2.28–10.95.
express-cached: server CPU 0.7–111.0%; host 1-minute load 3.31–6.92.
v2-uncached: server CPU 0.3–85.0%; host 1-minute load 3.07–4.16.
v2-cached: server CPU 0.3–103.9%; host 1-minute load 2.97–3.70.

EXPLAIN output: `backend-ts/bench/task13-evidence/explain/`; 11/11 sampled read paths use one SQL, below <=2 bound. All five index eligibility probes PASS. Natural plans on this small real dataset include sequential scans, which is not evidence of index failure. Explain SQL output had trailing whitespace trimmed only; no plan or timing values changed. Original bench/explain artifacts restored after collecting new files into task13-evidence. Cached response probes are HIT/HIT for all seven paths on both implementations; no per-request cached SQL instrumentation was added. CPU data, cache hits and uncached EXPLAIN do not identify the source of the cached overhead. CPU stack sampling was not performed; a targeted follow-up is needed to attribute the regression.

## Cleanup, files and self-review

- Production verification container removed after SIGTERM exit 0; contract compose taken down with `docker compose -f backend-ts/docker-compose.contract.yml down` (no volume removal, per working contract). The contract databases use tmpfs; their disposable data disappears with their containers. Existing macs-db and macs-backend untouched and still running. Locally built images retained.
- External baseline worktree removed with `git worktree remove --force /tmp/macs-task13-express`; existing main worktree untouched. All four benchmark server processes exited 0. No remote server accessed; no push.
- Files changed: four new result JSON files and `backend-ts/bench/task13-evidence/` (CPU snapshots, cache probes, benchmark/compare output, deploy dry-run output, EXPLAIN and query-count evidence); this report. Existing v1 baseline result files, production code, bench scripts, contracts, Docker/deploy files, frontend/, backend/ and all .env files unchanged. Dump remains gitignored and untracked.
- Self-review: checked same DB, order, settings, version pin, honest cache metadata, exact cached p95 criterion and uncached p95+RPS criterion; reviewed staged diff and secret scan. Initial ZIP difference was test residue and disappeared on fresh app tmpfs without changing assertions. No product fix attempted for the speed failure. Test suite has 271 src + 16 bench + 227 integration + 18 harness + 4 shadow-script tests passing; OLD 223 passed/3 skipped, NEW 226 passed; differential 132/0 unexpected, shadow 48/0; 9/9 local deploy dry-run scenarios pass. One expected error log and the three OLD skips are disclosed above. Final static rerun passes.
- Commit split: `f3e1eb18 test(bench): record Express versus Hono v2 gates`; a separate docs commit records this final verification report. No attribution trailers.

Commit secret scan initially flagged public compose-fixture password-in-URL strings in command excerpts. Those URLs are represented above by environment variable names; actual commands used the local postgres/postgres fixture specified in docker-compose.contract.yml, at the exact hosts/ports/databases stated in the method. This is reporting sanitization only; no test or runtime setting changed.
