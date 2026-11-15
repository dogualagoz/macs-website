# Task 13b — cached-hit performance
Status: DONE_WITH_CONCERNS — cache-OFF PASS 7/7; cache-ON FAIL 2/7 (5 pass).

## Scope and implementation
Branch feat/backend-ts; starting HEAD 1f3f5a17. No push, remote server, subagent, frontend, Python backend, environment file, HTTP contract, threshold or database schema changes.

Performance Profiler workflow: measure isolated hot-path costs before editing; optimize measured costs; focused behavior checks; full correctness gates; unchanged back-to-back benchmark.

- Logging: pino destination now asynchronously batches at 4096 bytes with periodic flush at 1000 ms. Completion line, fields (reqId/method/path/status/ms/message plus pino metadata), levels and security event content remain unchanged. Graceful shutdown explicitly flushes. A 2001-record subprocess test verifies every completion/security record drains in order on normal exit. Delivery timing changes: low-volume records may wait up to the periodic flush; abrupt termination can lose buffered records. No sampling, disabled logging or discarded security events.
- Header guard: Buffer.byteLength computes UTF-8 wire length without allocating encoded byte arrays per header. Same count, framing bytes, thresholds, methods and path checks. Focused exact-boundary tests compare TextEncoder for ASCII/Latin1; existing Unicode and overflow tests remain.
- Static security header tuples and CSP strings are allocated once; dynamic docs CSP and exact HTTPS-only HSTS still applied on every response. Focused reuse test prevents cross-response policy leakage and verifies disclosure removal.
- IP resolution checks whether X-Real-IP exists before evaluating socket trust; same trusted/untrusted proxy and direct-IP results, now covered explicitly.
- CORS recognizes the two already-canonical Vary strings and avoids rebuilding them. Other Vary values retain original deduplication. Focused matrix verifies allowlisted/rejected origins, credentials and Vary preservation.
- Request IDs, token buckets, cache negotiation/key/ETag, response construction, routing and handler timeout remain unchanged. No security middleware bypass.

## Profile evidence
Reproduction: from backend-ts, bun --no-env-file bench/profile-hit.ts.
Saved profile-before.json and profile-after.json in backend-ts/bench/task13b-evidence.
Seven measured rounds of 20,000 calls after one warmup round; median/min/max microseconds retained. These are synthetic isolated steady-state microbenchmarks, NOT additive CPU attribution or end-to-end request latency. Hono rows include Response construction; CORS row includes routing. Logging /dev/null numbers isolate serialization/enqueue/write cost; buffered timings exclude final drain and are not disk-throughput measurements. Synthetic public GET has four typical oha headers; cache lookup has a single entry and tiny 14-record fixture, so larger cache registries and payloads may differ. Global/write buckets are profiled enabled with a non-exhausting budget; actual Task 13 benchmarks disable limits, and write buckets do not execute on GET.

## Method
Exact Task 13 order: Express 620c94ab external detached worktree /tmp/macs-task13b-express, cache OFF then ON; v2 OFF then ON. Same local Postgres 13 at 5436, macs_bench_task13 restored from the existing ignored root macs_db.sql; migration 0000/0001 once before both servers. Initial restore encountered absent dump ACL roles; created macs_admin/root NOLOGIN in disposable Postgres, recreated the benchmark DB and restored with ON_ERROR_STOP successfully. No dump copied/committed or reseeding between runs. Real table counts recorded below.

Bun 1.3.5; unchanged bench/run.ts/oha c=50, 5s warmup, 20s measurement, original seven endpoints. Production mode, rate limits false, explicit RESPONSE_CACHE false/true, default logging, same DB. Servers never overlap. Contract app containers stopped during benchmarks. CPU snapshots every 10s retain server CPU and host load/top ten processes. Existing user applications and macs-db/macs-backend remain running; idle-host equivalence is not claimed. Result-task13b-* files are new; Task 13 artifacts unchanged.

## Verification and self-review
Full command outputs follow after measurements. TDD not required by dispatch; behavior-preserving optimizations use focused tests plus unchanged security/HTTP/integration/contract suites. Initial logger test subprocess used an incorrect cwd; corrected before green run. Initial microbench buffered file destination needed its ready event before flush; fixed harness. Initial lint found void-expression shorthand in new test/harness callbacks; auto-fixed without assertion changes.

### Ranked costs (microseconds/call, median)

| Isolated operation | Before | After |
|---|---:|---:|
| Hono route + CORS + Response | 2.182 | 2.085 |
| completion logging (sync pino /dev/null) | 1.958 | 2.001 |
| Hono route + canonical path + Response | 1.114 | 1.120 |
| validateRequestHead (4 headers) | 0.906 | 0.730 |
| security headers | 0.794 | 0.635 |
| client IP | 0.531 | 0.276 |
| Response construction | 0.490 | 0.490 |
| cache lookup metadata + warmup touch | 0.483 | 0.476 |
| handler timeout | 0.451 | 0.483 |
| encoding negotiation | 0.171 | 0.184 |
| global token bucket | 0.110 | 0.109 |
| request id (randomUUID) | 0.108 | 0.103 |
| write token bucket (not used on GET) | 0.108 | 0.108 |
| cache key | 0.090 | 0.096 |
| ETag match | 0.064 | 0.065 |

Buffered pino alternative: 1.388 us; synchronous pino remeasured 2.001 us. CORS incremental proxy cost is route+CORS minus route alone; these nested measurements must not be summed. Fixture real DB counts: events=31, projects=31, members=14, sponsors=28.

### bun test src/security/hit-cost.test.ts src/security/security.test.ts src/middleware/cors.test.ts

Exit 0. Contract runs supplied both CONTRACT_DB_URL_OLD/NEW to disposable databases on 5435/5436. Integration uses default TEST_DATABASE_URL on 5436.

```text
bun test v1.3.5 (1e86cebd)

src/middleware/cors.test.ts:
(pass) CORS retains Vary, allowlist and credentials on cached and other responses [5.07ms]

src/security/security.test.ts:
(pass) security primitives > exact defaults [0.08ms]
(pass) security primitives > single hop X-Real-IP only from private/loopback/test sockets [0.23ms]
(pass) security primitives > token burst, fractional refill, cap, and LRU touch [0.15ms]
(pass) security primitives > fixed windows reset at boundary and remain bounded [0.20ms]
(pass) security primitives > login check precedes DB: twenty failures allowed, next blocked; window resets [0.10ms]
(pass) security primitives > login LRU checks refresh recency; successful checks do not count as failures [0.08ms]
(pass) security primitives > clean login probes cannot allocate entries or evict a blocked IP [0.06ms]
(pass) security primitives > checking an expired login entry deletes it without allocating a replacement [0.05ms]
(pass) security primitives > headers: API/docs policies, exact HTTPS only, remove disclosure [0.06ms]
(pass) security primitives > raw path/method guards and exact URL length boundary [0.12ms]
(pass) security primitives > header count/UTF8 bytes boundaries (wire name + colon-space + CRLF) [0.15ms]
(pass) security primitives > bounded reader accepts exact/empty and cancels chunked overflow immediately [1.40ms]
(pass) security primitives > overflow remains 413 even if producer cancellation fails [0.20ms]
(pass) security primitives > dishonest small Content-Length cannot bypass streaming cap [0.06ms]
(pass) security primitives > Content-Length over limit rejected without pulling [0.11ms]
(pass) security primitives > body middleware preserves JSON/form validators, default cap, and 413 [2.69ms]
(pass) security primitives > handler timeout succeeds, propagates errors, and returns 503 [1.52ms]
(pass) security primitives > security logger allowlists fields and removes query/secret path segments [0.69ms]
(pass) security primitives > security logs retain actual static routes and redact ids and free text [0.31ms]
(pass) security primitives > Hono route limit slowapi JSON and disable switch [0.47ms]

src/security/hit-cost.test.ts:
(pass) header byte limit matches TextEncoder for Unicode and Latin1 at exact boundary
(pass) static header reuse cannot leak docs CSP or HSTS to next response [0.25ms]
(pass) IP resolution preserves direct and trusted proxy behavior with or without real IP [0.06ms]

 24 pass
 0 fail
 221 expect() calls
Ran 24 tests across 3 files. [59.00ms]
```

### bun test src/lib/logger.test.ts

Exit 0. Contract runs supplied both CONTRACT_DB_URL_OLD/NEW to disposable databases on 5435/5436. Integration uses default TEST_DATABASE_URL on 5436.

```text
bun test v1.3.5 (1e86cebd)

src/lib/logger.test.ts:
(pass) buffered logger drains every completion and security record on normal exit [38.24ms]

 1 pass
 0 fail
 2004 expect() calls
Ran 1 test across 1 file. [44.00ms]
```

### bunx tsc --noEmit

Exit 0. Contract runs supplied both CONTRACT_DB_URL_OLD/NEW to disposable databases on 5435/5436. Integration uses default TEST_DATABASE_URL on 5436.

```text
(no output)
```

### bunx eslint .

Exit 0. Contract runs supplied both CONTRACT_DB_URL_OLD/NEW to disposable databases on 5435/5436. Integration uses default TEST_DATABASE_URL on 5436.

```text
(no output)
```

### bun test src

Exit 0. Contract runs supplied both CONTRACT_DB_URL_OLD/NEW to disposable databases on 5435/5436. Integration uses default TEST_DATABASE_URL on 5436.

