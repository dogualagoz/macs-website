import { approvedDeviation } from "./deviations";
import type { RequestIdentity } from "./deviations";
import { normalize, normalizeZip, stableJson } from "./normalize";

export interface HttpResponseInput {
  status: number;
  headers: Headers;
  body: unknown;
}

export interface Comparison {
  equal: boolean;
  deviation: string | null;
  old: unknown;
  new: unknown;
}

export function compareResponses(r: RequestIdentity, old: HttpResponseInput, next: HttpResponseInput): Comparison {
  const body = (response: HttpResponseInput): unknown => {
    if (response.body instanceof Uint8Array) {
      const type = response.headers.get("content-type");
      return type?.includes("application/zip")
        ? { format: "zip", entries: normalizeZip(response.body) }
        : { format: type, bytes: Buffer.from(response.body).toString("base64") };
    }
    return normalize(r.path + (r.query.size ? `?${r.query}` : ""), response.body);
  };
  const a = body(old), b = body(next);
  const equal = old.status === next.status && stableJson(a) === stableJson(b);
  return { equal, deviation: equal ? null : approvedDeviation(r, old, next), old: a, new: b };
}

export function records(body: unknown, key?: string): Record<string, unknown>[] {
  const list: unknown = key && body !== null && typeof body === "object" ? (body as Record<string, unknown>)[key] : body;
  if (!Array.isArray(list)) throw new Error(`Catalogue discovery expected an array${key ? ` at ${key}` : ""}`);
  return list.map((item: unknown) => {
    if (item === null || typeof item !== "object" || !("id" in item) || typeof item.id !== "number") throw new Error("Catalogue discovery expected numeric IDs");
    return item;
  });
}
