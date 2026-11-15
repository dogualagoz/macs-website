import { expect, test } from "bun:test";
import { normalize, normalizeZip, stableJson } from "../contract/normalize";
import { approvedDeviation, knownDeviations, selectDeviation } from "../contract/deviations";

test("normalization preserves supported 422 msg/input and strips only P4 metadata", () => {
  const error = { type: "greater_than_equal", loc: ["query", "skip"], msg: "Input should be greater than or equal to 0", input: "-1" };
  expect(normalize("/events?skip=-1", { detail: [{ ...error, ctx: { ge: 0 }, url: "https://errors.pydantic.dev" }] })).toEqual({ detail: [error] });
  expect(stableJson(normalize("/events", { detail: [error] }))).not.toBe(stableJson(normalize("/events", { detail: [{ ...error, msg: "wrong" }] })));
  expect(stableJson(normalize("/events", { detail: [error] }))).not.toBe(stableJson(normalize("/events", { detail: [{ ...error, input: "-2" }] })));
});
test("normalization changes volatile values and unordered lists only", () => {
  expect(normalize("/events/categories?limit=2", [{ id: 2 }, { id: 1 }])).toEqual([{ id: 1 }, { id: 2 }]);
  expect(normalize("/events", [{ id: 2 }, { id: 1 }])).toEqual([{ id: 2 }, { id: 1 }]);
  expect(normalize("/projects", { projects: [{ members: [{ id: 2 }, { id: 1 }], title: "Kept", last_login: "today" }] })).toEqual({ projects: [{ members: [{ id: 1 }, { id: 2 }], title: "Kept", last_login: "<volatile>" }] });
  expect(normalize("/users/me", { detail: "Token geçersiz veya süresi dolmuş: signature" })).toEqual({ detail: "Token geçersiz veya süresi dolmuş" });
  expect(stableJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
});
test("deviation IDs are registered and unknown IDs fail closed", () => {
  expect(knownDeviations.map(d => d.id)).toEqual(["a", "b", "c", "d", "e", "f", "g", "h", "j", "k", "l", "m", "n", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"]);
  expect(selectDeviation("old", "a", { old: 500, new: 401 })).toBe(500);
  expect(selectDeviation("new", "a", { old: 500, new: 401 })).toBe(401);
  expect(selectDeviation("new", "l", { old: 500, new: 422 })).toBe(422);
  expect(() => selectDeviation("old", "unapproved", { old: 1, new: 2 })).toThrow("Unknown deviation");
});
const old500 = { status: 500, body: "Internal Server Error" };
const new422 = { status: 422, body: { detail: [{ type: "enum", loc: ["query", "status"], msg: "Input should be 'PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD' or 'CANCELLED'", input: "X" }] } };
test("matcher requires method, pathname, query and exact expected response shape", () => {
  const request = { method: "GET", path: "/projects", query: new URLSearchParams("status=X") };
  expect(approvedDeviation(request, old500, new422)).toBe("f");
  expect(approvedDeviation({ ...request, method: "POST" }, old500, new422)).toBeNull();
  expect(approvedDeviation({ ...request, path: "/events" }, old500, new422)).toBeNull();
  expect(approvedDeviation({ ...request, query: new URLSearchParams("status=COMPLETED") }, old500, new422)).toBeNull();
  expect(approvedDeviation(request, old500, { status: 404, body: {} })).toBeNull();
  expect(approvedDeviation(request, old500, { ...new422, body: { detail: [{ type: "missing", loc: ["query", "limit"], msg: "wrong", input: "X" }] } })).toBeNull();
  expect(approvedDeviation({ method: "DELETE", path: "/projects/categories/1", query: new URLSearchParams() }, old500, { status: 409, body: {} })).toBeNull();
});
test("user pagination and redoc deviations do not approve unrelated differences", () => {
  const r = { method: "GET", path: "/users", query: new URLSearchParams("limit=-1") };
  const validation = { status: 422, body: { detail: [{ type: "greater_than_equal", loc: ["query", "limit"], msg: "Input should be greater than or equal to 1", input: "-1" }] } };
  expect(approvedDeviation(r, old500, validation)).toBe("h");
  expect(approvedDeviation({ ...r, query: new URLSearchParams("limit=10") }, old500, validation)).toBeNull();
  expect(approvedDeviation({ method: "GET", path: "/redoc", query: new URLSearchParams() }, { status: 200, body: "html" }, { status: 404, body: { detail: "Not Found" } })).toBe("P5");
});
test.each([
  "/projects?status=X",
  "/projects/admin?status=X",
  "/users?skip=-1",
  "/users?limit=-1",
  "/health",
])("new-side unhandled 500 is an unexpected differential diff: %s", async path => {
  const { compareResponses } = await import("../contract/differential");
  const url = new URL(path, "http://contract.test");
  const request = { method: "GET", path: url.pathname, query: url.searchParams };
  const old = { ...old500, headers: new Headers(), text: "Internal Server Error" };
  const next = { status: 500, body: { detail: "Internal Server Error" }, headers: new Headers(), text: '{"detail":"Internal Server Error"}' };
  expect(compareResponses(request, old, next)).toEqual({
    equal: false, deviation: null, old: "Internal Server Error", new: { detail: "Internal Server Error" },
  });
  expect(approvedDeviation(request, old, next)).toBeNull();
});
test("ZIP normalization ignores container metadata but preserves entry bytes and names", () => {
  // A real stored ZIP, generated by Python zipfile; timestamps do not enter the comparison.
  const data = Buffer.from("UEsDBBQAAAAAAACAKVwL6QZjAwAAAAMAAAAFAAAAYS50eHRhYmNQSwECFAMUAAAAAAAAgClcC+kGYwMAAAADAAAABQAAAAAAAAAAAAAAgAEAAAAAYS50eHRQSwUGAAAAAAEAAQAzAAAAJgAAAAAA", "base64");
  expect(normalizeZip(data)).toEqual([{ name: "a.txt", data: "YWJj" }]);
  expect(() => normalizeZip(new Uint8Array([1, 2]))).toThrow();
});

test("differential compares JSON and ZIP as separate formats and detects regressions", async () => {
  const { compareResponses, GET_CATALOGUE } = await import("../contract/differential");
  const r = { method: "GET", path: "/events", query: new URLSearchParams() };
  const response = (body: unknown, status = 200) => ({ body, status, headers: new Headers(body instanceof Uint8Array ? { "content-type": "application/zip" } : {}), text: "" });
  expect(compareResponses(r, response({ title: "A" }), response({ title: "B" }))).toMatchObject({ equal: false, deviation: null });
  expect(compareResponses(r, response({ title: "A" }), response({ title: "A" }, 404))).toMatchObject({ equal: false, deviation: null });
  expect(compareResponses(r, response({ last_login: "a" }), response({ last_login: "b" }))).toMatchObject({ equal: true });
  const data = Buffer.from("UEsDBBQAAAAAAACAKVwL6QZjAwAAAAMAAAAFAAAAYS50eHRhYmNQSwECFAMUAAAAAAAAgClcC+kGYwMAAAADAAAABQAAAAAAAAAAAAAAgAEAAAAAYS50eHRQSwUGAAAAAAEAAQAzAAAAJgAAAAAA", "base64");
  const changedTime = Buffer.from(data);
  changedTime.writeUInt16LE(123, 10);
  expect(compareResponses({ ...r, path: "/api/upload/download-all" }, response(data), response(changedTime))).toMatchObject({ equal: true });
  const changedBytes = Buffer.from(data);
  changedBytes[35] = 100;
  expect(compareResponses({ ...r, path: "/api/upload/download-all" }, response(data), response(changedBytes))).toMatchObject({ equal: false, deviation: null });
  for (const path of ["/users/me", "/users", "/events/admin", "/projects/admin", "/api/upload/download-all"]) expect(GET_CATALOGUE.find(item => item.path === path)?.protected).toBe(true);
  expect(GET_CATALOGUE.some(item => item.path === "/projects?status=X")).toBe(true);
});

test("client requires target configuration and rejects reset URLs outside isolated databases", () => {
  const client = new URL("../contract/client.ts", import.meta.url).pathname;
  const probe = (source: string) => Bun.spawnSync([process.execPath, "--eval", source], { env: { ...process.env, TARGET_URL: "http://127.0.0.1:8001", TARGET_KIND: "old" } });
  const missing = probe(`delete process.env.TARGET_URL; await import(${JSON.stringify(client)});`);
  expect(missing.exitCode).not.toBe(0);
  expect(missing.stderr.toString()).toContain("TARGET_URL is required");
  const invalid = probe(`process.env.TARGET_KIND = "other"; await import(${JSON.stringify(client)});`);
  expect(invalid.exitCode).not.toBe(0);
  expect(invalid.stderr.toString()).toContain("TARGET_KIND must be old or new");
  const guards = probe(`
    const { contractDbUrl, selectedDomains } = await import(${JSON.stringify(client)});
    for (const value of ["postgresql://postgres:postgres@127.0.0.1:5435/postgres", "postgresql://postgres:postgres@remote.example:5435/macs_test", "postgresql://postgres:postgres@127.0.0.1:5436/macs_test"]) {
      process.env.CONTRACT_DB_URL_OLD = value;
      let rejected = false;
      try { contractDbUrl("old"); } catch { rejected = true; }
      if (!rejected) throw new Error("Unsafe database URL accepted");
    }
    process.env.CONTRACT_DB_URL_OLD = "postgresql://postgres:postgres@127.0.0.1:5435/macs_test";
    if (!contractDbUrl("old").endsWith("/macs_test")) throw new Error("Valid URL rejected");
    if (selectedDomains("system,auth,auth").join(",") !== "system,auth") throw new Error("Selection failed");
    let rejected = false;
    try { selectedDomains("typo"); } catch { rejected = true; }
    if (!rejected) throw new Error("Unknown domain accepted");
  `);
  expect(guards.exitCode).toBe(0);
  expect(guards.stderr.toString()).toBe("");
});


test("project role deviation k approves only role values on project GET responses", () => {
  const oldProject = { id: 2, title: "Mobil", members: [{ id: 1, full_name: "Ayşe", project_role: "Lead" }] };
  const newProject = { ...oldProject, members: [{ ...oldProject.members[0], project_role: null }] };
  for (const path of ["/projects", "/projects/admin", "/projects/featured", "/projects/by-slug/mobil", "/projects/2"]) {
    const r = { method: "GET", path, query: new URLSearchParams() };
    const collection = ["/projects", "/projects/admin"].includes(path);
    const wrap = (project: object) => collection ? { projects: [project], total: 1, page: 1, size: 10 } : project;
    const old = { status: 200, body: wrap(oldProject) }; const next = { status: 200, body: wrap(newProject) };
    expect(approvedDeviation(r, old, next)).toBe("k");
    expect(approvedDeviation(r, old, { ...next, body: wrap({ ...newProject, title: "wrong" }) })).toBeNull();
    expect(approvedDeviation(r, old, { ...next, body: wrap({ ...newProject, members: [{ ...newProject.members[0], full_name: "wrong" }] }) })).toBeNull();
    expect(approvedDeviation(r, old, { ...next, status: 404 })).toBeNull();
    expect(approvedDeviation({ ...r, method: "POST" }, old, next)).toBeNull();
    expect(approvedDeviation(r, old, old)).toBeNull();
  }
  const old = { status: 200, body: oldProject }; const next = { status: 200, body: newProject };
  for (const path of ["/events/2", "/projects/categories", "/projects/2/members", "/members/1/projects", "/projects/admin/other"]) expect(approvedDeviation({ method: "GET", path, query: new URLSearchParams() }, old, next)).toBeNull();
  expect(approvedDeviation({ method: "GET", path: "/projects/2", query: new URLSearchParams() }, old, { status: 200, body: { ...newProject, members: [{ id: 1, full_name: "Ayşe" }] } })).toBeNull();
  expect(oldProject.members[0]?.project_role).toBe("Lead");
});

test("sponsor update deviation l approves only PUT /sponsors/:id with old 500 and new 422", () => {
  const put = { method: "PUT", path: "/sponsors/1", query: new URLSearchParams() };
  const newLong = { status: 422, body: { detail: [{ type: "string_too_long", loc: ["body", "discount_info"], msg: "String should have at most 500 characters", input: "x".repeat(501) }] } };
  const newNullActive = { status: 422, body: { detail: [{ type: "bool_type", loc: ["body", "is_active"], msg: "Input should be a valid boolean", input: null }] } };
  const newNullFeatured = { status: 422, body: { detail: [{ type: "bool_type", loc: ["body", "is_featured"], msg: "Input should be a valid boolean", input: null }] } };
  expect(approvedDeviation(put, old500, newLong)).toBe("l");
  expect(approvedDeviation({ ...put, path: "/sponsors/42" }, old500, newNullActive)).toBe("l");
  expect(approvedDeviation(put, old500, newNullFeatured)).toBe("l");
  for (const method of ["GET", "POST", "DELETE", "PATCH"]) expect(approvedDeviation({ ...put, method }, old500, newLong)).toBeNull();
  for (const path of ["/sponsors", "/sponsors/", "/sponsors/abc", "/sponsors/1/extra", "/events/1", "/projects/1"]) {
    expect(approvedDeviation({ ...put, path }, old500, newLong)).toBeNull();
  }
  expect(approvedDeviation({ ...put, query: new URLSearchParams("x=1") }, old500, newLong)).toBeNull();
  expect(approvedDeviation(put, { status: 200, body: {} }, newLong)).toBeNull();
  expect(approvedDeviation(put, { status: 404, body: {} }, newLong)).toBeNull();
  expect(approvedDeviation(put, { status: 500, body: { detail: "Other" } }, newLong)).toBeNull();
  expect(approvedDeviation(put, old500, { status: 500, body: { detail: "Internal Server Error" } })).toBeNull();
  expect(approvedDeviation(put, old500, { status: 200, body: {} })).toBeNull();
  expect(approvedDeviation(put, old500, { status: 404, body: {} })).toBeNull();
  expect(approvedDeviation(put, old500, { status: 422, body: { detail: [{ type: "string_too_short", loc: ["body", "name"], msg: "String should have at least 2 characters", input: "A" }] } })).toBeNull();
});

test("shared compare module aligns embedded members by id for deviation k and validates record IDs", async () => {
  const { compareResponses, records } = await import("../contract/compare");
  const { compareResponses: diffCompare, records: diffRecords } = await import("../contract/differential");
  expect(compareResponses).toBe(diffCompare);
  expect(records).toBe(diffRecords);
  expect(records({ projects: [{ id: 1, slug: "p" }] }, "projects")).toEqual([{ id: 1, slug: "p" }]);
  expect(() => records({ projects: "not-an-array" }, "projects")).toThrow("Catalogue discovery expected an array at projects");
  expect(() => records([{ id: "1" }])).toThrow("Catalogue discovery expected numeric IDs");
  // Deviation k aligns embedded members by member id before comparing roles so SQL join ordering
  // differences do not hide role-only diffs, while any non-role difference remains unapproved.
  const identity = { method: "GET", path: "/projects/2", query: new URLSearchParams() };
  const old = {
    status: 200,
    headers: new Headers(),
    body: { id: 2, members: [{ id: 2, full_name: "B", project_role: "Lead" }, { id: 1, full_name: "A", project_role: "Dev" }] },
  };
  const roleOnlyReordered = {
    status: 200,
    headers: new Headers(),
    body: { id: 2, members: [{ id: 1, full_name: "A", project_role: "Other" }, { id: 2, full_name: "B", project_role: "Member" }] },
  };
  expect(compareResponses(identity, old, roleOnlyReordered)).toMatchObject({ equal: false, deviation: "k" });
  expect(approvedDeviation(identity, old, roleOnlyReordered)).toBe("k");
  // Identical roles in a different raw order normalize as equal (no spurious deviation k)
  const sameRolesReordered = {
    status: 200,
    headers: new Headers(),
    body: { id: 2, members: [{ id: 1, full_name: "A", project_role: "Dev" }, { id: 2, full_name: "B", project_role: "Lead" }] },
  };
  expect(compareResponses(identity, old, sameRolesReordered)).toMatchObject({ equal: true, deviation: null });
  expect(approvedDeviation(identity, old, sameRolesReordered)).toBeNull();
  // Non-role differences with reordered members must NOT be waived by deviation k
  const nameChangedReordered = {
    status: 200,
    headers: new Headers(),
    body: { id: 2, members: [{ id: 1, full_name: "A-changed", project_role: "Other" }, { id: 2, full_name: "B", project_role: "Member" }] },
  };
  const missingMember = {
    status: 200,
    headers: new Headers(),
    body: { id: 2, members: [{ id: 1, full_name: "A", project_role: "Other" }] },
  };
  expect(compareResponses(identity, old, nameChangedReordered)).toMatchObject({ equal: false, deviation: null });
  expect(approvedDeviation(identity, old, nameChangedReordered)).toBeNull();
  expect(compareResponses(identity, old, missingMember)).toMatchObject({ equal: false, deviation: null });
});

test("deviation n matches only raw static traversal, with exact 404 to 400 envelopes", () => {
  const old = { status: 404, body: { detail: "Not Found" } };
  const next = { status: 400, body: { detail: "Bad Request" } };
  for (const path of ["/uploads/..%2fsecret", "/uploads/a%00.png", "/static/%252e%252e/secret", "/uploads/a%5cb.png"]) {
    const req = { method: "GET", path, query: new URLSearchParams() };
    expect(approvedDeviation(req, old, next)).toBe("n");
    expect(approvedDeviation({ ...req, method: "POST" }, old, next)).toBeNull();
    expect(approvedDeviation({ ...req, query: new URLSearchParams("x=1") }, old, next)).toBeNull();
    expect(approvedDeviation(req, old, { status: 400, body: { detail: "other" } })).toBeNull();
    expect(approvedDeviation(req, { status: 500, body: old.body }, next)).toBeNull();
  }
  for (const path of ["/static/%2e%2e/package.json", "/static/%2e%2e/safe%25.png", "/uploads/../secret", "/package.json", "/uploads/missing.png", "/uploads/%25file.png", "/api/..%2fsecret"]) {
    expect(approvedDeviation({ method: "GET", path, query: new URLSearchParams() }, old, next)).toBeNull();
  }
});


test("deviation m is restricted to GET docs paths and approved statuses", () => {
  for (const path of ["/docs", "/docs/", "/openapi.json"]) {
    for (const status of [200, 307]) expect(approvedDeviation({ method: "GET", path, query: new URLSearchParams() }, { status, body: "docs" }, { status: 404, body: { detail: "Not Found" } })).toBe("m");
  }
  for (const [method, path, status, next] of [["POST", "/docs", 200, 404], ["GET", "/docs/asset.js", 200, 404], ["GET", "/events", 200, 404], ["GET", "/docs", 500, 404], ["GET", "/docs", 200, 500]] as const) expect(approvedDeviation({ method, path, query: new URLSearchParams() }, { status, body: "docs" }, { status: next, body: {} })).toBeNull();
});