```text
bun test v1.3.5 (1e86cebd)

src/app.test.ts:
(pass) GET / returns welcome [1.61ms]
(pass) GET /health [0.13ms]
(pass) system responses omit framework and automatic cache headers [0.11ms]
(pass) Hono fetch shell ignores forwarded spoofing [0.11ms]
(pass) global and write limiters use real IP and run before route parsing [4.47ms]
(pass) handler timeout returns JSON 503 with CORS and security headers [7.66ms]
(pass) production docs are disabled by default, and an explicit override enables them [9.73ms]
(pass) normalizing Content-Type preserves caller Request headers [0.92ms]
(pass) HEAD on a missing docs asset remains 404 rather than 405, and notFound precompiles route regexes once [1.30ms]
(pass) static and uploads mounts enforce resolved-prefix containment [0.15ms]
(pass) OpenAPI 3.1 info matches FastAPI [0.22ms]
(pass) all 63 operations document tags and responses [0.69ms]
(pass) seven described tags and OAuth2 password security [0.08ms]
(pass) form, JSON, multipart binary and ZIP metadata [0.26ms]
(pass) parameters and shared validation response [0.09ms]
(pass) two apps have independent registries and documents [21.24ms]
(pass) public local Swagger assets and docs bypass cache; redoc 404 [7.44ms]
(pass) exact /docs redirects to /docs/ and preserves the raw query string [0.21ms]
(pass) every relative Swagger HTML asset resolves successfully from /docs/ [4.26ms]
(pass) HEAD ZIP authenticates and lists but never resolves or opens file paths [5.10ms]

src/middleware/cors.test.ts:
(pass) CORS retains Vary, allowlist and credentials on cached and other responses [0.91ms]

src/middleware/http.test.ts:
(pass) missing/non-Bearer Authorization: %s [2.17ms]
(pass) missing/non-Bearer Authorization: Basic secret [1.20ms]
(pass) missing/non-Bearer Authorization: bearer secret [0.89ms]
(pass) valid token loads the current user [1.42ms]
(pass) current user authorization: Kimlik doğrulanamadı [1.13ms]
(pass) current user authorization: Hesap aktif değil [1.13ms]
(pass) current user authorization: Hesabınız henüz onaylanmadı [1.61ms]
(pass) token errors preserve all four messages and Bearer challenge [4.80ms]
(pass) rate limit: 4th request is 429, counters are per-route and per-IP [1.40ms]
(pass) RATELIMIT_ENABLED=false allows 20 requests [1.72ms]
(pass) unknown path is JSON 404; known path unsupported method is 405 with Allow [1.09ms]
(pass) body >2 MB is 413 for JSON and form [4.10ms]
(pass) malformed JSON is FastAPI 422 [2.01ms]
(pass) PG 23505 maps to 409 [0.63ms]
(pass) PG 23503 maps to 409 [1.33ms]
(pass) PG 57014 maps to 503 [0.83ms]
(pass) Drizzle-wrapped PG 23505 maps to 409 [0.84ms]
(pass) Drizzle-wrapped PG 23503 maps to 409 [0.90ms]
(pass) Drizzle-wrapped PG 57014 maps to 503 [0.14ms]
(pass) plain and nested causes preserve PostgreSQL error mapping [2.12ms]
(pass) non-object, cyclic and excessive cause chains fall back to 500 [4.67ms]
(pass) unexpected error includes CORS headers and logs a stack [0.96ms]
(pass) HttpError headers are emitted with a single detail envelope [1.03ms]
(pass) every response carries security headers and validated request ID [2.73ms]
(pass) request completion logs exactly one line with correlation fields [1.28ms]
(pass) CORS allows configured origins, rejects others, preflight is 200 [1.02ms]
(pass) forwarded-for spoofing shares the default socket IP bucket [1.03ms]
(pass) non-PG inherited error code __proto__ stays a JSON 500 [0.85ms]
(pass) non-PG inherited error code constructor stays a JSON 500 [0.76ms]
(pass) non-PG inherited error code toString stays a JSON 500 [0.64ms]

src/config/env.test.ts:
(pass) parseEnv applies defaults [0.09ms]
(pass) parseEnv disables DOCS_ENABLED by default in production and enables otherwise [0.23ms]
(pass) parseEnv fails fast without JWT_SECRET_KEY [0.06ms]
(pass) parseEnv normalizes an empty ADMIN_SECRET_KEY to disabled [0.01ms]
(pass) parseEnv merges CORS_ORIGINS without duplicates [0.04ms]
(pass) parseEnv accepts uppercase LOG_LEVEL
(pass) parseEnv parses configured values and postgres URLs [0.17ms]
(pass) parseEnv disables boolean flags for off [0.01ms]
(pass) parseEnv disables boolean flags for false
(pass) parseEnv disables boolean flags for 0 [0.03ms]
(pass) parseEnv enables boolean flags for on [0.01ms]
(pass) parseEnv enables boolean flags for true
(pass) parseEnv enables boolean flags for 1 [0.02ms]
(pass) parseEnv rejects invalid DATABASE_URL= [0.05ms]
(pass) parseEnv rejects invalid DATABASE_URL=https://db.test/x [0.06ms]
(pass) parseEnv rejects invalid DATABASE_URL=postgresql:// [0.03ms]
(pass) parseEnv rejects invalid JWT_SECRET_KEY=short [0.04ms]
(pass) parseEnv rejects invalid NODE_ENV=invalid [0.02ms]
(pass) parseEnv rejects invalid LOG_LEVEL=trace [0.04ms]
(pass) parseEnv rejects invalid PORT=65536 [0.01ms]
(pass) parseEnv rejects invalid PORT=1.5 [0.03ms]
(pass) parseEnv rejects invalid ACCESS_TOKEN_EXPIRE_MINUTES=0 [0.01ms]
(pass) parseEnv rejects invalid MAX_LOGIN_ATTEMPTS=-1 [0.06ms]
(pass) parseEnv rejects invalid LOCKOUT_DURATION=invalid [0.12ms]
(pass) parseEnv rejects invalid MIN_PASSWORD_LENGTH=0 [0.02ms]
(pass) parseEnv rejects invalid MAX_UPLOAD_SIZE=0
(pass) parseEnv rejects invalid UPLOAD_DIR= [0.05ms]
(pass) parseEnv rejects invalid STATIC_DIR= [0.02ms]
(pass) parseEnv rejects invalid RATELIMIT_ENABLED=invalid [0.06ms]
(pass) parseEnv rejects invalid RESPONSE_CACHE=invalid [0.02ms]
(pass) parseEnv rejects invalid RUN_MIGRATIONS=invalid
(pass) parseEnv rejects invalid NOMINATIM_USER_AGENT=
(pass) parseEnv requires DATABASE_URL [0.10ms]
(pass) parseRunMigrations shares booleanFlag semantics for 0/off/false/1/on/true/unset [0.18ms]

src/security/security.test.ts:
(pass) security primitives > exact defaults
(pass) security primitives > single hop X-Real-IP only from private/loopback/test sockets [0.55ms]
(pass) security primitives > token burst, fractional refill, cap, and LRU touch [0.19ms]
(pass) security primitives > fixed windows reset at boundary and remain bounded [0.06ms]
(pass) security primitives > login check precedes DB: twenty failures allowed, next blocked; window resets [0.10ms]
(pass) security primitives > login LRU checks refresh recency; successful checks do not count as failures [0.03ms]
(pass) security primitives > clean login probes cannot allocate entries or evict a blocked IP [0.08ms]
(pass) security primitives > checking an expired login entry deletes it without allocating a replacement [0.04ms]
(pass) security primitives > headers: API/docs policies, exact HTTPS only, remove disclosure [0.08ms]
(pass) security primitives > raw path/method guards and exact URL length boundary [0.08ms]
(pass) security primitives > header count/UTF8 bytes boundaries (wire name + colon-space + CRLF) [0.09ms]
(pass) security primitives > bounded reader accepts exact/empty and cancels chunked overflow immediately [0.19ms]
(pass) security primitives > overflow remains 413 even if producer cancellation fails [0.29ms]
(pass) security primitives > dishonest small Content-Length cannot bypass streaming cap [0.13ms]
(pass) security primitives > Content-Length over limit rejected without pulling [0.06ms]
(pass) security primitives > body middleware preserves JSON/form validators, default cap, and 413 [1.68ms]
(pass) security primitives > handler timeout succeeds, propagates errors, and returns 503 [2.30ms]
(pass) security primitives > security logger allowlists fields and removes query/secret path segments [0.23ms]
(pass) security primitives > security logs retain actual static routes and redact ids and free text [0.35ms]
(pass) security primitives > Hono route limit slowapi JSON and disable switch [0.26ms]

src/security/hit-cost.test.ts:
(pass) header byte limit matches TextEncoder for Unicode and Latin1 at exact boundary
(pass) static header reuse cannot leak docs CSP or HSTS to next response [0.20ms]
(pass) IP resolution preserves direct and trusted proxy behavior with or without real IP

src/lib/native-validation.test.ts:
(pass) order: 401 precedes 422, including malformed JSON [2.10ms]
(pass) order: 403 precedes 422 [1.16ms]
(pass) bodyInvalid overrides malformed JSON and schema failure [1.13ms]
(pass) malformed field produces the entire FastAPI body [1.03ms]
(pass) status 204 skips serialization and sends empty body [0.78ms]
(pass) handler returning null sends JSON null [0.66ms]
(pass) Response leaves ownership with handler [1.23ms]
(pass) extra query params are ignored and parsed inputs reach handler [1.39ms]
(pass) form bodies are parsed before validation [1.40ms]
(pass) missing body field retains parent input in the entire 422 envelope [1.01ms]
(pass) protected route registration requires an injected user loader [0.42ms]
(pass) form-only route rejects JSON credentials as missing fields [0.74ms]
(pass) unauthenticated text body precedes media type validation [0.55ms]
(pass) rate limit precedes auth and params/query/body validation [2.03ms]
(pass) native OpenAPI hook retains raw input; JSON errors and overrides match FastAPI [1.53ms]
(pass) native param and query failures are tested separately (F11 validator ordering) [1.56ms]
(pass) legacy JSON route maps non-JSON media to a model_attributes_type 422 [0.87ms]
(pass) legacy JSON media types are case insensitive [0.71ms]

src/lib/cache.test.ts:
(pass) exported cache v2 constants match specification
(pass) cacheKey sorts query, ignores undefined values, and encodes separators without collisions [0.82ms]
(pass) selectEncoding respects q=0 exclusions, quality weights, priority, and explicit identity exclusion [0.09ms]
(pass) compressBytes skips payloads < 1024 bytes and precompresses >= 1024 bytes with lossless round-trip [0.95ms]
(pass) entry expires at ttl without extending on a hit and releases byteSize [0.11ms]
(pass) LRU evicts the least recently used at max [0.03ms]
(pass) replacing a key refreshes LRU position, updates byteSize, and never exceeds capacity [0.05ms]
(pass) byte cap evicts LRU entries when maxBytes is exceeded and rejects single entry > maxBytes [0.06ms]
(pass) invalidate removes only mapped domains and updates byteSize [0.05ms]
(pass) INVALIDATES includes embedded creator and member/project dependencies [0.02ms]
(pass) generations advance for every mapped domain even with no entries [0.03ms]
(pass) disabled cache never stores
(pass) weakEtag is stable, body-sensitive, weak, and identical for string and Uint8Array [0.03ms]
(pass) getOrLoad coalesces 10 concurrent misses into 1 loader call and clears inFlight on rejection [19.51ms]
(pass) getOrLoad caches literal 'null' 200 payload (F2) but never caches non-cacheable or 404 results [0.12ms]
(pass) generation race guard (F29): invalidate during in-flight getOrLoad returns payload without caching [0.13ms]
(pass) warmupStartup fills up to 7 registered keys with max concurrency 2 [45.08ms]
(pass) invalidate re-warms only keys seen within recent 10-minute window with max concurrency 2 and respects stop/drain [83.73ms]
(pass) warmupRegistry is bounded by maxEntries/LRU and prunes expired/evicted registrations [0.32ms]
(pass) warmup failures report only safe classifications (keyHash + path, no query/PII/message/stack), walk error cause codes, fall back to logger.error, keep peers warming, and retry on next trigger [1.28ms]
(pass) empty invalidation targets do not even consult warmup clock [0.24ms]

src/lib/http-error.test.ts:
(pass) HttpError preserves validation items as detail without a wrapper
(pass) unauthorized carries the detail and Bearer challenge [0.22ms]

src/lib/slug.test.ts:
(pass) createSlug(Yapay Zekâ & Öğrenme Günü) matches python unidecode [0.41ms]
(pass) createSlug(İstanbul Şişli ÇAĞRI) matches python unidecode [0.04ms]
(pass) createSlug(ığüşöç IĞÜŞÖÇ) matches python unidecode
(pass) createSlug(C++ / C# Atölyesi) matches python unidecode
(pass) createSlug(  --Merhaba   Dünya!!  ) matches python unidecode
(pass) createSlug(München Straße) matches python unidecode
(pass) createSlug(Kahve ☕ Sohbeti) matches python unidecode [0.01ms]
(pass) createSlug(½ maraton №5) matches python unidecode [0.01ms]
(pass) createSlug(ﬁnal ’tırnak’ “çift”) matches python unidecode [0.01ms]
(pass) createSlug(Ǆ ǅ æ Æ ß þ) matches python unidecode [0.01ms]
(pass) createSlug(é café) matches python unidecode
(pass) createSlug(€100 Ödül) matches python unidecode
(pass) createSlug() matches python unidecode
(pass) createSlug(!!!) matches python unidecode
(pass) createSlug(MACS 2026 Bahar Tanışma) matches python unidecode
(pass) createSlug(Hackathon'26: 48 Saat) matches python unidecode
(pass) createSlug(Ağ Güvenliği 101 — CTF) matches python unidecode [0.02ms]
(pass) createSlug(a_b.c/d\e) matches python unidecode
(pass) createSlug(ÀÁÂÃÄÅ àáâãäå Ññ Øø Łł Đđ) matches python unidecode [0.04ms]
(pass) createSlug(Œuvre cœur) matches python unidecode [0.01ms]
(pass) transliterate maps Latin letters, symbols and combining marks [0.06ms]
(pass) resolveSlug handles collisions and empty bases [0.08ms]
(pass) non-latin title yields empty base [0.02ms]

src/lib/public-cache.test.ts:
(pass) public cache negotiates compressed variants and consistent conditional responses [3.28ms]

src/lib/jwt.test.ts:
(pass) accepts python-jose token [1.22ms]
(pass) sign/verify round trip, exp = now + minutes [0.57ms]
(pass) expired [0.42ms]
(pass) expiration boundary is rejected [0.18ms]
(pass) bad signature [0.15ms]
(pass) garbage [0.06ms]
(pass) missing or empty sub: %s [0.18ms]
(pass) missing or empty sub:  [0.11ms]
(pass) rejects algorithms other than HS256 [0.17ms]
(pass) strips Bearer prefix [0.10ms]
(pass) rejects signed tokens with missing or wrong claims: {"sub":"a@b.co","exp":4102444800} [0.25ms]
(pass) rejects signed tokens with missing or wrong claims: {"sub":"a@b.co","role":"admin"} [0.13ms]
(pass) rejects signed tokens with missing or wrong claims: {"sub":"a@b.co","role":123,"exp":4102444800} [0.11ms]
(pass) rejects signed tokens with missing or wrong claims: {"sub":"a@b.co","role":"admin","exp":"4102444800"} [0.11ms]
(pass) rejects non-string subject in a valid HS256 token [0.26ms]
(pass) rejects a tampered payload [0.21ms]

src/lib/storage.test.ts:
(pass) local disk creates directory, saves bytes, sorted flat regular files only, removes idempotently [2.57ms]
(pass) localDiskStorage rejects traversal on every method [0.67ms]
(pass) signature .jpg <Buffer ff d8 ff> → true [0.31ms]
(pass) signature .jpeg <Buffer ff d8 ff> → true [0.22ms]
(pass) signature .png <Buffer 89 50 4e 47 0d 0a 1a 0a> → true [0.19ms]
(pass) signature .gif <Buffer 47 49 46 38 37 61> → true [0.18ms]
(pass) signature .gif <Buffer 47 49 46 38 39 61> → true [0.19ms]
(pass) signature .webp <Buffer 52 49 46 46 31 32 33 34 57 45 42 50> → true [0.19ms]
(pass) signature .webp <Buffer 52 49 46 46 31 32 33 34 57 41 56 45> → false [0.20ms]
(pass) signature .webp <Buffer 52 49 46 46 31 32 33 34 57 45 42> → false [0.19ms]
(pass) signature .png <Buffer 89 50 4e> → false [0.18ms]
(pass) signature .png <Buffer 4d 5a 20 6e 6f 74 20 61 20 70 6e 67> → false [0.19ms]
(pass) signature .bmp <Buffer 42 4d> → false [0.21ms]
(pass) signature .toString <Buffer 78> → false [0.21ms]
(pass) saveImage lowercases extension and validates before any write [0.97ms]

src/lib/password.test.ts:
(pass) verifies passlib hash [208.66ms]
(pass) rejects wrong password [196.73ms]
(pass) 72-byte truncation matches bcrypt 4.0.1 [607.99ms]
(pass) truncation counts UTF-8 bytes, not characters [410.60ms]
(pass) truncation may cut inside a multibyte character [619.86ms]
(pass) hashPassword truncates ASCII input before Bun can prehash it [619.60ms]
(pass) malformed or empty input returns false, never throws [0.23ms]
(pass) hashPassword emits a cost-12 bcrypt hash and verifies [410.92ms]

src/lib/datetime.test.ts:
(pass) pgToNaiveIso(2026-05-01 11:00:00) preserves wall time and microseconds [0.16ms]
(pass) pgToNaiveIso(2026-05-01 11:00:00.5) preserves wall time and microseconds [0.06ms]
(pass) pgToNaiveIso(2026-05-01T11:00:00) preserves wall time and microseconds
(pass) pgToNaiveIso(2026-05-01T11:00:00.123456) preserves wall time and microseconds
(pass) pgToNaiveIso(%s) preserves wall time and microseconds
(pass) pgToUtcIso(2026-05-01 11:00:00.123456+00) handles text and json_agg formats [0.02ms]
(pass) pgToUtcIso(2026-05-01 11:00:00+00) handles text and json_agg formats
(pass) pgToUtcIso(2026-05-01 11:00:00.12+00) handles text and json_agg formats
(pass) pgToUtcIso(2026-05-01T11:00:00.123456+00:00) handles text and json_agg formats
(pass) pgToUtcIso(2026-05-01T11:00:00Z) handles text and json_agg formats
(pass) pgToUtcIso(%s) handles text and json_agg formats
(pass) pgToUtcIso rejects non-UTC or missing offsets: 2026-05-01 14:00:00+03 [0.04ms]
(pass) pgToUtcIso rejects non-UTC or missing offsets: 2026-05-01T14:00:00+03:00
(pass) pgToUtcIso rejects non-UTC or missing offsets: 2026-05-01 11:00:00
(pass) parseDateTimeInput(2026-05-01T10:00:00) produces a naive UTC PG literal [0.04ms]
(pass) parseDateTimeInput(2026-05-01T10:00) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-05-01 10:00:00.250) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-05-01T10:00:00Z) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-05-01T10:00:00+03:00) produces a naive UTC PG literal [0.04ms]
(pass) parseDateTimeInput(2026-01-01T01:30:00+03:00) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-05-01) produces a naive UTC PG literal
(pass) parseDateTimeInput(2024-02-29T23:59:59.123456-02:30) produces a naive UTC PG literal
(pass) parseDateTimeInput(0099-01-01T00:00:00) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-05-01T10:00:00.000000) produces a naive UTC PG literal
(pass) parseDateTimeInput rejects invalid date  [0.02ms]
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

(pass) slugTimestamp uses UTC [0.02ms]

src/lib/validation.test.ts:
(pass) missing body field [0.44ms]
(pass) query int parsing [0.21ms]
(pass) query le bound [0.10ms]
(pass) query ge bound [0.14ms]
(pass) qInt default + absent [0.04ms]
(pass) qInt rejects floats and blanks [0.23ms]
(pass) qBool [0.11ms]
(pass) enum [0.26ms]
(pass) string bounds [0.38ms]
(pass) custom refine → value_error [0.15ms]
(pass) path int [0.15ms]
(pass) nested array loc [0.20ms]
(pass) qStr normalizes empty and absent values [0.05ms]
(pass) query helpers reject non-scalar values [0.06ms]
(pass) query defaults apply only when absent [0.06ms]
(pass) datetime input becomes a PostgreSQL literal [0.15ms]
(pass) validationError stores items without double nesting [0.03ms]
(pass) primitive type errors and missing query input [0.16ms]
(pass) bodyInt matches Pydantic 2.11.7 lax int accept, reject, and error-type table [0.62ms]
(pass) intentional int4 safety deviation: reject integers beyond Number.MAX_SAFE_INTEGER (Pydantic accepts; old DB writes fail) [0.15ms]
(pass) bodyBool matches Pydantic lax aliases, defaults, nullability and error types [0.66ms]
(pass) bodyFloat matches Pydantic coordinate parsing and bounded error types [0.37ms]
(pass) qBool accepts Pydantic single-letter query aliases [0.08ms]

src/lib/logger.test.ts:
(pass) buffered logger drains every completion and security record on normal exit [42.98ms]

 276 pass
 0 fail
 3563 expect() calls
Ran 276 tests across 17 files. [3.65s]
```

### bun test test/integration

