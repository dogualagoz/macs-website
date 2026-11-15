import { isIP } from "node:net";

function trustedSocket(ip: string): boolean {
  if (ip === "::1") return true;
  const v4 = ip.toLowerCase().startsWith("::ffff:") ? ip.slice(7) : ip;
  if (isIP(v4) !== 4) return false;
  const [a, b] = v4.split(".").map(Number);
  return a === 127 || a === 10 || (a === 172 && b !== undefined && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export function resolveClientIp(headers: Headers, socketIp: string | undefined): string {
  const real = headers.get("X-Real-IP");
  if ((socketIp === undefined || trustedSocket(socketIp)) && real !== null && isIP(real) !== 0) return real;
  return socketIp !== undefined && isIP(socketIp) !== 0 ? socketIp : "unknown";
}
