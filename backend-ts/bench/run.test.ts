import { expect, test } from "bun:test";
import { once } from "node:events";
import { createServer } from "node:http";
import { probeCache } from "./run";

test.each([
  { headers: ["MISS", "MISS"], cached: false },
  { headers: ["MISS", "HIT"], cached: true },
  { headers: ["HIT", "HIT"], cached: true },
  { headers: [undefined, undefined], cached: false },
])("two-request cache probe observes $headers as $cached", async ({ headers, cached }) => {
  let requests = 0;
  const server = createServer((req, res) => {
    expect(req.url).toBe("/events?limit=100");
    expect(req.headers.authorization).toBeUndefined();
    const header = headers[requests++];
    if (header) res.setHeader("X-Cache", header);
    res.end("[]");
  });
  server.listen(0, "127.0.0.1");
  try {
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No test port");
    expect(await probeCache(`http://127.0.0.1:${address.port.toString()}/events?limit=100`)).toBe(cached);
    expect(requests).toBe(2);
  } finally { await new Promise<void>((resolve) => { server.close(() => { resolve(); }); }); }
});

test("cache probe rejects non-200 responses rather than asserting cache-off", async () => {
  const server = createServer((_req, res) => { res.statusCode = 429; res.end("limited"); });
  server.listen(0, "127.0.0.1");
  try {
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No test port");
    const error: unknown = await probeCache(`http://127.0.0.1:${address.port.toString()}/events`).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(Error);
    if (!(error instanceof Error)) throw new Error("Expected probe failure");
    expect(error.message).toContain("Cache probe HTTP 429");
  } finally { await new Promise<void>((resolve) => { server.close(() => { resolve(); }); }); }
});