Exit 0. Contract runs supplied both CONTRACT_DB_URL_OLD/NEW to disposable databases on 5435/5436. Integration uses default TEST_DATABASE_URL on 5436.

```text
bun test v1.3.5 (1e86cebd)

test/integration/migrate.test.ts:
(pass) baseline on empty DB reproduces contract/schema.sql [127.61ms]
(pass) second run applies nothing [42.64ms]
(pass) on alembic-managed DB at head: baseline is a no-op [179.88ms]
(pass) refuses when alembic_version is not head [29.66ms]
(pass) refuses snapshot with empty alembic_version and no completed baseline [27.67ms]
(pass) refuses unknown state: users table exists, no alembic_version, no __bun_migrations [21.96ms]
(pass) an empty ledger does not authorize an empty alembic_version [29.97ms]
(pass) file starting with "-- no-transaction" runs outside a transaction [46.69ms]
(pass) failed transactional baseline rolls back DDL and ledger insert, releases lock [33.85ms]
(pass) ledger insert failure rolls back the complete baseline [36.76ms]
(pass) concurrent pools serialize migrations and release the session lock [162.81ms]
(pass) migration restores the reserved session message setting [49.77ms]
(pass) CLI RUN_MIGRATIONS=0 skips without a reachable DB [76.74ms]
(pass) CLI RUN_MIGRATIONS=off skips without a reachable DB [64.28ms]
(pass) CLI RUN_MIGRATIONS=false skips without a reachable DB [58.40ms]
(pass) CLI RUN_MIGRATIONS=OFF skips without a reachable DB [61.52ms]
(pass) CLI RUN_MIGRATIONS=FALSE skips without a reachable DB [59.55ms]
(pass) CLI RUN_MIGRATIONS=1 runs migrations when enabled or unset [117.51ms]
(pass) CLI RUN_MIGRATIONS=on runs migrations when enabled or unset [105.79ms]
(pass) CLI RUN_MIGRATIONS=true runs migrations when enabled or unset [105.86ms]
(pass) CLI RUN_MIGRATIONS=unset runs migrations when enabled or unset [111.24ms]
(pass) CLI rejects invalid RUN_MIGRATIONS flag [62.37ms]
(pass) no-transaction splits semicolons followed by spaces, tabs and CRLF [44.39ms]
(pass) 0001 creates the five expected valid indexes, matches schema and is idempotent [59.82ms]
(pass) concurrent migration rebuilds its invalid index and preserves unrelated invalid indexes [47.26ms]
(pass) concurrent migration refuses to record an index that remains invalid [42.54ms]
(pass) concurrent migration refuses to record an index that remains missing [45.22ms]
(pass) failed concurrent build leaves no applied ledger row [38.62ms]
(pass) no-transaction disables timeout and restores settings after failure=%s [269.17ms]
(pass) no-transaction disables timeout and restores settings after failure=%s [192.12ms]

test/integration/required-bodies.test.ts:
(pass) auth registration requires body; empty login form reports missing credentials [33.25ms]
(pass) users body routes require body while query-only profile PUT accepts none [21.31ms]
(pass) sponsors create, partial update and geocode require body without Content-Type [16.86ms]
(pass) members create and partial update require body without Content-Type [15.78ms]
(pass) uploads missing body reports missing file without Content-Type [8.13ms]

test/integration/security.test.ts:
(pass) socket IP ignores XFF; loopback real-IP splits global/write buckets and LRU eviction resets only evicted IPs [22.97ms]
(pass) 21st failed login blocks before SQL, other IP and account lockout stay independent [1038.93ms]
(pass) size guards, chunked body and handler timeout produce safe security logs [118.88ms]
(pass) idleTimeout closes a stalled keepalive TCP client [2830.78ms]
(pass) security headers, CORS on successes/errors and intentional error logging [38.72ms]
(pass) production docs toggle, path/method sanitation and auth before validation [53.71ms]

test/integration/auth-users.test.ts:
(pass) auth/users database integration > unconfigured admin registration returns exact 500 before querying users [15.28ms]
(pass) auth/users database integration > unconfigured admin registration preserves validation and rate limit precedence [10.65ms]
(pass) auth/users database integration > 11th login in a minute returns exact 429 [28.71ms]
(pass) auth/users database integration > user list uses two public-only SQL queries including authentication [12.19ms]
(pass) auth/users database integration > expired lockout unlocks with SQL clock even with skewed token clock [214.21ms]
(pass) auth/users database integration > concurrent failed logins do not lose increments or bypass lockout [994.92ms]
(pass) concurrent createUser calls map the unique violation to duplicate-email 400 [217.23ms]
(pass) serializeUser coerces NULL counter, preserves microseconds, and excludes credentials [17.17ms]
(pass) every user UPDATE refreshes updated_at including CLI services and auth mutations [795.57ms]
(pass) SQL lockout includes a NULL timestamp reset and configured duration boundary [407.52ms]
(pass) list ties use id descending and pagination returns the full total [14.69ms]
(pass) login shield check and failures require enabled POST login [13.47ms]
(pass) PG user JSON is one credential-free CTE with UTC precision and empty-page total [12.08ms]
(pass) login shield rejects before validation and DB and receives resolved IP [7.43ms]
(pass) native JSON validation preserves original input with mixed-case content type [6.93ms]
(pass) user aggregation explicitly orders equal timestamps by descending id [8.96ms]

test/integration/events.test.ts:
(pass) events database integration > public list uses one joined SQL, never selects credentials, and ignores Authorization [15.29ms]
(pass) events database integration > featured flagged and fallback reads each use one SQL [10.53ms]
(pass) events database integration > category delete rollback leaves event references intact when repo DELETE fails [10.01ms]
(pass) events database integration > PG JSON coerces NULL flags without losing datetime microseconds [10.06ms]
(pass) events database integration > invalid create bodies retain custom 400 after auth [10.57ms]
(pass) events database integration > body-model event routes reject absent bodies without Content-Type [14.39ms]
(pass) events database integration > empty featured is 200 null while missing detail is 404 [9.62ms]
(pass) events database integration > create accepts datetime-local, Z and explicit offsets [21.51ms]
(pass) events database integration > slug race maps real unique violation to 409 and preserves one row [15.50ms]
(pass) events database integration > concurrent featured writes and failed featured updates preserve exactly one featured event [20.49ms]
(pass) events database integration > empty sort and equal values have deterministic id ASC tie-breaking [11.62ms]
(pass) events database integration > past first flagged event triggers fallback even if a later flagged event is upcoming [8.99ms]

test/integration/members-sponsors.test.ts:
(pass) members and sponsors database integration > sponsor reads build ordered JSON in exactly one SQL with slash parity [15.71ms]
(pass) members and sponsors database integration > NULL sponsor booleans serialize to false while nullable fields remain null [7.24ms]
(pass) members and sponsors database integration > NULL sponsor active rows never match false [6.77ms]
(pass) members and sponsors database integration > geocode preserves sponsor cache generation and entries [9.42ms]
(pass) members and sponsors database integration > member public reads build PG JSON in exactly one query without user_id [10.01ms]
(pass) members and sponsors database integration > leaderboard issues exactly one aggregate SQL and returns required counts [6.92ms]
(pass) members and sponsors database integration > public lists use at most two SQL, project memberships included, and no credential/user_id projection [8.86ms]
(pass) members and sponsors database integration > member writes invalidate members and projects only after commit; rollback keeps caches warm [17.16ms]
(pass) members and sponsors database integration > member deletion cascades only its memberships in the database [11.85ms]
(pass) members and sponsors database integration > member serializer coerces NULL active to false and preserves timestamp precision [6.90ms]
(pass) members and sponsors database integration > NULL contribution_count serializes to zero and SUM ignores it [8.66ms]
(pass) members and sponsors database integration > leaderboard excludes members with only filtered projects and breaks aggregate ties by id [12.49ms]
(pass) members and sponsors database integration > members with tied creation dates order by descending id [9.24ms]
(pass) members and sponsors database integration > sponsor categories include inactive sponsors, exclude empty category and support both slash forms [10.61ms]
(pass) members and sponsors database integration > invalid sponsor update is rejected with 422 before writing and preserves cached GET /sponsors/:id [19.07ms]
(pass) geocode with injected upstream (no real network) > success maps fields and sends exact URL parameters, User-Agent and timeout signal [9.41ms]
(pass) geocode with injected upstream (no real network) > geocode creates a five-second AbortSignal timeout [6.91ms]
(pass) geocode with injected upstream (no real network) > configured geocode User-Agent is forwarded [6.75ms]
(pass) geocode with injected upstream (no real network) > empty upstream array returns exact 404 [7.07ms]
(pass) geocode with injected upstream (no real network) > upstream AbortError returns exact 504 [6.85ms]
(pass) geocode with injected upstream (no real network) > upstream TimeoutError returns exact 504 [7.14ms]
(pass) geocode with injected upstream (no real network) > upstream network returns exact logged 500 [8.86ms]
(pass) geocode with injected upstream (no real network) > upstream http503 returns exact logged 500 [6.88ms]
(pass) geocode with injected upstream (no real network) > malformed upstream JSON returns the logged service error [8.77ms]
(pass) geocode with injected upstream (no real network) > invalid geocode shape {"payload":{"unexpected":true}} retains the legacy unhandled 500 behavior [7.19ms]
(pass) geocode with injected upstream (no real network) > invalid geocode shape {"payload":[null]} retains the legacy unhandled 500 behavior [7.02ms]
(pass) geocode with injected upstream (no real network) > invalid geocode shape {"payload":["bad"]} retains the legacy unhandled 500 behavior [9.80ms]
(pass) geocode with injected upstream (no real network) > invalid geocode shape {"payload":[{}]} retains the legacy unhandled 500 behavior [6.43ms]
(pass) geocode with injected upstream (no real network) > invalid geocode shape {"payload":[{"lat":"invalid","lon":"29","display_name":"İstanbul"}]} retains the legacy unhandled 500 behavior [7.09ms]
(pass) geocode with injected upstream (no real network) > invalid geocode shape {"payload":[{"lat":"41","lon":"29"}]} retains the legacy unhandled 500 behavior [8.03ms]
(pass) geocode with injected upstream (no real network) > authentication and input validation happen before upstream fetch [7.13ms]
(pass) geocode with injected upstream (no real network) > geocode rate limit is ten per minute [17.94ms]

test/integration/cache.test.ts:
(pass) public GET sets headers; identical and reordered queries HIT with zero SQL [14.01ms]
(pass) different query values and paths never share a response [11.53ms]
(pass) If-None-Match handles lists, whitespace, strong/weak tags and wildcard with no body [8.41ms]
(pass) Authorization garbage bypasses cache reads/writes and conditional responses [10.70ms]
(pass) Authorization valid bypasses cache reads/writes and conditional responses [12.01ms]
(pass) Authorization empty bypasses cache reads/writes and conditional responses [9.92ms]
(pass) /users/me is no-store with or without credentials [6.83ms]
(pass) /users is no-store with or without credentials [7.84ms]
(pass) /auth/missing is no-store with or without credentials [5.57ms]
(pass) /events/admin is no-store with or without credentials [8.17ms]
(pass) /projects/admin is no-store with or without credentials [10.50ms]
(pass) write invalidates own domain while leaving unrelated domains warm [11.22ms]
(pass) validation and rolled-back writes do not invalidate [16.75ms]
(pass) member rename invalidates embedded project members [13.51ms]
(pass) project soft delete invalidates leaderboard and 204 member delete invalidates projects [20.09ms]
(pass) user rename invalidates events creator [11.14ms]
(pass) login success=%s invalidates events after committed login metadata changes [222.07ms]
(pass) login success=%s invalidates events after committed login metadata changes [222.06ms]
(pass) login without a committed write leaves cache warm [16.96ms]
(pass) failed-login invalidation callback runs after the real SQL COMMIT [202.48ms]
(pass) expired lockout reset commits and invalidates even when inactive login is rejected [214.54ms]
(pass) TTL expiry reruns the public handler and preserves conditional HTTP semantics [16.46ms]
(pass) HEAD bypasses shared cache and leaves warm GET entries intact [12.51ms]
(pass) non-200 public route and JSON null retain correct eligibility [8.39ms]
(pass) 404 and 422 responses are no-store and never cached [10.81ms]
(pass) RESPONSE_CACHE=false disables application storage while retaining ETag/304 [12.19ms]
(pass) health/system endpoint / is no-store [7.70ms]
(pass) health/system endpoint /health is no-store [5.99ms]
(pass) health/system endpoint /health/ready is no-store [7.80ms]
(pass) paused GET cannot repopulate stale data after a committed write with an empty cache [13.19ms]
(pass) write invalidation waits until its transaction commits [13.33ms]
(pass) cache HIT still applies query validation and rate limits [9.69ms]
(pass) v2 cached byte variants and uncached authorized compression [13.25ms]
(pass) 20 concurrent project misses execute exactly one SQL query [9.68ms]
(pass) unknown query spam shares one normalized cache key [10.17ms]
(pass) seven startup benchmark keys match HTTP keys and invalidation rewarms sponsors [16.10ms]

test/integration/db.test.ts:
(pass) session timezone is UTC [2.78ms]
(pass) statement_timeout is 10s [0.47ms]
(pass) timestamps come back as strings [0.48ms]
(pass) raw sql Date parameters preserve the exact UTC instant [3.71ms]
(pass) raw sql naive timestamp strings retain wall time and microseconds [1.81ms]
(pass) counter counts statements [0.96ms]
(pass) GET /health/ready 200 when DB up [2.66ms]
(pass) GET /health/ready 503 when DB down [1.70ms]
(pass) readiness returns 503 within two seconds when the pool is occupied [2006.33ms]
(pass) Drizzle schema preserves timestamp strings, enums and server defaults [43.00ms]
(pass) tokenFor signs claims using the testDeps secret [0.72ms]

test/integration/explain.test.ts:
(pass) benchmark capture records exact SQL and bindings and restores debug on success and failure [7.16ms]

test/integration/scripts.test.ts:
(pass) admin CLI subprocesses > create-admin creates approved admin that can log in using only first stdin line [509.73ms]
(pass) admin CLI subprocesses > create-admin normalizes mixed-case domains and rejects the normalized duplicate [558.66ms]
(pass) admin CLI subprocesses > reset-password normalizes the mixed-case domain of an API-registered user [880.77ms]
(pass) admin CLI subprocesses > set-user-access normalizes the mixed-case domain of an API-registered user [480.97ms]
(pass) admin CLI subprocesses > duplicate email exits 1 [81.19ms]
(pass) admin CLI subprocesses > rejects password-bearing flag --password [69.81ms]
(pass) admin CLI subprocesses > rejects password-bearing flag --password [56.84ms]
(pass) admin CLI subprocesses > rejects password-bearing flag --new-password [57.85ms]
(pass) admin CLI subprocesses > rejects password-bearing flag --hashed-password [59.24ms]
(pass) admin CLI subprocesses > configured minimum uses exact Turkish error [77.10ms]
(pass) admin CLI subprocesses > reset-password clears lockout and rotates password timestamp [726.15ms]
(pass) admin CLI subprocesses > reset-password unknown email exits 2 [94.00ms]
(pass) admin CLI subprocesses > reset-password validates minimum before changing credentials [289.29ms]
(pass) admin CLI subprocesses > set-user-access approves pending user [299.85ms]
(pass) admin CLI subprocesses > set-user-access maps both active values and updates role [158.21ms]
(pass) admin CLI subprocesses > set-user-access unknown email exits 2 [81.18ms]
(pass) admin CLI subprocesses > set-user-access rejects absent change flags and invalid values [219.56ms]
(pass) admin CLI subprocesses > list-users --json returns seven public UserResponses [81.25ms]
(pass) admin CLI subprocesses > list-users renders table and empty result [145.22ms]
(pass) admin CLI subprocesses > list-users includes users beyond its first service page [83.67ms]
(pass) admin CLI subprocesses > pipe passwords preserve spaces and support CRLF or EOF without newline [1358.53ms]
(pass) admin CLI subprocesses > invalid and missing email report field name [171.08ms]
(pass) admin CLI subprocesses > rejects unknown, positional and duplicate arguments without leaking values [216.99ms]
(pass) admin CLI subprocesses > password input requires a nonempty first line [131.09ms]
(pass) admin CLI subprocesses > every script refuses missing DATABASE_URL [212.57ms]
(pass) admin CLI subprocesses > database failures have clear safe stderr and exit 1 [71.25ms]
(pass) admin CLI subprocesses > TTY password input disables echo and handles match [533.61ms]
(pass) admin CLI subprocesses > TTY password input disables echo and handles mismatch [302.31ms]
(pass) admin CLI subprocesses > TTY password input disables echo and handles interrupt [303.04ms]
(pass) admin CLI subprocesses > TTY password input disables echo and handles eof [297.98ms]

test/integration/projects.test.ts:
(pass) projects database integration > list embeds members in exactly 1 CTE SQL independent of five projects and membership count [26.58ms]
(pass) projects database integration > featured, detail, slug and project members use at most 2 SQL [17.89ms]
(pass) projects database integration > create is atomic including project insert, earlier memberships and featured flags [27.19ms]
(pass) projects database integration > update is atomic including scalar fields, old memberships and featured flags [20.17ms]
(pass) projects database integration > used category deletion nulls all associated projects including hidden ones and stamps updated_at [15.99ms]
(pass) projects database integration > category delete rollback preserves project categories and timestamps if delete fails [12.74ms]
(pass) projects database integration > admin domain list also uses exactly one CTE SQL and preserves inactive projects [9.74ms]
(pass) projects database integration > admin HTTP list counts auth plus one CTE [12.64ms]
(pass) projects database integration > missing and deleted project members return null and HTTP 404 (F15) [12.98ms]
(pass) projects database integration > every required body rejects missing JSON after authentication [17.00ms]
(pass) projects database integration > PG JSON coerces NULL project booleans and json_agg member timestamps retain UTC microseconds [19.73ms]
(pass) projects database integration > body integer and boolean coercions apply to category, memberships and contributions [31.17ms]
(pass) projects database integration > null status update preserves serialization failure and rollback [13.86ms]
(pass) projects database integration > tied timestamps order by descending id; empty page preserves total [11.44ms]
(pass) maximum safe skip produces a bigint page without overflow [8.63ms]

test/integration/sql-json.test.ts:
(pass) sql-json PG13 golden parity > sqlNaiveIso(2026-05-01 11:00:00) matches pgToNaiveIso -> 2026-05-01T11:00:00 [3.49ms]
(pass) sql-json PG13 golden parity > sqlNaiveIso(2026-05-01 11:00:00.5) matches pgToNaiveIso -> 2026-05-01T11:00:00.500000 [0.95ms]
(pass) sql-json PG13 golden parity > sqlNaiveIso(2026-05-01 11:00:00.12) matches pgToNaiveIso -> 2026-05-01T11:00:00.120000 [0.88ms]
(pass) sql-json PG13 golden parity > sqlNaiveIso(2026-05-01 11:00:00.123456) matches pgToNaiveIso -> 2026-05-01T11:00:00.123456 [0.85ms]
(pass) sql-json PG13 golden parity > sqlNaiveIso(2026-05-01 11:00:00.000001) matches pgToNaiveIso -> 2026-05-01T11:00:00.000001 [0.81ms]
(pass) sql-json PG13 golden parity > sqlNaiveIso(0099-01-01 00:00:00) matches pgToNaiveIso -> 0099-01-01T00:00:00 [1.21ms]
(pass) sql-json PG13 golden parity > sqlNaiveIso maps NULL::timestamp to SQL NULL and JSON null [0.60ms]
(pass) sql-json PG13 golden parity > sqlUtcIso(2026-05-01 11:00:00+00) matches pgToUtcIso -> 2026-05-01T11:00:00Z [0.88ms]
(pass) sql-json PG13 golden parity > sqlUtcIso(2026-05-01 11:00:00.5+00) matches pgToUtcIso -> 2026-05-01T11:00:00.500000Z [0.67ms]
(pass) sql-json PG13 golden parity > sqlUtcIso(2026-05-01 11:00:00.12+00) matches pgToUtcIso -> 2026-05-01T11:00:00.120000Z [0.73ms]
(pass) sql-json PG13 golden parity > sqlUtcIso(2026-05-01 11:00:00.123456+00) matches pgToUtcIso -> 2026-05-01T11:00:00.123456Z [0.68ms]
(pass) sql-json PG13 golden parity > sqlUtcIso(2026-05-01 11:00:00.000001+00) matches pgToUtcIso -> 2026-05-01T11:00:00.000001Z [0.71ms]
(pass) sql-json PG13 golden parity > sqlUtcIso(0099-01-01 00:00:00+00) matches pgToUtcIso -> 0099-01-01T00:00:00Z [1.85ms]
(pass) sql-json PG13 golden parity > sqlUtcIso maps NULL::timestamptz to SQL NULL and JSON null [0.60ms]
(pass) sql-json PG13 golden parity > sqlUtcIso and sqlNaiveIso are independent of non-UTC session TimeZone (Europe/Istanbul +03) [2.20ms]
(pass) sql-json PG13 golden parity > sqlBoolFalse and sqlIntZero coerce NULL to false and 0::int [0.57ms]
(pass) sql-json PG13 golden parity > json_build_object round-trips Turkish UTF-8, quotes, backslashes, and newlines cleanly [1.11ms]
(pass) sql-json PG13 golden parity > helpers accept Drizzle AnyColumn references against live schema columns [1.36ms]

test/integration/uploads.test.ts:
(pass) auth runs before multipart parsing, including oversized or malformed multipart [4.86ms]
(pass) rejected upload leaves no file behind: extension, signature, size [8.89ms]
(pass) native multipart maps wrong or missing field to exact FastAPI 422 and distinguishes extra files [2.95ms]
(pass) valid uppercase upload is UUID v4, served from both paths; static missing, dotfiles and directories are 404 [2.86ms]
(pass) size exactly at configured max succeeds; max + 1 reports floored MB [2.38ms]
(pass) download-all empty dir and admin authorization [2.14ms]
(pass) ZIP contains every uploaded filename at root, UTC filename, no appended JSON or double send [10.86ms]
(pass) real ZIP stream aborts and closes on client disconnect mid-stream [16.21ms]
(pass) multipart parser failure returns 400 without writing a file [2.19ms]
(pass) upload 20/minute and download-all 3/hour limits have independent counters [26.41ms]
(pass) ZIP setup error before headers returns JSON 500, logs failure and aborts archive [2.78ms]
(pass) Bun socket preserves encoded traversal for request-head rejection [4.67ms]
(pass) Bun normalizes dot segments without exposing files outside static roots [4.36ms]
(pass) chunked multipart exceeding the streaming cap returns 413 without writing files [5.46ms]
(pass) multipart media type is case insensitive [2.03ms]

 227 pass
 0 fail
 1464 expect() calls
Ran 227 tests across 13 files. [22.30s]
```

