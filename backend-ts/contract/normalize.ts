import { inflateRawSync } from "node:zlib";

const VOLATILE = new Set(["access_token", "last_login", "last_failed_login", "password_changed_at", "failed_login_attempts"]);
const UNORDERED = [/^\/events\/categories(?:\/\d+)?(?:\?|$)/, /^\/projects\/categories(?:\?|$)/, /^\/sponsors\/(?:\?|$)/, /^\/sponsors\/categories(?:\?|$)/, /^\/projects\/\d+\/members(?:\?|$)/, /^\/members\/\d+\/projects(?:\?|$)/];
export function stableJson(v: unknown): string {
  const result = JSON.stringify(v, (_key, x: unknown): unknown => x !== null && typeof x === "object" && !Array.isArray(x)
    ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x);
  return result;
}
export function normalize(path: string, body: unknown): unknown {
  const strip = (v: unknown, key?: string): unknown => {
    if (key !== undefined && VOLATILE.has(key)) return "<volatile>";
    if (Array.isArray(v)) return v.map((x: unknown) => strip(x));
    if (v !== null && typeof v === "object") {
      const o = v as Record<string, unknown>;
      // P4 approves removal of ctx/url only; msg/input remain contractual (F28).
      const entries = Array.isArray(o.loc) && typeof o.type === "string"
        ? Object.entries(o).filter(([k]) => k !== "ctx" && k !== "url") : Object.entries(o);
      return Object.fromEntries(entries.map(([k, x]) => [k, strip(x, k)]));
    }
    if (typeof v === "string" && key === "detail") return v.replace(/^(Token geçersiz veya süresi dolmuş): .*/, "$1").replace(/Hesap \d+ dakika/, "Hesap N dakika");
    return v;
  };
  let out = strip(body);
  const members = (p: unknown) => {
    if (p !== null && typeof p === "object" && "members" in p && Array.isArray(p.members)) p.members.sort((a: unknown, b: unknown) => stableJson(a).localeCompare(stableJson(b)));
  };
  if (out !== null && typeof out === "object") {
    const o = out as { projects?: unknown[] };
    (o.projects ?? (Array.isArray(out) ? out as unknown[] : [out])).forEach(members);
  }
  if (Array.isArray(out) && UNORDERED.some(r => r.test(path))) out = [...out as unknown[]].sort((a, b) => stableJson(a).localeCompare(stableJson(b)));
  return out;
}
// Compare ZIP entry names and uncompressed bytes, excluding archive timestamps,
// compression levels and download filenames. No extraction to the filesystem.
export function normalizeZip(bytes: Uint8Array): { name: string; data: string }[] {
  const b = Buffer.from(bytes);
  let end = -1;
  for (let candidate = b.length - 22; candidate >= Math.max(0, b.length - 65557); candidate--) {
    if (b.readUInt32LE(candidate) === 0x06054b50 && candidate + 22 + b.readUInt16LE(candidate + 20) === b.length) { end = candidate; break; }
  }
  if (end < 0 || b.length < 22) throw new Error("Invalid ZIP end record");
  if (b.readUInt16LE(end + 4) || b.readUInt16LE(end + 6)) throw new Error("Multi-disk ZIP is unsupported");
  const count = b.readUInt16LE(end + 10);
  let offset = b.readUInt32LE(end + 16);
  const result: { name: string; data: string }[] = [];
  for (let i = 0; i < count; i++) {
    if (b.readUInt32LE(offset) !== 0x02014b50) throw new Error("Invalid ZIP central directory");
    const flags = b.readUInt16LE(offset + 8);
    const method = b.readUInt16LE(offset + 10);
    const compressedSize = b.readUInt32LE(offset + 20);
    const size = b.readUInt32LE(offset + 24);
    const nameLength = b.readUInt16LE(offset + 28);
    const name = b.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    const local = b.readUInt32LE(offset + 42);
    if (flags & 1 || ![0, 8].includes(method) || b.readUInt32LE(local) !== 0x04034b50 || size > 50 * 1024 * 1024) throw new Error("Unsupported ZIP entry");
    const start = local + 30 + b.readUInt16LE(local + 26) + b.readUInt16LE(local + 28);
    const compressed = b.subarray(start, start + compressedSize);
    if (compressed.length !== compressedSize) throw new Error("Truncated ZIP entry");
    const data = method === 0 ? compressed : inflateRawSync(compressed, { maxOutputLength: 50 * 1024 * 1024 });
    if (data.length !== size) throw new Error("ZIP size mismatch");
    result.push({ name, data: data.toString("base64") });
    offset += 46 + nameLength + b.readUInt16LE(offset + 30) + b.readUInt16LE(offset + 32);
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}
