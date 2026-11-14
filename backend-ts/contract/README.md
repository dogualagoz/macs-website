# Shared HTTP contract harness

Run from `backend-ts/`, using Bun 1.3.5 and Docker Desktop. Both databases are
synthetic `macs_test` databases: old on 5435, new on 5436. Compose initializes the
frozen schema, explicit Alembic HEAD `e2b8c1f7a934`, then `seed.sql` before apps
start. `resetState()` reloads that seed atomically before each test; its URL guard
accepts only the corresponding localhost port and database name. All sequence
values are reset too. Tests run sequentially because they share the target DB.

```sh
docker compose -f docker-compose.contract.yml up -d --build db-old old
TARGET_URL=http://127.0.0.1:8001 TARGET_KIND=old \
  CONTRACT_DB_URL_OLD=postgresql://postgres:postgres@127.0.0.1:5435/macs_test \
  bun test contract
```

Task 5 requires the complete old-target suite. New domains are implemented in
Tasks 6–10. Gate each task only on implemented domains, for example after Task 6:

```sh
TARGET_URL=http://127.0.0.1:8011 TARGET_KIND=new \
  CONTRACT_DB_URL_NEW=postgresql://postgres:postgres@127.0.0.1:5436/macs_test \
  TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5436/macs_test \
  bun contract/run.ts --domains=system,auth,users
```

The runner selects named domain files and matching groups of the legacy port.
With no domain argument it runs all available domain suites and the complete
legacy port. Explicitly selecting a missing suite or unknown domain fails.
Add future `<domain>.test.ts` files in this directory. If grouping tests in a
shared file, use `isDomainEnabled()` with `describe`/`describe.skip` as in the
legacy port. `CONTRACT_DOMAINS` also selects differential catalogue domains.
Do not use concurrent tests with the shared seed. Full contracts and the full
differential are mandatory at Task 10.

```sh
docker compose -f docker-compose.contract.yml up -d --build db-old old db-new new
OLD_URL=http://127.0.0.1:8001 NEW_URL=http://127.0.0.1:8011 \
  CONTRACT_DB_URL_OLD=postgresql://postgres:postgres@127.0.0.1:5435/macs_test \
  CONTRACT_DB_URL_NEW=postgresql://postgres:postgres@127.0.0.1:5436/macs_test \
  bun contract/differential.ts
```

Differential resets both DBs before login, uses valid admin tokens for protected
GETs, compares the static catalogue and details/slugs discovered from both
responses, and exits nonzero for unexpected differences or request errors.
Approved exceptions match method, pathname, query and expected response shape.
P1 compares the old redirect destination's body too. ZIPs compare entry names and
uncompressed bytes rather than archive timestamps. Upload storage starts empty
in each app's tmpfs; SQL resets intentionally do not clear uploaded files. For a
full differential after upload tests, recreate the two app containers first so
both upload stores start empty. Tests use archive contents before/after uploads
to verify accepted file bytes and absence of rejected files over HTTP.

`RESPONSE_CACHE=false` is fixed on the long-lived new compose server for parity
runs. Rate limits default off, overridable with `RATELIMIT_ENABLED=true` for
separate rate-limit checks. Login 401s retain the old absence of WWW-Authenticate
(F22 rejected). Used project-category deletion is 204 parity, excluded from
foreign-key deviation e. The deviations registry includes a–h, j and P1–P8;
normalization drops only ctx/url from validation items and preserves msg/input.
