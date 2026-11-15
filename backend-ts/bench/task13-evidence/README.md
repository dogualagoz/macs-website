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
