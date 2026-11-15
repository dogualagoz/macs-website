import type { AppRouter } from "../../src/app";
import { DEFAULT_SECURITY_CONFIG } from "../../src/security/config";
export interface TestResponse {
  status: number; headers: Record<string, string>; body: unknown; text: string; rawBytes: Buffer;
}
export async function requestTestApp(app: AppRouter, req: Request): Promise<TestResponse> {
  const response = await app.request(req, undefined, { socketIp: "127.0.0.1" });
  const rawBytes = Buffer.from(await response.arrayBuffer()); const text = rawBytes.toString();
  const type = response.headers.get("Content-Type") ?? "";
  const body = !response.headers.has("Content-Encoding") && type.includes("json") && text ? JSON.parse(text) as unknown : type.startsWith("text/") ? {} : rawBytes;
  return { status: response.status, headers: Object.fromEntries(response.headers), body, text, rawBytes };
}
class TestRequest implements PromiseLike<TestResponse> {
  private headers = new Headers(); private payload: BodyInit | undefined; private form: FormData | undefined;
  constructor(private app: AppRouter, private method: string, private path: string) {}
  set(name: string, value: string) { this.headers.set(name, value); return this; }
  auth(token: string, _opts: { type: "bearer" }) { return this.set("Authorization", `Bearer ${token}`); }
  type(type: string) { return this.set("Content-Type", type === "form" ? "application/x-www-form-urlencoded" : type); }
  send(value: object | string) {
    if (typeof value === "string") this.payload = value;
    else if (this.headers.get("Content-Type") === "application/x-www-form-urlencoded") this.payload = new URLSearchParams(value as Record<string, string>);
    else { this.payload = JSON.stringify(value); if (!this.headers.has("Content-Type")) this.type("application/json"); }
    return this;
  }
  attach(field: string, bytes: Buffer, name: string) { this.form ??= new FormData(); this.form.append(field, new File([new Uint8Array(bytes)], name)); return this; }
  field(name: string, value: string) { this.form ??= new FormData(); this.form.append(name, value); return this; }
  then<TResult1 = TestResponse, TResult2 = never>(resolve?: ((value: TestResponse) => TResult1 | PromiseLike<TResult1>) | null, reject?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2> {
    return requestTestApp(this.app, new Request(`http://localhost${this.path}`, { method: this.method, headers: this.headers, ...(this.form ?? this.payload ? { body: this.form ?? this.payload ?? null } : {}) })).then(resolve, reject);
  }
}
export default function request(app: AppRouter) {
  return { get: (p: string) => new TestRequest(app, "GET", p), post: (p: string) => new TestRequest(app, "POST", p), put: (p: string) => new TestRequest(app, "PUT", p), patch: (p: string) => new TestRequest(app, "PATCH", p), delete: (p: string) => new TestRequest(app, "DELETE", p), options: (p: string) => new TestRequest(app, "OPTIONS", p), head: (p: string) => new TestRequest(app, "HEAD", p) };
}
export function serveEphemeral(app: AppRouter) {
  return Bun.serve({ port: 0, hostname: "127.0.0.1", idleTimeout: DEFAULT_SECURITY_CONFIG.idleTimeoutSec, maxRequestBodySize: 64 * 1024 * 1024, fetch: (req, server) => app.fetch(req, { socketIp: server.requestIP(req)?.address }) });
}
