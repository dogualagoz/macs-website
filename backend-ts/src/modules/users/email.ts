import { domainToASCII } from "node:url";

const MAX_EMAIL_INPUT_LENGTH = 2048;
const EMAIL_MAX_BYTES = 254;
const LOCAL_PART_MAX_CHARS = 64;
const DNS_LABEL_MAX_BYTES = 63;
const DOMAIN_MAX_BYTES = 253;

// Pinned to python email-validator==2.2.0 SPECIAL_USE_DOMAIN_NAMES so addresses
// written via backend-ts always pass legacy FastAPI EmailStr response serialization.
export const SPECIAL_USE_DOMAIN_NAMES = [
  "arpa",
  "invalid",
  "local",
  "localhost",
  "onion",
  "test",
] as const;

const PRETTY_EMAIL_REGEX =
  /^\s*(?:((?:[\p{L}\p{N}_!#$%&'*+\-/=?^`{|}~]+\s+)*[\p{L}\p{N}_!#$%&'*+\-/=?^`{|}~]+)|"((?:[^"]|\\")+)")?\s*<(.+)>\s*$/u;
const ASCII_ATEXT_DOT = /^[a-zA-Z0-9_!#$%&'*+\-/=?^`{|}~.]+$/;
const HOSTNAME_LABEL = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
const INVALID_RLDH_LABEL = /^(?!xn)..--/i;
const VALID_DOMAIN_TLD_END = /[A-Za-z]$/;
const VALID_UNICODE_HOSTNAME_CHAR = /^[a-zA-Z0-9.\-\p{L}\p{N}\p{M}]$/u;

function hasUnsafeEmailChars(value: string): boolean {
  const chars = Array.from(value);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === undefined) continue;
    if (/[\p{C}\p{Z}]/u.test(ch)) return true;
    if (i === 0 && /\p{M}/u.test(ch)) return true;
  }
  return false;
}

function hasInvalidDotAtom(value: string): boolean {
  return value.startsWith(".") || value.endsWith(".") || value.includes("..");
}

function validateLocalPart(rawLocal: string): string | null {
  if (!rawLocal) return null;
  const local = rawLocal.normalize("NFC");
  if (Array.from(local).length > LOCAL_PART_MAX_CHARS) return null;
  if (hasUnsafeEmailChars(local) || hasInvalidDotAtom(local)) return null;
  if (!ASCII_ATEXT_DOT.test(local)) {
    for (const ch of local) {
      const code = ch.codePointAt(0) ?? 0;
      if (code < 0x80 && !ASCII_ATEXT_DOT.test(ch)) return null;
    }
  }
  return local;
}

function decodePunycodeDigit(code: number): number {
  if (code >= 0x30 && code <= 0x39) return code - 0x30 + 26;
  if (code >= 0x61 && code <= 0x7a) return code - 0x61;
  return -1;
}

function adaptBias(delta: number, numPoints: number, firstTime: boolean): number {
  let d = firstTime ? Math.trunc(delta / 700) : delta >> 1;
  d += Math.trunc(d / numPoints);
  let k = 0;
  while (d > 455) {
    d = Math.trunc(d / 35);
    k += 36;
  }
  return k + Math.trunc((36 * d) / (d + 38));
}

function decodePunycodeLabel(label: string): string | null {
  if (!label.startsWith("xn--")) return label;
  const input = label.slice(4);
  if (!input) return null;
  const delim = input.lastIndexOf("-");
  const output: number[] = [];
  if (delim >= 0) {
    for (let i = 0; i < delim; i++) {
      const cp = input.charCodeAt(i);
      if (cp >= 0x80) return null;
      output.push(cp);
    }
  }
  let n = 128;
  let i = 0;
  let bias = 72;
  let idx = delim >= 0 ? delim + 1 : 0;
  if (idx >= input.length) return null;
  while (idx < input.length) {
    const oldi = i;
    let w = 1;
    for (let k = 36; ; k += 36) {
      if (idx >= input.length) return null;
      const digit = decodePunycodeDigit(input.charCodeAt(idx++));
      if (digit < 0) return null;
      i += digit * w;
      const t = k <= bias ? 1 : k >= bias + 26 ? 26 : k - bias;
      if (digit < t) break;
      w *= 36 - t;
      if (w > 0x7fffffff) return null;
    }
    const len = output.length + 1;
    bias = adaptBias(i - oldi, len, oldi === 0);
    n += Math.trunc(i / len);
    i %= len;
    if (n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) return null;
    output.splice(i++, 0, n);
  }
  return String.fromCodePoint(...output);
}

function decodePunycodeDomain(asciiDomain: string): string | null {
  const labels = asciiDomain.split(".");
  const decodedLabels: string[] = [];
  for (const label of labels) {
    const decoded = decodePunycodeLabel(label);
    if (decoded === null) return null;
    decodedLabels.push(decoded);
  }
  const joined = decodedLabels.join(".");
  if (domainToASCII(joined).toLowerCase() !== asciiDomain) return null;
  return joined;
}

function validateDomainPart(rawDomain: string): { normalized: string; ascii: string } | null {
  if (!rawDomain || rawDomain.includes("[") || rawDomain.includes("]")) return null;
  if (hasUnsafeEmailChars(rawDomain)) return null;
  const dotNormalized = rawDomain.replace(/[\u3002\uff0e\uff61]/g, ".");
  for (const ch of dotNormalized) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x80 && !/^[a-zA-Z0-9.-]$/.test(ch)) return null;
  }

  const ascii = domainToASCII(dotNormalized).toLowerCase();
  if (!ascii || ascii.length > DOMAIN_MAX_BYTES) return null;
  if (hasInvalidDotAtom(ascii) || !ascii.includes(".")) return null;
  if (!VALID_DOMAIN_TLD_END.test(ascii)) return null;

  for (const label of ascii.split(".")) {
    if (!label || label.length > DNS_LABEL_MAX_BYTES) return null;
    if (!HOSTNAME_LABEL.test(label) || INVALID_RLDH_LABEL.test(label)) return null;
  }

  for (const reserved of SPECIAL_USE_DOMAIN_NAMES) {
    if (ascii === reserved || ascii.endsWith(`.${reserved}`)) return null;
  }

  const decoded = decodePunycodeDomain(ascii);
  if (!decoded) return null;
  for (const ch of decoded) {
    if (!VALID_UNICODE_HOSTNAME_CHAR.test(ch)) return null;
  }

  const isAsciiInput = /^[\x00-\x7f]+$/.test(dotNormalized);
  const normalized = isAsciiInput
    ? (ascii.includes("xn--") ? decoded.toLowerCase() : ascii)
    : dotNormalized.normalize("NFC").toLowerCase();
  return { normalized, ascii };
}

/**
 * Validate and normalize an email address with legacy Pydantic EmailStr /
 * email-validator 2.2.0 syntax parity (deliverability checks disabled).
 */
export function normalizeLegacyCompatibleEmail(raw: string): string | null {
  if (raw.length > MAX_EMAIL_INPUT_LENGTH) return null;
  const match = PRETTY_EMAIL_REGEX.exec(raw);
  const extracted = match?.[3] ?? raw;
  const trimmed = extracted.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0 || trimmed.indexOf("@", at + 1) !== -1) return null;

  const local = validateLocalPart(trimmed.slice(0, at));
  if (local === null) return null;

  const domain = validateDomainPart(trimmed.slice(at + 1));
  if (domain === null) return null;

  const normalized = `${local}@${domain.normalized}`;
  const asciiAddr = `${local}@${domain.ascii}`;
  if (
    Buffer.byteLength(normalized, "utf8") > EMAIL_MAX_BYTES ||
    Buffer.byteLength(asciiAddr, "utf8") > EMAIL_MAX_BYTES
  ) {
    return null;
  }
  return normalized;
}