### bun test bench

Exit 0. Contract runs supplied both CONTRACT_DB_URL_OLD/NEW to disposable databases on 5435/5436. Integration uses default TEST_DATABASE_URL on 5436.

```text
bun test v1.3.5 (1e86cebd)

bench/compare.test.ts:
(pass) passes when p95 and RPS equal the baseline [1.37ms]
(pass) fails on slower p95 even with high RPS [0.22ms]
(pass) fails on lower RPS even with low p95 [0.07ms]
(pass) fails on missing endpoint [0.05ms]
(pass) fails when successRate is below 0.999 [0.04ms]
(pass) accepts successRate of exactly 0.999 [0.04ms]
(pass) 2x target does not affect gate and respects custom multiplier [0.04ms]
(pass) every endpoint must pass [0.05ms]
(pass) empty baseline, extra endpoint, invalid numbers and invalid multiplier fail closed [0.12ms]
(pass) CLI reads benchmark envelopes and reports pass, target miss and fail exit codes [63.66ms]
(pass) CLI rejects cached and missing cache metadata, and informational mode never passes a gate [217.45ms]

bench/run.test.ts:
(pass) two-request cache probe observes [ "MISS", "MISS" ] as false [1.76ms]
(pass) two-request cache probe observes [ "MISS", "HIT" ] as true [0.98ms]
(pass) two-request cache probe observes [ "HIT", "HIT" ] as true [0.83ms]
(pass) two-request cache probe observes [ undefined, undefined ] as false [1.08ms]
(pass) cache probe rejects non-200 responses rather than asserting cache-off [1.26ms]

 16 pass
 0 fail
 76 expect() calls
Ran 16 tests across 2 files. [312.00ms]
```

### TARGET_KIND=old TARGET_URL=http://127.0.0.1:8001 bun contract/run.ts

Exit 0. Contract runs supplied both CONTRACT_DB_URL_OLD/NEW to disposable databases on 5435/5436. Integration uses default TEST_DATABASE_URL on 5436.

