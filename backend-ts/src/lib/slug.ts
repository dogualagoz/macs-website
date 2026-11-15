import { slugTimestamp } from "./datetime";

const MAP: Record<string, string> = {
  "ı": "i", "İ": "I", "ß": "ss", "æ": "ae", "Æ": "AE", "œ": "oe", "Œ": "OE", "ø": "o", "Ø": "O",
  "ł": "l", "Ł": "L", "đ": "d", "Đ": "D", "þ": "th", "Þ": "Th", "ð": "d", "Ð": "D", "€": "EUR",
  "’": "'", "‘": "'", "“": '"', "”": '"', "–": "-", "—": "-",
  "№": "No. ",
};

export function transliterate(value: string): string {
  let out = "";
  for (const char of value) {
    const mapped = MAP[char];
    if (mapped !== undefined) {
      out += mapped;
      continue;
    }
    out += char.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x00-\x7f]/g, " ");
  }
  return out;
}

export const createSlug = (title: string): string =>
  transliterate(title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const resolveSlug = (base: string, taken: boolean, now: Date): string =>
  base === "" ? slugTimestamp(now) : taken ? `${base}-${slugTimestamp(now)}` : base;
