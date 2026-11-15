interface DateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  fraction: string;
  offset: string;
  literal: string;
}

function readDateTime(input: string): DateTimeParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?(Z|[+-]\d{2}(?::?\d{2})?)?)?$/.exec(input);
  if (!match) throw new RangeError("Invalid datetime");
  const [, yyyy = "", mm = "", dd = "", hh = "00", min = "00", sec = "00", micros = "", offset = ""] = match;
  const year = Number(yyyy);
  const month = Number(mm);
  const day = Number(dd);
  const hour = Number(hh);
  const minute = Number(min);
  const second = Number(sec);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
  if (year < 1 || day < 1 || day > daysInMonth || hour > 23 || minute > 59 || second > 59) {
    throw new RangeError("Invalid datetime");
  }
  const fraction = Number(micros) === 0 ? "" : `.${micros.padEnd(6, "0")}`;
  return { year, month, day, hour, minute, second, fraction, offset, literal: `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}` };
}

export function pgToNaiveIso(value: string | null): string | null {
  if (value === null) return null;
  const parts = readDateTime(value);
  if (parts.offset !== "") throw new RangeError("Expected a naive timestamp");
  return parts.literal.replace(" ", "T") + parts.fraction;
}

export function pgToUtcIso(value: string | null): string | null {
  if (value === null) return null;
  const parts = readDateTime(value);
  if (!["Z", "+00", "+0000", "+00:00"].includes(parts.offset)) {
    throw new RangeError("Expected a UTC timestamp; configure the database connection timezone to UTC");
  }
  return parts.literal.replace(" ", "T") + parts.fraction + "Z";
}

export function parseDateTimeInput(value: string): string {
  const parts = readDateTime(value);
  if (parts.offset === "" || parts.offset === "Z") return parts.literal + parts.fraction;
  const offset = parts.offset.replace(":", "");
  const hours = Number(offset.slice(1, 3));
  const minutes = Number(offset.slice(3) || "0");
  if (hours > 23 || minutes > 59) throw new RangeError("Invalid timezone offset");
  const date = new Date(0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(parts.hour, parts.minute, parts.second, 0);
  const direction = offset.startsWith("+") ? 1 : -1;
  date.setTime(date.getTime() - direction * (hours * 60 + minutes) * 60_000);
  if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) throw new RangeError("Datetime out of range");
  return date.toISOString().slice(0, 19).replace("T", " ") + parts.fraction;
}

export function slugTimestamp(now: Date): string {
  return now.toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "-");
}
