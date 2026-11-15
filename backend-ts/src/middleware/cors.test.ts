import { expect, test } from "bun:test";
import { Hono } from "hono";
import { createCors } from "./cors";
import { parseEnv } from "../config/env";
test("CORS retains Vary, allowlist and credentials on cached and other responses", async () => {
  const env = parseEnv({ DATABASE_URL: "postgresql://localhost/test", JWT_SECRET_KEY: "test-only-secret-at-least-32-characters" });
  for (const vary of ["Accept-Encoding, Origin", "Origin", "Accept-Encoding", "Custom, Custom"]) {
    const app = new Hono();
    app.use("*", createCors(env));
    app.get("/", c => { c.header("Vary", vary); return c.text("cached"); });
    for (const origin of [env.CORS_ORIGINS[0] ?? "", "https://untrusted.invalid"]) {
      const res = await app.request("/", { headers: { Origin: origin } });
      expect(res.headers.get("Vary")).toBe([...new Set([...vary.split(/,\s*/), "Origin"])].join(", "));
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe(env.CORS_ORIGINS.includes(origin) ? origin : null);
      expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    }
  }
});
