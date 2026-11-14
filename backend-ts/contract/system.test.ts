import { beforeEach, describe, expect, test } from "bun:test";
import { api, isDomainEnabled, login, resetState, SEED } from "./client";
import type { Domain } from "./client";
const domain = (name: Domain, fn: () => void) => { (isDomainEnabled(name) ? describe : describe.skip)(name, fn); };

domain("system", () => {
  beforeEach(resetState);
  test("GET / and /health", async () => {
    const root = await api("GET", "/");
    expect(root.status).toBe(200);
    expect(root.body).toEqual({ message: "MACS Kulubu Web Sitesine hosgeldiniz!" });
    const health = await api("GET", "/health");
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: "ok" });
  });
  test("unknown path → 404 Not Found", async () => {
    const r = await api("GET", "/nope");
    expect(r.status).toBe(404);
    expect(r.body).toEqual({ detail: "Not Found" });
  });
  test("POST /users → 405", async () => {
    const r = await api("POST", "/users", { token: await login(SEED.admin), json: {} });
    expect(r.status).toBe(405);
    expect(r.body).toEqual({ detail: "Method Not Allowed" });
  });
  test("security headers", async () => {
    const r = await api("GET", "/health");
    expect(r.status).toBe(200);
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(r.headers.get("x-frame-options")).toBe("DENY");
    expect(r.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(r.headers.get("permissions-policy")).toBe("geolocation=(), microphone=(), camera=()");
  });
  test("CORS allows macsclub.com.tr", async () => {
    const r = await api("GET", "/health", { headers: { Origin: "https://macsclub.com.tr" } });
    expect(r.status).toBe(200);
    expect(r.headers.get("access-control-allow-origin")).toBe("https://macsclub.com.tr");
    expect(r.headers.get("access-control-allow-credentials")).toBe("true");
  });
});