```text
bun test v1.3.5 (1e86cebd)

contract/system.test.ts:
(pass) system > GET / and /health [23.36ms]
(pass) system > unknown path → 404 Not Found [12.66ms]
(pass) system > POST /users → 405 [263.62ms]
(pass) system > security headers [16.29ms]
(pass) system > CORS allows macsclub.com.tr [11.80ms]

contract/auth.test.ts:
(pass) auth contract > register creates pending moderator with exact public fields [214.72ms]
(pass) auth contract > /auth/register normalizes only the email domain [217.04ms]
(pass) auth contract > /auth/register/admin normalizes only the email domain [221.01ms]
(pass) auth contract > login preserves the raw username and requires the exact stored email case [417.75ms]
(pass) auth contract > register duplicate email [16.28ms]
(pass) auth contract > register short password [12.22ms]
(pass) auth contract > register invalid email [11.55ms]
(pass) auth contract > register missing fields [10.92ms]
(pass) auth contract > register/admin wrong secret yanlis [10.17ms]
(pass) auth contract > register/admin wrong secret xxxxxxxxxxxxxxxxxxxxx [10.66ms]
(pass) auth contract > register/admin correct secret [211.31ms]
(pass) auth contract > login returns compatible claims and one-hour expiry [212.00ms]
(pass) auth contract > login eligibility admin@example.com [215.38ms]
(pass) auth contract > login eligibility unknown@example.com [17.99ms]
(pass) auth contract > login eligibility pending@example.com [216.28ms]
(pass) auth contract > login eligibility inactive@example.com [228.36ms]
(pass) auth contract > login rejects JSON as missing form fields [14.00ms]
(pass) auth contract > empty login form field username is missing [15.56ms]
(pass) auth contract > empty login form field password is missing [11.85ms]
(pass) auth contract > locked account applies deviation a [11.83ms]
(pass) auth contract > corrupt hash applies deviation b [12.14ms]
(skip) auth contract > five failures persist and lock sixth attempt
(pass) auth contract > successful login resets failed counter and stamps last_login [801.28ms]

contract/users.test.ts:
(pass) users contract > me rejects token %s [15.67ms]
(pass) users contract > me rejects token abc [12.50ms]
(pass) users contract > me eligibility rejected@example.com [12.94ms]
(pass) users contract > me eligibility inactive@example.com [10.61ms]
(pass) users contract > deleted user token is rejected [215.12ms]
(pass) users contract > access changes apply immediately to existing token [433.61ms]
(pass) users contract > put me uses query name and ignores missing or empty name [226.27ms]
(pass) users contract > password rejects invalid change {"current_password":"yanlis","new_password":"yeni123","confirm_password":"yeni123"} [428.25ms]
(pass) users contract > password rejects invalid change {"current_password":"parola123","new_password":"parola123","confirm_password":"parola123"} [601.18ms]
(pass) users contract > password confirmation mismatch is field validation [210.60ms]
(pass) users contract > short new password does not add a spurious confirmation error [211.31ms]
(pass) users contract > password change persists timestamp and changes login [1213.09ms]
(pass) users contract > list requires admin [210.91ms]
(pass) users contract > list default uses public fields and newest-first order [215.24ms]
(pass) users contract > list bounds limit=0 [211.58ms]
(pass) users contract > list bounds limit=101 [218.45ms]
(pass) users contract > list bounds skip=-1 [226.02ms]
(pass) users contract > get missing user [240.25ms]
(pass) users contract > get noninteger user [214.40ms]
(pass) users contract > access invalid enum [211.88ms]
(pass) users contract > admin cannot change own access [213.53ms]
(pass) users contract > admin cannot delete self [225.56ms]
(pass) users contract > delete user [214.00ms]
(pass) users contract > delete me [13.59ms]
(pass) users contract > delete user with events applies FK deviation e [213.21ms]
(skip) users contract > old python-jose token accepted

contract/events.test.ts:
(pass) events contract > default list orders active undeleted events and exposes exact response shape [14.38ms]
(pass) events contract > list query status=upcoming [12.85ms]
(pass) events contract > list query status=past [10.82ms]
(pass) events contract > list query search=BAHAR [11.43ms]
(pass) events contract > list query category_id=1 [14.46ms]
(pass) events contract > list query category_id=0 [14.29ms]
(pass) events contract > list query skip=1&limit=2 [10.71ms]
(pass) events contract > list query sort_by=title&sort_desc=true [14.93ms]
(pass) events contract > invalid status returns FastAPI enum error [10.25ms]
(pass) events contract > unknown sort rejected [11.19ms]
(pass) events contract > pagination validation limit=1000000 [10.82ms]
(pass) events contract > pagination validation skip=-1 [11.71ms]
(pass) events contract > every public GET ignores garbage and expired Authorization [37.74ms]
(pass) events contract > admin list requires staff and includes inactive events [15.62ms]
(pass) events contract > featured uses flagged event then nearest future event then null [27.52ms]
(pass) events contract > detail /events/by-slug/bahar-senligi [11.29ms]
(pass) events contract > detail /events/by-slug/yok [9.62ms]
(pass) events contract > detail /events/by-slug/pasif-etkinlik [9.45ms]
(pass) events contract > detail /events/3 [10.51ms]
(pass) events contract > detail /events/4 [9.62ms]
(pass) events contract > detail /events/999 [11.35ms]
(pass) events contract > create requires staff [11.10ms]
(pass) events contract > create minimal uses defaults and embedded creator [14.08ms]
(pass) events contract > create datetime 2026-05-01T10:00 [11.77ms]
(pass) events contract > create datetime 2026-05-01T10:00:00Z [11.48ms]
(pass) events contract > create datetime 2026-05-01T10:00:00+03:00 [12.43ms]
(pass) events contract > create invalid schema and malformed JSON return 400 [15.22ms]
(pass) events contract > create unknown category and duplicate title [16.88ms]
(skip) events contract > empty slug base uses distinct timestamps (P3)
(pass) events contract > create and update featured unset others [23.45ms]
(pass) events contract > partial update preserves slug, updates timestamp, regenerates title slug, clears category [33.25ms]
(pass) events contract > update supports inactive events and rejects deleted or missing category [21.41ms]
(pass) events contract > soft delete hides event and cannot be repeated [18.63ms]
(pass) events contract > hard delete requires admin and finds soft-deleted events [18.63ms]
(pass) events contract > categories CRUD preserves description on update and nulls associated events on delete [34.32ms]

contract/members.test.ts:
(pass) members contract > default list includes inactive members with exact shape and microsecond timestamps [12.75ms]
(pass) members contract > list query is_active=true [12.06ms]
(pass) members contract > list query is_active=false [13.14ms]
(pass) members contract > list query is_active=t [10.32ms]
(pass) members contract > list query is_active=n [11.01ms]
(pass) members contract > list query search=ayşe [14.15ms]
(pass) members contract > list query skip=1&limit=2 [13.78ms]
(pass) members contract > list query search=missing [13.19ms]
(pass) members contract > invalid query limit=201 [11.40ms]
(pass) members contract > invalid query skip=-1 [11.67ms]
(pass) members contract > invalid query is_active=garbage [11.33ms]
(pass) members contract > leaderboard counts only active undeleted projects and includes projectless active member [18.95ms]
(pass) members contract > member stats count all memberships including deleted and inactive projects [18.15ms]
(pass) members contract > member projects return ordered memberships and exact shape [16.19ms]
(pass) members contract > every public GET ignores garbage Authorization [20.81ms]
(pass) members contract > missing member /members/999 [10.60ms]
(pass) members contract > missing member /members/999/stats [11.14ms]
(pass) members contract > missing member /members/999/projects [11.90ms]
(pass) members contract > invalid member ID reports path location [12.65ms]
(pass) members contract > create uses active default, allows inactive names and rejects duplicate active names [19.51ms]
(pass) members contract > partial update preserves omissions and allows explicit null profile_image [20.01ms]
(pass) members contract > delete is hard, empty and cannot be repeated [19.11ms]
(pass) members contract > mutations require approved staff [20.00ms]
(pass) members contract > body validation reports missing and wrong string/boolean types [15.03ms]

contract/sponsors.test.ts:
(pass) sponsors contract > default list filters active sponsors and returns exact shape with null updated_at [14.05ms]
(pass) sponsors contract > list query is_active=false [13.46ms]
(pass) sponsors contract > list query is_active=f [11.24ms]
(pass) sponsors contract > list query is_active=y [11.35ms]
(pass) sponsors contract > list query category=Kafe [12.27ms]
(pass) sponsors contract > list query category=kafe [13.24ms]
(pass) sponsors contract > list query skip=1&limit=2 [10.10ms]
(pass) sponsors contract > list query category= [11.06ms]
(pass) sponsors contract > categories include inactive categories and omit empty values in sorted order [10.84ms]
(pass) sponsors contract > public list, categories and detail ignore garbage Authorization [13.74ms]
(pass) sponsors contract > missing and non-integer sponsor IDs [11.74ms]
(pass) sponsors contract > invalid query limit=201 [10.17ms]
(pass) sponsors contract > invalid query skip=-1 [9.16ms]
(pass) sponsors contract > invalid query is_active=x [9.20ms]
(pass) sponsors contract > create validation {"name":"A","category":"Kafe"} [10.99ms]
(pass) sponsors contract > create validation {"name":"AB","category":"A"} [11.00ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","latitude":91} [11.37ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","longitude":-181} [10.72ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","image_url":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"} [12.36ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","discount_info":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"} [11.89ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","is_featured":"1.0"} [14.72ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","latitude":"0x1"} [13.61ms]
(pass) sponsors contract > create minimal sponsor uses defaults and null optional fields [16.37ms]
(pass) sponsors contract > create and update coerce numeric strings and lax boolean aliases [19.48ms]
(pass) sponsors contract > update preserves omissions and clears nullable fields [24.29ms]
(pass) sponsors contract > long discount_info on update applies deviation l (old 500 after commit, new 422 without write) [24.69ms]
(pass) sponsors contract > explicit null is_active on update applies deviation l (old 500 after commit, new 422 without write) [23.90ms]
(pass) sponsors contract > explicit null is_featured on update applies deviation l (old 500 after commit, new 422 without write) [22.34ms]
(pass) sponsors contract > delete returns empty 204 and repeat or update missing returns exact 404 [14.25ms]
(pass) sponsors contract > all writes and geocode require approved staff [18.33ms]
(pass) sponsors contract > geocode validates short address before contacting upstream [11.89ms]

contract/projects.test.ts:
(pass) projects contract > default list has exact shape, embedded members and category [17.45ms]
(pass) projects contract > list filter skip=2&limit=2 [14.29ms]
(pass) projects contract > list filter status=COMPLETED [14.70ms]
(pass) projects contract > list filter search=mobil [14.04ms]
(pass) projects contract > list filter category_id=1 [15.22ms]
(pass) projects contract > list filter category_id=0 [13.15ms]
(pass) projects contract > list filter status= [13.25ms]
(pass) projects contract > invalid status is explicit deviation f on public and admin lists [19.17ms]
(pass) projects contract > list validation limit=101 [10.58ms]
(pass) projects contract > list validation limit=0 [9.29ms]
(pass) projects contract > list validation skip=-1 [9.46ms]
(pass) projects contract > list validation category_id=no [11.00ms]
(pass) projects contract > admin pagination includes inactive projects and requires staff [19.07ms]
(pass) projects contract > public GETs ignore garbage Authorization [31.67ms]
(pass) projects contract > featured embeds members, falls back to newest and returns exact 404 [32.06ms]
(pass) projects contract > hidden or missing detail /projects/3 [15.71ms]
(pass) projects contract > hidden or missing detail /projects/4 [12.19ms]
(pass) projects contract > hidden or missing detail /projects/999 [12.51ms]
(pass) projects contract > hidden or missing detail /projects/by-slug/yok [11.38ms]
(pass) projects contract > hidden or missing detail /projects/by-slug/pasif-proje [13.51ms]
(pass) projects contract > slug detail embeds members [12.59ms]
(pass) projects contract > writes require approved staff [40.13ms]
(pass) projects contract > minimal create uses defaults and empty members [17.82ms]
(pass) projects contract > create members returns empty, reads embed roles, duplicates are retained [21.98ms]
(pass) projects contract > unknown member create rolls back project on new target (P6) [16.78ms]
(pass) projects contract > category lookup uses create 404 and update 400 [15.36ms]
(pass) projects contract > create validates status [11.72ms]
(pass) projects contract > create validates project_type [11.27ms]
(pass) projects contract > create validates category_id [10.82ms]
(pass) projects contract > create validates is_active [10.78ms]
(pass) projects contract > create validates started_at [10.49ms]
(pass) projects contract > duplicate slug timestamp and featured uniqueness [16.06ms]
(pass) projects contract > update keeps identical slug, handles naive dates and all content fields [13.08ms]
(pass) projects contract > update replaces and clears memberships and allows inactive projects [24.21ms]
(pass) projects contract > update changes title and featured, clears category and handles missing project [19.00ms]
(pass) projects contract > soft delete and admin-only hard delete cascade member projects [25.13ms]
(pass) projects contract > project members shape, inactive project allowed, deleted project hidden [15.29ms]
(pass) projects contract > add member exact response, duplicate and missing member errors [21.41ms]
(pass) projects contract > update member preserves omitted/null fields, changes role and contribution [18.25ms]
(pass) projects contract > remove member and missing relation error [12.72ms]
(pass) projects contract > member HTTP deletion cascades to project members (F06) [15.11ms]
(pass) projects contract > categories CRUD, duplicate name and used category deletion parity (F07) [33.20ms]

contract/uploads.test.ts:
(pass) uploads contract > upload requires authentication [10.60ms]
(pass) uploads contract > reject extension script.sh [11.46ms]
(pass) uploads contract > reject extension dosya [11.89ms]
(pass) uploads contract > reject invalid image sahte.png Uint8Array(15) [ 77, 90, 194, 144, 0, 32, 110, 111, 116, 32, 97, 32, 112, 110, 103 ] [10.69ms]
(pass) uploads contract > reject invalid image x.webp Uint8Array(12) [ 82, 73, 70, 70, 49, 50, 51, 52, 87, 65, 86, 69 ] [15.23ms]
(pass) uploads contract > reject invalid image x.webp Uint8Array(11) [ 82, 73, 70, 70, 49, 50, 51, 52, 87, 69, 66 ] [11.07ms]
(pass) uploads contract > reject invalid image x.png Uint8Array(3) [ 137, 80, 78 ] [10.32ms]
(pass) uploads contract > accept FOTO.PNG with UUID v4 and serve bytes through both mounts [15.19ms]
(pass) uploads contract > accept gecerli.png with UUID v4 and serve bytes through both mounts [16.11ms]
(pass) uploads contract > oversized image gets exact 413 [62.03ms]
(pass) uploads contract > wrong multipart field gets exact missing-file validation [15.23ms]
(pass) uploads contract > missing static files return JSON 404 [11.64ms]
(pass) uploads contract > download-all requires admin [10.48ms]
(pass) uploads contract > download-all is complete ZIP with uploaded filenames at root [17.64ms]

contract/legacy-pytest-port.test.ts:
(pass) auth > test_register_creates_pending_account_without_privileges [423.87ms]
(pass) auth > test_pending_account_cannot_log_in [411.21ms]
(pass) users > test_approved_user_can_read_own_profile [213.59ms]
(pass) users > test_rejected_user_is_denied [10.96ms]
(pass) users > test_inactive_user_is_denied [9.85ms]
(pass) users > test_missing_token_is_denied [8.96ms]
(pass) users > test_moderator_cannot_list_users [214.63ms]
(pass) users > test_admin_can_approve_pending_account [639.04ms]
(pass) users > test_admin_cannot_change_own_access [216.30ms]
(pass) events > test_self_registered_account_cannot_create_events [216.06ms]
(pass) events > test_moderator_can_create_event [218.46ms]
(pass) events > test_moderator_cannot_hard_delete_event [417.45ms]
(pass) events > test_admin_can_hard_delete_event [218.47ms]
(pass) events > test_anonymous_cannot_create_event [10.17ms]
(pass) events > test_unknown_sort_field_is_rejected [10.42ms]
(pass) events > test_allowed_sort_field_works [12.46ms]
(pass) events > test_limit_above_cap_is_rejected[/events] [10.89ms]
(pass) events > test_negative_skip_is_rejected [10.29ms]
(pass) sponsors > test_limit_above_cap_is_rejected[/sponsors/] [10.52ms]
(pass) uploads > test_upload_requires_authentication [10.45ms]
(pass) uploads > test_upload_rejects_non_image_extension [211.20ms]
(pass) uploads > test_upload_rejects_content_that_is_not_really_an_image [213.13ms]
(pass) uploads > test_upload_rejects_oversized_file [681.09ms]
(pass) uploads > test_upload_accepts_valid_png [627.12ms]
(pass) uploads > test_rejected_upload_leaves_no_file_behind [625.47ms]
(pass) projects > used_project_category_delete_is_204_parity [221.12ms]

3 tests skipped:
(skip) auth contract > five failures persist and lock sixth attempt
(skip) users contract > old python-jose token accepted
(skip) events contract > empty slug base uses distinct timestamps (P3)

 223 pass
 3 skip
 0 fail
 810 expect() calls
Ran 226 tests across 9 files. [17.84s]
```

### TARGET_KIND=new TARGET_URL=http://127.0.0.1:8011 bun contract/run.ts

Exit 0. Contract runs supplied both CONTRACT_DB_URL_OLD/NEW to disposable databases on 5435/5436. Integration uses default TEST_DATABASE_URL on 5436.

