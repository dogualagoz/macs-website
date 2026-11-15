import { expect, test } from "bun:test";
import { brotliDecompressSync, gunzipSync } from "node:zlib";
import { createApp } from "../app";
import { testDeps } from "../../test/helpers/app";
import request from "../../test/helpers/http";
import { route } from "../../test/helpers/native-route";
import { createResponseCache } from "./cache";
test("public cache negotiates compressed variants and consistent conditional responses", async () => {
  const deps = testDeps({ cache: createResponseCache({ enabled: true }) });
  let loads = 0;
  const app = createApp(deps, (app, d) => { route(app, d, { method: "get", path: "/cached", domain: "events", tag: "events", summary: "Cache", public: true, handler: () => { loads++; return Promise.resolve({ text: "a".repeat(2000) }); } }); });
  const identity = await request(app).get("/cached");
  for (const [encoding, decode] of [["gzip", gunzipSync], ["br", brotliDecompressSync]] as const) {
    const response = await request(app).get("/cached").set("Accept-Encoding", encoding);
    expect(response.headers["content-encoding"]).toBe(encoding);
    expect(response.headers.vary).toBe("Accept-Encoding, Origin");
    expect(decode(response.rawBytes).toString()).toBe(identity.text);
    expect(response.headers.etag).toBe(identity.headers.etag);
    const conditional = await request(app).get("/cached").set("Accept-Encoding", encoding).set("If-None-Match", identity.headers.etag ?? "");
    expect(conditional.status).toBe(304); expect(conditional.rawBytes.length).toBe(0);
  }
  const excluded = await request(app).get("/cached").set("Accept-Encoding", "br;q=0,gzip;q=0,identity;q=0,*;q=0");
  expect(excluded.headers["content-encoding"]).toBeUndefined(); expect(excluded.text).toBe(identity.text);
  expect(loads).toBe(1);
  deps.cache.stop(); await deps.sql.end();
});
