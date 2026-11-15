import { expect, test } from "bun:test";
import { validateRequestHead } from "./request-guards";
import { DEFAULT_SECURITY_CONFIG } from "./config";
import { applySecurityHeaders } from "./headers";
import { resolveClientIp } from "./ip";

test("header byte limit matches TextEncoder for Unicode and Latin1 at exact boundary", () => {
  for (const value of ["plain", "é", "ÿ", "hello\tworld"]) {
    const req = new Request("http://localhost/members", { headers: { "x-test": value } });
    let bytes = 0;
    for (const [name, text] of req.headers) bytes += new TextEncoder().encode(name).length + new TextEncoder().encode(text).length + 4;
    expect(() => { validateRequestHead(req, "/members", { ...DEFAULT_SECURITY_CONFIG, maxHeaderBytes: bytes }); }).not.toThrow();
    expect(() => { validateRequestHead(req, "/members", { ...DEFAULT_SECURITY_CONFIG, maxHeaderBytes: bytes - 1 }); }).toThrow();
  }
});
test("static header reuse cannot leak docs CSP or HSTS to next response", () => {
  const docs = new Headers({ server: "private", "x-powered-by": "private" });
  applySecurityHeaders(docs, { isDocs: true, forwardedProto: "https" });
  const api = new Headers(docs);
  applySecurityHeaders(api, { isDocs: false });
  expect(api.get("Content-Security-Policy")).toBe("default-src 'none'; frame-ancestors 'none'");
  expect(api.has("Strict-Transport-Security")).toBe(false);
  expect(api.has("Server")).toBe(false);
  expect(api.has("X-Powered-By")).toBe(false);
  expect(docs.get("Content-Security-Policy")).toContain("script-src");
});
test("IP resolution preserves direct and trusted proxy behavior with or without real IP", () => {
  for (const ip of ["127.0.0.1", "::1", "203.0.113.1"]) expect(resolveClientIp(new Headers(), ip)).toBe(ip);
  expect(resolveClientIp(new Headers({ "x-real-ip": "198.51.100.1" }), "203.0.113.1")).toBe("203.0.113.1");
  expect(resolveClientIp(new Headers({ "x-real-ip": "198.51.100.1" }), "127.0.0.1")).toBe("198.51.100.1");
});
