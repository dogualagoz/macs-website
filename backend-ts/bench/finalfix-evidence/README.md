# Final review fixed revision measurements

Runtime/source revision 34202bf9cff49991ed25ccc4428a579516447cf6; Express baseline 620c94ab, external temporary worktree /tmp/macs-finalfix-express.
Same Task13b sequence: Express OFF, Express ON, Hono OFF, Hono ON; no server overlap, contract applications stopped during measurement. Bun 1.3.5, oha 1.17.0, production mode, default info logging, rate limits disabled, same local PG13 macs_bench_task13 restored from ignored local dump and migrated 0000/0001. Counts 31 events, 31 projects, 14 members, 28 sponsors. No data dump included.
Unchanged bench/run.ts: seven original endpoints, c=50, 5s warmup then 20s measurement. All 28 success rates 1.0; probes/metadata establish cache OFF/ON. Host user apps and macs-db/macs-backend stayed running; no idle-host claim. Raw logs, CPU/load samples, runner and full gate outputs archived outside product tree under vault bun-gecis-sdd/v2-evidence/finalfix-evidence.
Literal gates: OFF 7/7, ON 1/7. Thresholds unchanged. Historical Task13b accepted leaderboard +0.035541 ms / members +0.057083 ms noise ruling is retained; it does not automatically accept new misses. Merge requires a controller ruling or further scoped optimization for current cache-ON failures.

Fresh correctness gates: tsc/eslint, unit 280, integration 229 (PG5436), bench 16, harness 18, shadow 4, OLD contracts 223 pass/3 skip, NEW 226 pass; differential 132 requests/0 unexpected after clean upload tmpfs. Production image uid10001, readiness200, docs/OpenAPI404, SIGTERM exit0. Deploy bash -n/shellcheck exit0 and local dry-run9/9. Full transcripts are in ignored final-fix-report.md and the external archive.

| Mode / endpoint | Express p95 / RPS | Fixed p95 / RPS | Task13b v2 p95 / RPS | Fixed vs Task13b p95 / RPS | Gate |
|---|---:|---:|---:|---:|---|
| uncached /events?limit=100 | 18.085000 / 3210.49 | 4.024625 / 16101.68 | 4.127625 / 15837.16 | -0.103000 / +264.52 | PASS |
| uncached /events/featured | 29.672959 / 2044.18 | 2.716291 / 24090.99 | 2.736417 / 24384.53 | -0.020126 / -293.55 | PASS |
| uncached /projects?limit=100 | 41.755041 / 1511.40 | 5.498541 / 11869.90 | 5.571958 / 11763.98 | -0.073417 / +105.92 | PASS |
| uncached /projects/featured | 18.455500 / 3650.84 | 2.803625 / 23372.71 | 2.767917 / 23375.20 | +0.035708 / -2.49 | PASS |
| uncached /members/leaderboard | 17.986334 / 3833.36 | 3.490500 / 19666.40 | 3.481875 / 19684.78 | +0.008625 / -18.38 | PASS |
| uncached /members | 13.573834 / 5948.14 | 3.289333 / 21208.49 | 3.214542 / 21574.58 | +0.074791 / -366.09 | PASS |
| uncached /sponsors/ | 21.733292 / 3140.32 | 3.687417 / 18476.02 | 3.660125 / 18565.43 | +0.027292 / -89.41 | PASS |
| cached /events?limit=100 | 2.305375 / 30482.51 | 2.426333 / 30440.63 | 2.404583 / 30562.39 | +0.021750 / -121.76 | FAIL |
| cached /events/featured | 2.005750 / 38851.73 | 2.175833 / 36405.85 | 2.215000 / 36455.42 | -0.039167 / -49.57 | FAIL |
| cached /projects?limit=100 | 2.958167 / 21257.27 | 2.439292 / 29903.81 | 2.418208 / 30085.30 | +0.021084 / -181.49 | PASS |
| cached /projects/featured | 2.068041 / 36477.88 | 2.247459 / 35623.24 | 2.161667 / 36185.91 | +0.085792 / -562.66 | FAIL |
| cached /members/leaderboard | 2.029833 / 37071.56 | 2.318000 / 32701.07 | 2.339333 / 32800.90 | -0.021333 / -99.84 | FAIL |
| cached /members | 2.069541 / 36915.96 | 2.332458 / 32610.98 | 2.323250 / 32542.18 | +0.009208 / +68.80 | FAIL |
| cached /sponsors/ | 2.195334 / 32497.22 | 2.340458 / 32287.69 | 2.407500 / 31848.87 | -0.067042 / +438.82 | FAIL |
