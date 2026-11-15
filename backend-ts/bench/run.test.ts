import { expect, test } from "bun:test";
import { probeCache } from "./run";

test.each([
  { headers: ["MISS", "MISS"], cached: false },
  { headers: ["MISS", "HIT"], cached: true },
  { headers: ["HIT", "HIT"], cached: true },
  { headers: [undefined, undefined], cached: false },
])("two-request cache probe observes $headers as $cached", async ({ headers, cached }) => {
  let requests = 0;
  const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch(req) {
    const url = new URL(req.url);
    expect(url.pathname + url.search).toBe("/events?limit=100");
    expect(req.headers.get("Authorization")).toBeNull();
    const header = headers[requests++];
    return new Response("[]", { headers: header ? { "X-Cache": header } : {} });
  } });
  try {
    const address = { port: server.port };
    expect(await probeCache(`http://127.0.0.1:${String(address.port)}/events?limit=100`)).toBe(cached);
    expect(requests).toBe(2);
  } finally { await server.stop(true); }
});

test("cache probe rejects non-200 responses rather than asserting cache-off", async () => {
  const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: () => new Response("limited", { status: 429 }) });
  try {
    const address = { port: server.port };
    const error: unknown = await probeCache(`http://127.0.0.1:${String(address.port)}/events`).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(Error);
    if (!(error instanceof Error)) throw new Error("Expected probe failure");
    expect(error.message).toContain("Cache probe HTTP 429");
  } finally { await server.stop(true); }
});
