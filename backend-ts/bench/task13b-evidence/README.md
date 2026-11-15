# Task 13b measurement provenance

Candidate 27c0e56f (runtime logging commit 3b0ffbc3); Express baseline 620c94ab.
Bun 1.3.5, oha 1.17.0, Apple M3 Max, PG13 macs_bench_task13 restored from the ignored local dump, migrations 0000/0001. No dataset included.
Sequential Express OFF/ON then Hono OFF/ON, production, default logging, rate limits disabled, c=50, 5s warmup plus 20s measurement, seven endpoints. See result-task13b-* and cache probes.
Unchanged literal gates: OFF 7/7; ON 5/7. Controller accepted leaderboard +0.035541 ms and members +0.057083 ms as measurement noise; thresholds were not changed. This ruling concerns those measurements only.
Static/unit/integration/contracts old+new and differential (132 requests, zero unexpected) passed historically. Production docs default-off, shadow-diff and deploy dry-runs remained carried final gates, not established by NODE_ENV=test compose health.
profile-before.json/profile-after.json preserve actual microbenchmark comparison. The attempted oha CPU profile did not write a profile; no CPU attribution claim follows from it. Server-log summary and raw logs/runners were archived in the external vault v2-evidence/task13b-evidence before removal.