```text
bun test v1.3.5 (1e86cebd)

contract/system.test.ts:
(pass) system > GET / and /health [20.75ms]
(pass) system > unknown path → 404 Not Found [11.50ms]
(pass) system > POST /users → 405 [232.39ms]
(pass) system > security headers [11.28ms]
(pass) system > CORS allows macsclub.com.tr [11.45ms]

contract/auth.test.ts:
(pass) auth contract > register creates pending moderator with exact public fields [224.87ms]
(pass) auth contract > /auth/register normalizes only the email domain [224.10ms]
(pass) auth contract > /auth/register/admin normalizes only the email domain [218.21ms]
(pass) auth contract > login preserves the raw username and requires the exact stored email case [422.67ms]
(pass) auth contract > register duplicate email [12.90ms]
(pass) auth contract > register short password [15.85ms]
(pass) auth contract > register invalid email [12.70ms]
(pass) auth contract > register missing fields [13.45ms]
(pass) auth contract > register/admin wrong secret yanlis [14.62ms]
(pass) auth contract > register/admin wrong secret xxxxxxxxxxxxxxxxxxxxx [12.02ms]
(pass) auth contract > register/admin correct secret [212.14ms]
(pass) auth contract > login returns compatible claims and one-hour expiry [212.21ms]
(pass) auth contract > login eligibility admin@example.com [212.22ms]
(pass) auth contract > login eligibility unknown@example.com [13.84ms]
(pass) auth contract > login eligibility pending@example.com [216.74ms]
(pass) auth contract > login eligibility inactive@example.com [216.34ms]
(pass) auth contract > login rejects JSON as missing form fields [13.19ms]
(pass) auth contract > empty login form field username is missing [13.80ms]
(pass) auth contract > empty login form field password is missing [12.56ms]
(pass) auth contract > locked account applies deviation a [15.21ms]
(pass) auth contract > corrupt hash applies deviation b [16.34ms]
(pass) auth contract > five failures persist and lock sixth attempt [1237.15ms]
(pass) auth contract > successful login resets failed counter and stamps last_login [828.89ms]

contract/users.test.ts:
(pass) users contract > me rejects token %s [12.70ms]
(pass) users contract > me rejects token abc [10.48ms]
(pass) users contract > me eligibility rejected@example.com [15.51ms]
(pass) users contract > me eligibility inactive@example.com [12.73ms]
(pass) users contract > deleted user token is rejected [215.51ms]
(pass) users contract > access changes apply immediately to existing token [418.53ms]
(pass) users contract > put me uses query name and ignores missing or empty name [221.37ms]
(pass) users contract > password rejects invalid change {"current_password":"yanlis","new_password":"yeni123","confirm_password":"yeni123"} [413.31ms]
(pass) users contract > password rejects invalid change {"current_password":"parola123","new_password":"parola123","confirm_password":"parola123"} [632.58ms]
(pass) users contract > password confirmation mismatch is field validation [223.75ms]
(pass) users contract > short new password does not add a spurious confirmation error [216.66ms]
(pass) users contract > password change persists timestamp and changes login [1214.41ms]
(pass) users contract > list requires admin [219.48ms]
(pass) users contract > list default uses public fields and newest-first order [222.75ms]
(pass) users contract > list bounds limit=0 [220.45ms]
(pass) users contract > list bounds limit=101 [221.08ms]
(pass) users contract > list bounds skip=-1 [216.59ms]
(pass) users contract > get missing user [214.27ms]
(pass) users contract > get noninteger user [216.69ms]
(pass) users contract > access invalid enum [211.22ms]
(pass) users contract > admin cannot change own access [218.84ms]
(pass) users contract > admin cannot delete self [228.73ms]
(pass) users contract > delete user [223.03ms]
(pass) users contract > delete me [17.54ms]
(pass) users contract > delete user with events applies FK deviation e [228.65ms]
(pass) users contract > old python-jose token accepted [13.63ms]

contract/events.test.ts:
(pass) events contract > default list orders active undeleted events and exposes exact response shape [14.55ms]
(pass) events contract > list query status=upcoming [14.51ms]
(pass) events contract > list query status=past [11.74ms]
(pass) events contract > list query search=BAHAR [11.91ms]
(pass) events contract > list query category_id=1 [14.32ms]
(pass) events contract > list query category_id=0 [13.34ms]
(pass) events contract > list query skip=1&limit=2 [12.71ms]
(pass) events contract > list query sort_by=title&sort_desc=true [12.32ms]
(pass) events contract > invalid status returns FastAPI enum error [10.58ms]
(pass) events contract > unknown sort rejected [8.97ms]
(pass) events contract > pagination validation limit=1000000 [10.64ms]
(pass) events contract > pagination validation skip=-1 [9.11ms]
(pass) events contract > every public GET ignores garbage and expired Authorization [26.30ms]
(pass) events contract > admin list requires staff and includes inactive events [16.61ms]
(pass) events contract > featured uses flagged event then nearest future event then null [27.57ms]
(pass) events contract > detail /events/by-slug/bahar-senligi [12.47ms]
(pass) events contract > detail /events/by-slug/yok [12.81ms]
(pass) events contract > detail /events/by-slug/pasif-etkinlik [12.80ms]
(pass) events contract > detail /events/3 [10.62ms]
(pass) events contract > detail /events/4 [10.30ms]
(pass) events contract > detail /events/999 [11.86ms]
(pass) events contract > create requires staff [11.65ms]
(pass) events contract > create minimal uses defaults and embedded creator [16.31ms]
(pass) events contract > create datetime 2026-05-01T10:00 [14.09ms]
(pass) events contract > create datetime 2026-05-01T10:00:00Z [15.54ms]
(pass) events contract > create datetime 2026-05-01T10:00:00+03:00 [14.06ms]
(pass) events contract > create invalid schema and malformed JSON return 400 [19.13ms]
(pass) events contract > create unknown category and duplicate title [19.62ms]
(pass) events contract > empty slug base uses distinct timestamps (P3) [1135.83ms]
(pass) events contract > create and update featured unset others [48.45ms]
(pass) events contract > partial update preserves slug, updates timestamp, regenerates title slug, clears category [41.67ms]
(pass) events contract > update supports inactive events and rejects deleted or missing category [30.04ms]
(pass) events contract > soft delete hides event and cannot be repeated [17.23ms]
(pass) events contract > hard delete requires admin and finds soft-deleted events [17.72ms]
(pass) events contract > categories CRUD preserves description on update and nulls associated events on delete [30.36ms]

contract/members.test.ts:
(pass) members contract > default list includes inactive members with exact shape and microsecond timestamps [11.17ms]
(pass) members contract > list query is_active=true [14.74ms]
(pass) members contract > list query is_active=false [12.47ms]
(pass) members contract > list query is_active=t [12.25ms]
(pass) members contract > list query is_active=n [16.79ms]
(pass) members contract > list query search=ayşe [13.84ms]
(pass) members contract > list query skip=1&limit=2 [16.35ms]
(pass) members contract > list query search=missing [12.12ms]
(pass) members contract > invalid query limit=201 [12.10ms]
(pass) members contract > invalid query skip=-1 [11.33ms]
(pass) members contract > invalid query is_active=garbage [9.70ms]
(pass) members contract > leaderboard counts only active undeleted projects and includes projectless active member [15.94ms]
(pass) members contract > member stats count all memberships including deleted and inactive projects [13.33ms]
(pass) members contract > member projects return ordered memberships and exact shape [11.98ms]
(pass) members contract > every public GET ignores garbage Authorization [15.21ms]
(pass) members contract > missing member /members/999 [16.36ms]
(pass) members contract > missing member /members/999/stats [13.57ms]
(pass) members contract > missing member /members/999/projects [12.42ms]
(pass) members contract > invalid member ID reports path location [13.57ms]
(pass) members contract > create uses active default, allows inactive names and rejects duplicate active names [18.96ms]
(pass) members contract > partial update preserves omissions and allows explicit null profile_image [20.14ms]
(pass) members contract > delete is hard, empty and cannot be repeated [18.77ms]
(pass) members contract > mutations require approved staff [23.20ms]
(pass) members contract > body validation reports missing and wrong string/boolean types [18.41ms]

contract/sponsors.test.ts:
(pass) sponsors contract > default list filters active sponsors and returns exact shape with null updated_at [12.27ms]
(pass) sponsors contract > list query is_active=false [12.16ms]
(pass) sponsors contract > list query is_active=f [11.00ms]
(pass) sponsors contract > list query is_active=y [12.26ms]
(pass) sponsors contract > list query category=Kafe [12.21ms]
(pass) sponsors contract > list query category=kafe [11.98ms]
(pass) sponsors contract > list query skip=1&limit=2 [11.29ms]
(pass) sponsors contract > list query category= [11.40ms]
(pass) sponsors contract > categories include inactive categories and omit empty values in sorted order [11.27ms]
(pass) sponsors contract > public list, categories and detail ignore garbage Authorization [13.88ms]
(pass) sponsors contract > missing and non-integer sponsor IDs [11.83ms]
(pass) sponsors contract > invalid query limit=201 [12.66ms]
(pass) sponsors contract > invalid query skip=-1 [16.32ms]
(pass) sponsors contract > invalid query is_active=x [11.28ms]
(pass) sponsors contract > create validation {"name":"A","category":"Kafe"} [12.68ms]
(pass) sponsors contract > create validation {"name":"AB","category":"A"} [12.99ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","latitude":91} [10.72ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","longitude":-181} [11.98ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","image_url":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"} [12.94ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","discount_info":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"} [13.93ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","is_featured":"1.0"} [11.21ms]
(pass) sponsors contract > create validation {"name":"AB","category":"Kafe","latitude":"0x1"} [12.72ms]
(pass) sponsors contract > create minimal sponsor uses defaults and null optional fields [13.68ms]
(pass) sponsors contract > create and update coerce numeric strings and lax boolean aliases [16.72ms]
(pass) sponsors contract > update preserves omissions and clears nullable fields [19.57ms]
(pass) sponsors contract > long discount_info on update applies deviation l (old 500 after commit, new 422 without write) [15.14ms]
(pass) sponsors contract > explicit null is_active on update applies deviation l (old 500 after commit, new 422 without write) [15.32ms]
(pass) sponsors contract > explicit null is_featured on update applies deviation l (old 500 after commit, new 422 without write) [16.13ms]
(pass) sponsors contract > delete returns empty 204 and repeat or update missing returns exact 404 [16.52ms]
(pass) sponsors contract > all writes and geocode require approved staff [18.84ms]
(pass) sponsors contract > geocode validates short address before contacting upstream [12.61ms]

contract/projects.test.ts:
(pass) projects contract > default list has exact shape, embedded members and category [18.22ms]
(pass) projects contract > list filter skip=2&limit=2 [13.76ms]
(pass) projects contract > list filter status=COMPLETED [16.35ms]
(pass) projects contract > list filter search=mobil [11.73ms]
(pass) projects contract > list filter category_id=1 [13.50ms]
(pass) projects contract > list filter category_id=0 [12.12ms]
(pass) projects contract > list filter status= [11.32ms]
(pass) projects contract > invalid status is explicit deviation f on public and admin lists [13.16ms]
(pass) projects contract > list validation limit=101 [11.27ms]
(pass) projects contract > list validation limit=0 [13.42ms]
(pass) projects contract > list validation skip=-1 [9.90ms]
(pass) projects contract > list validation category_id=no [9.61ms]
(pass) projects contract > admin pagination includes inactive projects and requires staff [16.19ms]
(pass) projects contract > public GETs ignore garbage Authorization [21.08ms]
(pass) projects contract > featured embeds members, falls back to newest and returns exact 404 [24.43ms]
(pass) projects contract > hidden or missing detail /projects/3 [12.53ms]
(pass) projects contract > hidden or missing detail /projects/4 [11.10ms]
(pass) projects contract > hidden or missing detail /projects/999 [14.27ms]
(pass) projects contract > hidden or missing detail /projects/by-slug/yok [10.22ms]
(pass) projects contract > hidden or missing detail /projects/by-slug/pasif-proje [11.25ms]
(pass) projects contract > slug detail embeds members [12.29ms]
(pass) projects contract > writes require approved staff [26.94ms]
(pass) projects contract > minimal create uses defaults and empty members [14.33ms]
(pass) projects contract > create members returns empty, reads embed roles, duplicates are retained [19.54ms]
(pass) projects contract > unknown member create rolls back project on new target (P6) [16.39ms]
(pass) projects contract > category lookup uses create 404 and update 400 [15.50ms]
(pass) projects contract > create validates status [12.08ms]
(pass) projects contract > create validates project_type [9.94ms]
(pass) projects contract > create validates category_id [11.75ms]
(pass) projects contract > create validates is_active [12.27ms]
(pass) projects contract > create validates started_at [10.79ms]
(pass) projects contract > duplicate slug timestamp and featured uniqueness [14.15ms]
(pass) projects contract > update keeps identical slug, handles naive dates and all content fields [12.30ms]
(pass) projects contract > update replaces and clears memberships and allows inactive projects [20.79ms]
(pass) projects contract > update changes title and featured, clears category and handles missing project [16.18ms]
(pass) projects contract > soft delete and admin-only hard delete cascade member projects [20.78ms]
(pass) projects contract > project members shape, inactive project allowed, deleted project hidden [12.08ms]
(pass) projects contract > add member exact response, duplicate and missing member errors [20.80ms]
(pass) projects contract > update member preserves omitted/null fields, changes role and contribution [15.23ms]
(pass) projects contract > remove member and missing relation error [14.50ms]
(pass) projects contract > member HTTP deletion cascades to project members (F06) [15.70ms]
(pass) projects contract > categories CRUD, duplicate name and used category deletion parity (F07) [31.84ms]

contract/uploads.test.ts:
(pass) uploads contract > upload requires authentication [11.17ms]
(pass) uploads contract > reject extension script.sh [16.64ms]
(pass) uploads contract > reject extension dosya [12.21ms]
(pass) uploads contract > reject invalid image sahte.png Uint8Array(15) [ 77, 90, 194, 144, 0, 32, 110, 111, 116, 32, 97, 32, 112, 110, 103 ] [10.29ms]
(pass) uploads contract > reject invalid image x.webp Uint8Array(12) [ 82, 73, 70, 70, 49, 50, 51, 52, 87, 65, 86, 69 ] [9.51ms]
(pass) uploads contract > reject invalid image x.webp Uint8Array(11) [ 82, 73, 70, 70, 49, 50, 51, 52, 87, 69, 66 ] [10.83ms]
(pass) uploads contract > reject invalid image x.png Uint8Array(3) [ 137, 80, 78 ] [10.72ms]
(pass) uploads contract > accept FOTO.PNG with UUID v4 and serve bytes through both mounts [12.94ms]
(pass) uploads contract > accept gecerli.png with UUID v4 and serve bytes through both mounts [12.81ms]
(pass) uploads contract > oversized image gets exact 413 [51.81ms]
(pass) uploads contract > wrong multipart field gets exact missing-file validation [14.01ms]
(pass) uploads contract > missing static files return JSON 404 [10.28ms]
(pass) uploads contract > download-all requires admin [15.27ms]
(pass) uploads contract > download-all is complete ZIP with uploaded filenames at root [33.34ms]

contract/legacy-pytest-port.test.ts:
(pass) auth > test_register_creates_pending_account_without_privileges [425.45ms]
(pass) auth > test_pending_account_cannot_log_in [424.18ms]
(pass) users > test_approved_user_can_read_own_profile [219.96ms]
(pass) users > test_rejected_user_is_denied [13.56ms]
(pass) users > test_inactive_user_is_denied [11.93ms]
(pass) users > test_missing_token_is_denied [12.23ms]
(pass) users > test_moderator_cannot_list_users [215.26ms]
(pass) users > test_admin_can_approve_pending_account [626.18ms]
(pass) users > test_admin_cannot_change_own_access [245.00ms]
(pass) events > test_self_registered_account_cannot_create_events [231.20ms]
(pass) events > test_moderator_can_create_event [218.67ms]
(pass) events > test_moderator_cannot_hard_delete_event [432.02ms]
(pass) events > test_admin_can_hard_delete_event [228.18ms]
(pass) events > test_anonymous_cannot_create_event [12.13ms]
(pass) events > test_unknown_sort_field_is_rejected [9.55ms]
(pass) events > test_allowed_sort_field_works [10.90ms]
(pass) events > test_limit_above_cap_is_rejected[/events] [10.95ms]
(pass) events > test_negative_skip_is_rejected [10.51ms]
(pass) sponsors > test_limit_above_cap_is_rejected[/sponsors/] [10.37ms]
(pass) uploads > test_upload_requires_authentication [9.82ms]
(pass) uploads > test_upload_rejects_non_image_extension [217.04ms]
(pass) uploads > test_upload_rejects_content_that_is_not_really_an_image [216.09ms]
(pass) uploads > test_upload_rejects_oversized_file [690.19ms]
(pass) uploads > test_upload_accepts_valid_png [648.15ms]
(pass) uploads > test_rejected_upload_leaves_no_file_behind [645.46ms]
(pass) projects > used_project_category_delete_is_204_parity [232.68ms]

 226 pass
 0 fail
 838 expect() calls
Ran 226 tests across 9 files. [20.41s]
```

### OLD_URL=http://127.0.0.1:8001 NEW_URL=http://127.0.0.1:8011 bun contract/differential.ts

Exit 0. Contract runs supplied both CONTRACT_DB_URL_OLD/NEW to disposable databases on 5435/5436. Integration uses default TEST_DATABASE_URL on 5436.

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

## Benchmark gate — final

All 28 endpoint measurements successRate=1.0. Express and v2 each completed both cache modes and all four processes exited 0 after SIGTERM. bench/compare.ts unchanged. Uncached exit 0. Cached --informational exit 1 by design (it cannot satisfy the uncached gate and also applies an extra RPS check); the binding cached p95-only decision is separately saved in gates.json by evaluate.py. No thresholds/settings/assertions adjusted and no selected reruns.

### bun bench/compare.ts --baseline bench/result-task13b-express-uncached.json --candidate bench/result-task13b-v2-uncached.json

```text
Endpoint	p95 old (ms)	p95 new (ms)	RPS old	RPS new	gate
/events?limit=100	18.904	4.128	3089.17	15837.16	PASS
/events/featured	30.118	2.736	1980.33	24384.53	PASS
/projects?limit=100	41.729	5.572	1482.38	11763.98	PASS
/projects/featured	18.553	2.768	3561.96	23375.20	PASS
/members/leaderboard	18.949	3.482	3666.19	19684.78	PASS
/members	14.190	3.215	5519.49	21574.58	PASS
/sponsors/	22.404	3.660	3006.23	18565.43	PASS
GATE PASS (7/7)

```

### bun bench/compare.ts --baseline bench/result-task13b-express-cached.json --candidate bench/result-task13b-v2-cached.json --informational

```text
Endpoint	p95 old (ms)	p95 new (ms)	RPS old	RPS new	gate
/events?limit=100	2.511	2.405	27377.56	30562.39	PASS
TARGET MISS: /events?limit=100 x1.12
/events/featured	2.218	2.215	33643.64	36455.42	PASS
TARGET MISS: /events/featured x1.08
/projects?limit=100	3.265	2.418	19659.87	30085.30	PASS
TARGET MISS: /projects?limit=100 x1.53
/projects/featured	2.273	2.162	31676.62	36185.91	PASS
TARGET MISS: /projects/featured x1.14
/members/leaderboard	2.304	2.339	31983.33	32800.90	FAIL
TARGET MISS: /members/leaderboard x1.03
/members	2.266	2.323	31989.85	32542.18	FAIL
TARGET MISS: /members x1.02
/sponsors/	2.522	2.407	28644.75	31848.87	PASS
TARGET MISS: /sponsors/ x1.11
INFORMATIONAL ONLY: comparison cannot satisfy the cache-off gate

```

### Cache ON: same-session gate and historical before/after

| Endpoint | Express p95 ms / RPS | Task 13 v2 p95 ms / RPS | Optimized v2 p95 ms / RPS | Gap ms (%) | Gate |
|---|---:|---:|---:|---:|---|
| /events?limit=100 | 2.511 / 27378 | 2.657 / 26347 | 2.405 / 30562 | -0.107 (-4.25%) | PASS |
| /events/featured | 2.218 / 33644 | 2.597 / 30202 | 2.215 / 36455 | -0.003 (-0.14%) | PASS |
| /projects?limit=100 | 3.265 / 19660 | 2.765 / 25981 | 2.418 / 30085 | -0.847 (-25.93%) | PASS |
| /projects/featured | 2.273 / 31677 | 2.525 / 29899 | 2.162 / 36186 | -0.111 (-4.88%) | PASS |
| /members/leaderboard | 2.304 / 31983 | 2.642 / 27896 | 2.339 / 32801 | +0.036 (+1.54%) | FAIL |
| /members | 2.266 / 31990 | 2.666 / 27596 | 2.323 / 32542 | +0.057 (+2.52%) | FAIL |
| /sponsors/ | 2.522 / 28645 | 2.754 / 27008 | 2.407 / 31849 | -0.115 (-4.55%) | PASS |

Task 13 values are historical context, not a controlled before/after experiment; host load and the Express reference changed. Same-session gaps are the binding decision. Featured events passes by only 0.003 ms, so no robust margin is claimed. Remaining members gaps are 0.035 ms (1.54%) and 0.057 ms (2.52%). Retained routing/Response/middleware/timer overhead remains; isolated measurements cannot assign the residual end-to-end gap to one function.

### CPU load snapshots

- express-uncached: server CPU 0.5–164.3%; host 1-min load 2.76–7.54.
- express-cached: server CPU 0.6–106.9%; host 1-min load 4.46–6.65.
- v2-uncached: server CPU 0.5–86.5%; host 1-min load 4.34–6.50.
- v2-cached: server CPU 0.8–106.2%; host 1-min load 3.82–5.63.

## Under-load CPU profile attempt and limitation

After all four gate runs (no overlap), profile-server.py started the optimized production server using bun --cpu-prof --cpu-prof-name=members.cpuprofile --cpu-prof-dir=<evidence>, warmed /members for 5s and loaded it with oha c=50 for 20s. Server exited 0 but Bun printed exactly:

```text
WriteFailed: Failed to write CPU profile
```

No usable .cpuprofile was produced; no sampled-stack attribution is claimed. cpu-profile-oha.json retains that separate profiled load run, NOT a replacement gate measurement. A separate minimal Bun profiler probe also failed to finish within observation and was terminated; no probe remains running. The required evidence is provided through the task's permitted microbenchmark alternative (all requested components covered), with the limitations stated above. Bun profiler failure is a concern.

## Final static verification (after measurement, same product code)

Verification Before Completion skill used to check fresh exits and outputs before commits.

### bunx tsc --noEmit

Exit 0.

```text
(no output)
```

### bunx eslint .

Exit 0.

```text
(no output)
```

### bun test src

Exit 0.

```text
bun test v1.3.5 (1e86cebd)

src/app.test.ts:
(pass) GET / returns welcome [1.82ms]
(pass) GET /health [0.13ms]
(pass) system responses omit framework and automatic cache headers [0.10ms]
(pass) Hono fetch shell ignores forwarded spoofing [0.14ms]
(pass) global and write limiters use real IP and run before route parsing [5.05ms]
(pass) handler timeout returns JSON 503 with CORS and security headers [7.66ms]
(pass) production docs are disabled by default, and an explicit override enables them [11.08ms]
(pass) normalizing Content-Type preserves caller Request headers [0.95ms]
(pass) HEAD on a missing docs asset remains 404 rather than 405, and notFound precompiles route regexes once [1.29ms]
(pass) static and uploads mounts enforce resolved-prefix containment [0.12ms]
(pass) OpenAPI 3.1 info matches FastAPI [0.30ms]
(pass) all 63 operations document tags and responses [0.67ms]
(pass) seven described tags and OAuth2 password security [0.10ms]
(pass) form, JSON, multipart binary and ZIP metadata [0.30ms]
(pass) parameters and shared validation response [0.29ms]
(pass) two apps have independent registries and documents [22.52ms]
(pass) public local Swagger assets and docs bypass cache; redoc 404 [8.40ms]
(pass) exact /docs redirects to /docs/ and preserves the raw query string [0.33ms]
(pass) every relative Swagger HTML asset resolves successfully from /docs/ [4.17ms]
(pass) HEAD ZIP authenticates and lists but never resolves or opens file paths [5.13ms]

src/middleware/cors.test.ts:
(pass) CORS retains Vary, allowlist and credentials on cached and other responses [0.93ms]

src/middleware/http.test.ts:
(pass) missing/non-Bearer Authorization: %s [2.20ms]
(pass) missing/non-Bearer Authorization: Basic secret [1.14ms]
(pass) missing/non-Bearer Authorization: bearer secret [0.93ms]
(pass) valid token loads the current user [1.32ms]
(pass) current user authorization: Kimlik doğrulanamadı [1.53ms]
(pass) current user authorization: Hesap aktif değil [1.45ms]
(pass) current user authorization: Hesabınız henüz onaylanmadı [1.15ms]
(pass) token errors preserve all four messages and Bearer challenge [5.83ms]
(pass) rate limit: 4th request is 429, counters are per-route and per-IP [1.47ms]
(pass) RATELIMIT_ENABLED=false allows 20 requests [1.96ms]
(pass) unknown path is JSON 404; known path unsupported method is 405 with Allow [1.74ms]
(pass) body >2 MB is 413 for JSON and form [5.17ms]
(pass) malformed JSON is FastAPI 422 [1.70ms]
(pass) PG 23505 maps to 409 [1.05ms]
(pass) PG 23503 maps to 409 [0.47ms]
(pass) PG 57014 maps to 503 [0.99ms]
(pass) Drizzle-wrapped PG 23505 maps to 409 [0.92ms]
(pass) Drizzle-wrapped PG 23503 maps to 409 [1.08ms]
(pass) Drizzle-wrapped PG 57014 maps to 503 [1.01ms]
(pass) plain and nested causes preserve PostgreSQL error mapping [1.56ms]
(pass) non-object, cyclic and excessive cause chains fall back to 500 [4.34ms]
(pass) unexpected error includes CORS headers and logs a stack [1.16ms]
(pass) HttpError headers are emitted with a single detail envelope [0.86ms]
(pass) every response carries security headers and validated request ID [3.23ms]
(pass) request completion logs exactly one line with correlation fields [1.26ms]
(pass) CORS allows configured origins, rejects others, preflight is 200 [0.59ms]
(pass) forwarded-for spoofing shares the default socket IP bucket [1.15ms]
(pass) non-PG inherited error code __proto__ stays a JSON 500 [1.03ms]
(pass) non-PG inherited error code constructor stays a JSON 500 [0.79ms]
(pass) non-PG inherited error code toString stays a JSON 500 [0.70ms]

src/config/env.test.ts:
(pass) parseEnv applies defaults [0.31ms]
(pass) parseEnv disables DOCS_ENABLED by default in production and enables otherwise [0.36ms]
(pass) parseEnv fails fast without JWT_SECRET_KEY [0.07ms]
(pass) parseEnv normalizes an empty ADMIN_SECRET_KEY to disabled [0.03ms]
(pass) parseEnv merges CORS_ORIGINS without duplicates [0.02ms]
(pass) parseEnv accepts uppercase LOG_LEVEL [0.04ms]
(pass) parseEnv parses configured values and postgres URLs [0.07ms]
(pass) parseEnv disables boolean flags for off [0.11ms]
(pass) parseEnv disables boolean flags for false [0.02ms]
(pass) parseEnv disables boolean flags for 0 [0.02ms]
(pass) parseEnv enables boolean flags for on [0.03ms]
(pass) parseEnv enables boolean flags for true [0.01ms]
(pass) parseEnv enables boolean flags for 1
(pass) parseEnv rejects invalid DATABASE_URL= [0.08ms]
(pass) parseEnv rejects invalid DATABASE_URL=https://db.test/x [0.03ms]
(pass) parseEnv rejects invalid DATABASE_URL=postgresql:// [0.03ms]
(pass) parseEnv rejects invalid JWT_SECRET_KEY=short [0.06ms]
(pass) parseEnv rejects invalid NODE_ENV=invalid [0.03ms]
(pass) parseEnv rejects invalid LOG_LEVEL=trace [0.02ms]
(pass) parseEnv rejects invalid PORT=65536 [0.03ms]
(pass) parseEnv rejects invalid PORT=1.5 [0.03ms]
(pass) parseEnv rejects invalid ACCESS_TOKEN_EXPIRE_MINUTES=0 [0.03ms]
(pass) parseEnv rejects invalid MAX_LOGIN_ATTEMPTS=-1 [0.06ms]
(pass) parseEnv rejects invalid LOCKOUT_DURATION=invalid [0.04ms]
(pass) parseEnv rejects invalid MIN_PASSWORD_LENGTH=0 [0.04ms]
(pass) parseEnv rejects invalid MAX_UPLOAD_SIZE=0
(pass) parseEnv rejects invalid UPLOAD_DIR= [0.04ms]
(pass) parseEnv rejects invalid STATIC_DIR= [0.01ms]
(pass) parseEnv rejects invalid RATELIMIT_ENABLED=invalid [0.05ms]
(pass) parseEnv rejects invalid RESPONSE_CACHE=invalid [0.02ms]
(pass) parseEnv rejects invalid RUN_MIGRATIONS=invalid [0.02ms]
(pass) parseEnv rejects invalid NOMINATIM_USER_AGENT= [0.02ms]
(pass) parseEnv requires DATABASE_URL [0.04ms]
(pass) parseRunMigrations shares booleanFlag semantics for 0/off/false/1/on/true/unset [0.26ms]

src/security/security.test.ts:
(pass) security primitives > exact defaults
(pass) security primitives > single hop X-Real-IP only from private/loopback/test sockets [0.25ms]
(pass) security primitives > token burst, fractional refill, cap, and LRU touch [0.22ms]
(pass) security primitives > fixed windows reset at boundary and remain bounded [0.12ms]
(pass) security primitives > login check precedes DB: twenty failures allowed, next blocked; window resets [0.10ms]
(pass) security primitives > login LRU checks refresh recency; successful checks do not count as failures [0.03ms]
(pass) security primitives > clean login probes cannot allocate entries or evict a blocked IP [0.08ms]
(pass) security primitives > checking an expired login entry deletes it without allocating a replacement [0.06ms]
(pass) security primitives > headers: API/docs policies, exact HTTPS only, remove disclosure [0.10ms]
(pass) security primitives > raw path/method guards and exact URL length boundary [0.09ms]
(pass) security primitives > header count/UTF8 bytes boundaries (wire name + colon-space + CRLF) [0.18ms]
(pass) security primitives > bounded reader accepts exact/empty and cancels chunked overflow immediately [0.41ms]
(pass) security primitives > overflow remains 413 even if producer cancellation fails [0.09ms]
(pass) security primitives > dishonest small Content-Length cannot bypass streaming cap [0.11ms]
(pass) security primitives > Content-Length over limit rejected without pulling [0.07ms]
(pass) security primitives > body middleware preserves JSON/form validators, default cap, and 413 [1.91ms]
(pass) security primitives > handler timeout succeeds, propagates errors, and returns 503 [2.41ms]
(pass) security primitives > security logger allowlists fields and removes query/secret path segments [0.30ms]
(pass) security primitives > security logs retain actual static routes and redact ids and free text [0.39ms]
(pass) security primitives > Hono route limit slowapi JSON and disable switch [0.40ms]

src/security/hit-cost.test.ts:
(pass) header byte limit matches TextEncoder for Unicode and Latin1 at exact boundary [0.13ms]
(pass) static header reuse cannot leak docs CSP or HSTS to next response [0.05ms]
(pass) IP resolution preserves direct and trusted proxy behavior with or without real IP [0.05ms]

src/lib/native-validation.test.ts:
(pass) order: 401 precedes 422, including malformed JSON [1.87ms]
(pass) order: 403 precedes 422 [1.40ms]
(pass) bodyInvalid overrides malformed JSON and schema failure [1.40ms]
(pass) malformed field produces the entire FastAPI body [1.08ms]
(pass) status 204 skips serialization and sends empty body [1.29ms]
(pass) handler returning null sends JSON null [0.94ms]
(pass) Response leaves ownership with handler [1.10ms]
(pass) extra query params are ignored and parsed inputs reach handler [1.44ms]
(pass) form bodies are parsed before validation [1.28ms]
(pass) missing body field retains parent input in the entire 422 envelope [0.93ms]
(pass) protected route registration requires an injected user loader [0.56ms]
(pass) form-only route rejects JSON credentials as missing fields [0.98ms]
(pass) unauthenticated text body precedes media type validation [1.31ms]
(pass) rate limit precedes auth and params/query/body validation [4.51ms]
(pass) native OpenAPI hook retains raw input; JSON errors and overrides match FastAPI [2.14ms]
(pass) native param and query failures are tested separately (F11 validator ordering) [1.52ms]
(pass) legacy JSON route maps non-JSON media to a model_attributes_type 422 [1.33ms]
(pass) legacy JSON media types are case insensitive [1.24ms]

src/lib/cache.test.ts:
(pass) exported cache v2 constants match specification
(pass) cacheKey sorts query, ignores undefined values, and encodes separators without collisions [0.33ms]
(pass) selectEncoding respects q=0 exclusions, quality weights, priority, and explicit identity exclusion [0.09ms]
(pass) compressBytes skips payloads < 1024 bytes and precompresses >= 1024 bytes with lossless round-trip [1.11ms]
(pass) entry expires at ttl without extending on a hit and releases byteSize [0.16ms]
(pass) LRU evicts the least recently used at max [0.04ms]
(pass) replacing a key refreshes LRU position, updates byteSize, and never exceeds capacity [0.03ms]
(pass) byte cap evicts LRU entries when maxBytes is exceeded and rejects single entry > maxBytes [0.08ms]
(pass) invalidate removes only mapped domains and updates byteSize [0.05ms]
(pass) INVALIDATES includes embedded creator and member/project dependencies [0.02ms]
(pass) generations advance for every mapped domain even with no entries [0.04ms]
(pass) disabled cache never stores [0.01ms]
(pass) weakEtag is stable, body-sensitive, weak, and identical for string and Uint8Array [0.05ms]
(pass) getOrLoad coalesces 10 concurrent misses into 1 loader call and clears inFlight on rejection [17.97ms]
(pass) getOrLoad caches literal 'null' 200 payload (F2) but never caches non-cacheable or 404 results [0.12ms]
(pass) generation race guard (F29): invalidate during in-flight getOrLoad returns payload without caching [0.15ms]
(pass) warmupStartup fills up to 7 registered keys with max concurrency 2 [50.05ms]
(pass) invalidate re-warms only keys seen within recent 10-minute window with max concurrency 2 and respects stop/drain [84.05ms]
(pass) warmupRegistry is bounded by maxEntries/LRU and prunes expired/evicted registrations [0.55ms]
(pass) warmup failures report only safe classifications (keyHash + path, no query/PII/message/stack), walk error cause codes, fall back to logger.error, keep peers warming, and retry on next trigger [0.60ms]
(pass) empty invalidation targets do not even consult warmup clock [0.23ms]

src/lib/http-error.test.ts:
(pass) HttpError preserves validation items as detail without a wrapper
(pass) unauthorized carries the detail and Bearer challenge [0.16ms]

src/lib/slug.test.ts:
(pass) createSlug(Yapay Zekâ & Öğrenme Günü) matches python unidecode [0.26ms]
(pass) createSlug(İstanbul Şişli ÇAĞRI) matches python unidecode [0.06ms]
(pass) createSlug(ığüşöç IĞÜŞÖÇ) matches python unidecode
(pass) createSlug(C++ / C# Atölyesi) matches python unidecode
(pass) createSlug(  --Merhaba   Dünya!!  ) matches python unidecode
(pass) createSlug(München Straße) matches python unidecode
(pass) createSlug(Kahve ☕ Sohbeti) matches python unidecode [0.07ms]
(pass) createSlug(½ maraton №5) matches python unidecode
(pass) createSlug(ﬁnal ’tırnak’ “çift”) matches python unidecode
(pass) createSlug(Ǆ ǅ æ Æ ß þ) matches python unidecode [0.01ms]
(pass) createSlug(é café) matches python unidecode
(pass) createSlug(€100 Ödül) matches python unidecode
(pass) createSlug() matches python unidecode [0.04ms]
(pass) createSlug(!!!) matches python unidecode
(pass) createSlug(MACS 2026 Bahar Tanışma) matches python unidecode
(pass) createSlug(Hackathon'26: 48 Saat) matches python unidecode
(pass) createSlug(Ağ Güvenliği 101 — CTF) matches python unidecode [0.04ms]
(pass) createSlug(a_b.c/d\e) matches python unidecode [0.01ms]
(pass) createSlug(ÀÁÂÃÄÅ àáâãäå Ññ Øø Łł Đđ) matches python unidecode
(pass) createSlug(Œuvre cœur) matches python unidecode
(pass) transliterate maps Latin letters, symbols and combining marks [0.03ms]
(pass) resolveSlug handles collisions and empty bases [0.08ms]
(pass) non-latin title yields empty base [0.02ms]

src/lib/public-cache.test.ts:
(pass) public cache negotiates compressed variants and consistent conditional responses [2.80ms]

src/lib/jwt.test.ts:
(pass) accepts python-jose token [0.41ms]
(pass) sign/verify round trip, exp = now + minutes [1.11ms]
(pass) expired [0.40ms]
(pass) expiration boundary is rejected [0.16ms]
(pass) bad signature [0.16ms]
(pass) garbage [0.02ms]
(pass) missing or empty sub: %s [0.17ms]
(pass) missing or empty sub:  [0.14ms]
(pass) rejects algorithms other than HS256 [0.17ms]
(pass) strips Bearer prefix [0.08ms]
(pass) rejects signed tokens with missing or wrong claims: {"sub":"a@b.co","exp":4102444800} [0.22ms]
(pass) rejects signed tokens with missing or wrong claims: {"sub":"a@b.co","role":"admin"} [0.10ms]
(pass) rejects signed tokens with missing or wrong claims: {"sub":"a@b.co","role":123,"exp":4102444800} [0.14ms]
(pass) rejects signed tokens with missing or wrong claims: {"sub":"a@b.co","role":"admin","exp":"4102444800"} [0.16ms]
(pass) rejects non-string subject in a valid HS256 token [0.13ms]
(pass) rejects a tampered payload [0.14ms]

src/lib/storage.test.ts:
(pass) local disk creates directory, saves bytes, sorted flat regular files only, removes idempotently [2.77ms]
(pass) localDiskStorage rejects traversal on every method [0.70ms]
(pass) signature .jpg <Buffer ff d8 ff> → true [0.38ms]
(pass) signature .jpeg <Buffer ff d8 ff> → true [0.19ms]
(pass) signature .png <Buffer 89 50 4e 47 0d 0a 1a 0a> → true [0.21ms]
(pass) signature .gif <Buffer 47 49 46 38 37 61> → true [0.42ms]
(pass) signature .gif <Buffer 47 49 46 38 39 61> → true [0.29ms]
(pass) signature .webp <Buffer 52 49 46 46 31 32 33 34 57 45 42 50> → true [0.19ms]
(pass) signature .webp <Buffer 52 49 46 46 31 32 33 34 57 41 56 45> → false [0.35ms]
(pass) signature .webp <Buffer 52 49 46 46 31 32 33 34 57 45 42> → false [0.30ms]
(pass) signature .png <Buffer 89 50 4e> → false [0.15ms]
(pass) signature .png <Buffer 4d 5a 20 6e 6f 74 20 61 20 70 6e 67> → false [0.14ms]
(pass) signature .bmp <Buffer 42 4d> → false [0.14ms]
(pass) signature .toString <Buffer 78> → false [0.15ms]
(pass) saveImage lowercases extension and validates before any write [1.04ms]

src/lib/password.test.ts:
(pass) verifies passlib hash [206.18ms]
(pass) rejects wrong password [215.20ms]
(pass) 72-byte truncation matches bcrypt 4.0.1 [616.97ms]
(pass) truncation counts UTF-8 bytes, not characters [407.23ms]
(pass) truncation may cut inside a multibyte character [612.41ms]
(pass) hashPassword truncates ASCII input before Bun can prehash it [613.16ms]
(pass) malformed or empty input returns false, never throws [0.22ms]
(pass) hashPassword emits a cost-12 bcrypt hash and verifies [411.80ms]

src/lib/datetime.test.ts:
(pass) pgToNaiveIso(2026-05-01 11:00:00) preserves wall time and microseconds
(pass) pgToNaiveIso(2026-05-01 11:00:00.5) preserves wall time and microseconds [0.78ms]
(pass) pgToNaiveIso(2026-05-01T11:00:00) preserves wall time and microseconds
(pass) pgToNaiveIso(2026-05-01T11:00:00.123456) preserves wall time and microseconds
(pass) pgToNaiveIso(%s) preserves wall time and microseconds
(pass) pgToUtcIso(2026-05-01 11:00:00.123456+00) handles text and json_agg formats
(pass) pgToUtcIso(2026-05-01 11:00:00+00) handles text and json_agg formats
(pass) pgToUtcIso(2026-05-01 11:00:00.12+00) handles text and json_agg formats
(pass) pgToUtcIso(2026-05-01T11:00:00.123456+00:00) handles text and json_agg formats
(pass) pgToUtcIso(2026-05-01T11:00:00Z) handles text and json_agg formats
(pass) pgToUtcIso(%s) handles text and json_agg formats
(pass) pgToUtcIso rejects non-UTC or missing offsets: 2026-05-01 14:00:00+03 [0.06ms]
(pass) pgToUtcIso rejects non-UTC or missing offsets: 2026-05-01T14:00:00+03:00
(pass) pgToUtcIso rejects non-UTC or missing offsets: 2026-05-01 11:00:00
(pass) parseDateTimeInput(2026-05-01T10:00:00) produces a naive UTC PG literal [0.05ms]
(pass) parseDateTimeInput(2026-05-01T10:00) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-05-01 10:00:00.250) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-05-01T10:00:00Z) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-05-01T10:00:00+03:00) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-01-01T01:30:00+03:00) produces a naive UTC PG literal [0.02ms]
(pass) parseDateTimeInput(2026-05-01) produces a naive UTC PG literal
(pass) parseDateTimeInput(2024-02-29T23:59:59.123456-02:30) produces a naive UTC PG literal
(pass) parseDateTimeInput(0099-01-01T00:00:00) produces a naive UTC PG literal
(pass) parseDateTimeInput(2026-05-01T10:00:00.000000) produces a naive UTC PG literal
(pass) parseDateTimeInput rejects invalid date  [0.01ms]
(pass) parseDateTimeInput rejects invalid date yarin
(pass) parseDateTimeInput rejects invalid date 2026-13-01T00:00:00
(pass) parseDateTimeInput rejects invalid date 2026-02-30T00:00:00
(pass) parseDateTimeInput rejects invalid date 2026-05-01T25:00:00
(pass) parseDateTimeInput rejects invalid date 2026-00-01
(pass) parseDateTimeInput rejects invalid date 2026-01-00 [0.01ms]
(pass) parseDateTimeInput rejects invalid date 2025-02-29
(pass) parseDateTimeInput rejects invalid date 2026-05-01T10:60:00 [0.01ms]
(pass) parseDateTimeInput rejects invalid date 2026-05-01T10:00:60
(pass) parseDateTimeInput rejects invalid date 2026-05-01T10:00:00+24:00
(pass) parseDateTimeInput rejects invalid date 2026-05-01T10:00:00+03:60
(pass) parseDateTimeInput rejects invalid date 2026-05-01T10:00:00junk
(pass) parseDateTimeInput rejects invalid date 0000-01-01
(pass) parseDateTimeInput rejects invalid date 2026-05-01T10:00:00

(pass) slugTimestamp uses UTC [0.02ms]

src/lib/validation.test.ts:
(pass) missing body field [0.22ms]
(pass) query int parsing [0.25ms]
(pass) query le bound [0.12ms]
(pass) query ge bound [0.12ms]
(pass) qInt default + absent [0.04ms]
(pass) qInt rejects floats and blanks [0.15ms]
(pass) qBool [0.11ms]
(pass) enum [0.15ms]
(pass) string bounds [0.08ms]
(pass) custom refine → value_error [0.29ms]
(pass) path int [0.13ms]
(pass) nested array loc [0.11ms]
(pass) qStr normalizes empty and absent values [0.14ms]
(pass) query helpers reject non-scalar values [0.07ms]
(pass) query defaults apply only when absent [0.03ms]
(pass) datetime input becomes a PostgreSQL literal [0.16ms]
(pass) validationError stores items without double nesting [0.02ms]
(pass) primitive type errors and missing query input [0.07ms]
(pass) bodyInt matches Pydantic 2.11.7 lax int accept, reject, and error-type table [0.41ms]
(pass) intentional int4 safety deviation: reject integers beyond Number.MAX_SAFE_INTEGER (Pydantic accepts; old DB writes fail) [0.33ms]
(pass) bodyBool matches Pydantic lax aliases, defaults, nullability and error types [0.32ms]
(pass) bodyFloat matches Pydantic coordinate parsing and bounded error types [0.15ms]
(pass) qBool accepts Pydantic single-letter query aliases [0.23ms]

src/lib/logger.test.ts:
(pass) buffered logger drains every completion and security record on normal exit [37.90ms]

 276 pass
 0 fail
 3563 expect() calls
Ran 276 tests across 17 files. [3.68s]
```

### bun test bench

Exit 0.

```text
bun test v1.3.5 (1e86cebd)

bench/compare.test.ts:
(pass) passes when p95 and RPS equal the baseline [1.95ms]
(pass) fails on slower p95 even with high RPS [0.36ms]
(pass) fails on lower RPS even with low p95 [0.07ms]
(pass) fails on missing endpoint
(pass) fails when successRate is below 0.999 [0.14ms]
(pass) accepts successRate of exactly 0.999 [0.04ms]
(pass) 2x target does not affect gate and respects custom multiplier [0.06ms]
(pass) every endpoint must pass
(pass) empty baseline, extra endpoint, invalid numbers and invalid multiplier fail closed [0.23ms]
(pass) CLI reads benchmark envelopes and reports pass, target miss and fail exit codes [66.77ms]
(pass) CLI rejects cached and missing cache metadata, and informational mode never passes a gate [225.05ms]

bench/run.test.ts:
(pass) two-request cache probe observes [ "MISS", "MISS" ] as false [2.84ms]
(pass) two-request cache probe observes [ "MISS", "HIT" ] as true [1.15ms]
(pass) two-request cache probe observes [ "HIT", "HIT" ] as true [0.95ms]
(pass) two-request cache probe observes [ undefined, undefined ] as false [0.90ms]
(pass) cache probe rejects non-200 responses rather than asserting cache-off [0.97ms]

 16 pass
 0 fail
 76 expect() calls
Ran 16 tests across 2 files. [325.00ms]
```

## Cleanup, files, commits and self-review

- Product commits: 923f9a75 perf(security): reduce cached request guard allocations; f8ac1262 perf(cors): preserve canonical vary headers without rebuilding; 3b0ffbc3 perf(logging): batch request logs and flush on shutdown.
- Files: src/security/{request-guards,headers,ip}.ts and hit-cost.test.ts; middleware/cors.ts and cors.test.ts; lib/logger.ts and logger.test.ts; server.ts; bench/profile-hit.ts; four new result-task13b-*.json files; bench/task13b-evidence (reproduction scripts, profiles, gate/compare outputs, CPU/cache probes, checks, cleanup and server-log summary); this report.
- All started compose containers removed without deleting volumes. Existing macs-db and macs-backend preserved. External Express worktree removed. All benchmark/profile servers stopped. No push/server access or unrelated edits.
- High-volume server logs were summarized by line count and first/last records in server-log-summary.json, then removed locally; CPU snapshots, cache probes and benchmark logs retained. Failed CPU profile stderr tail preserved in that summary.
- Self-review: read entire production diff and new tests, checked UTF-8 framing boundaries, unchanged trust predicate, independent response headers, Vary semantics, completion/security record content and shutdown drain. No rate-limit/security bypass, cache shortcut, contract assertion weakening or threshold change. Full correctness suite remains green.
- OLD's three existing skips: account-lock persistence, old python-jose compatibility token, empty-base slug timing. No new skipped tests. Benchmark compare cached emits informational target-miss messages for the nonbinding 2x RPS aspiration; cached spec gate remains p95 only.
- Remaining concerns: cache-ON gate still fails for two member endpoints; featured-events passing margin is tiny; CPU stack profiler failed; synthetic isolated timings cannot prove a single root cause; host was not idle; buffering changes log delivery timing/crash-loss exposure. This task does not establish spec acceptance or production readiness for cutover.

### Cleanup output
```text
 Container backend-ts-old-1  Stopping
 Container backend-ts-new-1  Stopping
 Container backend-ts-new-1  Stopped
 Container backend-ts-new-1  Removing
 Container backend-ts-old-1  Stopped
 Container backend-ts-old-1  Removing
 Container backend-ts-new-1  Removed
 Container backend-ts-db-new-1  Stopping
 Container backend-ts-old-1  Removed
 Container backend-ts-db-old-1  Stopping
 Container backend-ts-db-new-1  Stopped
 Container backend-ts-db-new-1  Removing
 Container backend-ts-db-old-1  Stopped
 Container backend-ts-db-old-1  Removing
 Container backend-ts-db-new-1  Removed
 Container backend-ts-db-old-1  Removed
 Network backend-ts_default  Removing
 Network backend-ts_default  Removed
macs-db 127.0.0.1:5434->5432/tcp
macs-backend 127.0.0.1:8000->8000/tcp
/Users/yusufefetasdelen/Documents/GitHub/macs-website           3b0ffbc3 [feat/backend-ts]
/Users/yusufefetasdelen/Documents/GitHub/macs-website-projeler  c1c58bd8 [main]

```
