import { z } from "zod";
import { parseDateTimeInput } from "./datetime";
import { HttpError } from "./http-error";

export interface FastApiErrorItem {
  type: string;
  loc: (string | number)[];
  msg: string;
  input: unknown;
}

const TYPE_MESSAGES: Readonly<Record<string, readonly [string, string]>> = {
  string: ["string_type", "Input should be a valid string"],
  number: ["float_type", "Input should be a valid number"],
  int: ["int_type", "Input should be a valid integer"],
  boolean: ["bool_type", "Input should be a valid boolean"],
  array: ["list_type", "Input should be a valid list"],
  object: ["model_attributes_type", "Input should be a valid dictionary or object to extract fields from"],
};
const walk = (raw: unknown, path: PropertyKey[]): unknown => path.reduce<unknown>(
  (value, key) => value !== null && typeof value === "object" ? (value as Record<PropertyKey, unknown>)[key] : undefined, raw,
);
const quoteList = (values: readonly unknown[]): string => {
  const quoted = values.map((value) => `'${String(value)}'`);
  return quoted.length < 2 ? quoted.join("") : `${quoted.slice(0, -1).join(", ")} or ${quoted[quoted.length - 1] ?? ""}`;
};

export function toFastApi422(err: z.ZodError, source: "body" | "query" | "path", raw: unknown): FastApiErrorItem[] {
  return err.issues.map((issue) => {
    const loc = [source, ...issue.path.map((key) => typeof key === "symbol" ? String(key) : key)];
    const value = walk(raw, issue.path);
    const py = (issue as { params?: { py?: { type: string; msg: string } } }).params?.py;
    if (py) return { ...py, loc, input: value };
    if (issue.code === "invalid_type" && value === undefined) {
      return { type: "missing", loc, msg: "Field required", input: source === "body" ? walk(raw, issue.path.slice(0, -1)) : null };
    }
    if (issue.code === "invalid_type") {
      const message = Object.hasOwn(TYPE_MESSAGES, issue.expected) ? TYPE_MESSAGES[issue.expected] : undefined;
      return { type: message?.[0] ?? "value_error", loc, msg: message?.[1] ?? issue.message, input: value };
    }
    if (issue.code === "too_small") return issue.origin === "string"
      ? { type: "string_too_short", loc, msg: `String should have at least ${String(issue.minimum)} character${issue.minimum === 1 ? "" : "s"}`, input: value }
      : { type: "greater_than_equal", loc, msg: `Input should be greater than or equal to ${String(issue.minimum)}`, input: value };
    if (issue.code === "too_big") return issue.origin === "string"
      ? { type: "string_too_long", loc, msg: `String should have at most ${String(issue.maximum)} character${issue.maximum === 1 ? "" : "s"}`, input: value }
      : { type: "less_than_equal", loc, msg: `Input should be less than or equal to ${String(issue.maximum)}`, input: value };
    if (issue.code === "invalid_value") return { type: "enum", loc, msg: `Input should be ${quoteList(issue.values)}`, input: value };
    if (issue.code === "invalid_format" && issue.format === "email") return { type: "value_error", loc, msg: "value is not a valid email address", input: value };
    return { type: "value_error", loc, msg: `Value error, ${issue.message}`, input: value };
  });
}

export const validationError = (items: FastApiErrorItem[]): HttpError => new HttpError(422, items);

function invalid(ctx: z.RefinementCtx, type: string, msg: string): never {
  ctx.addIssue({ code: "custom", params: { py: { type, msg } }, message: msg });
  return z.NEVER;
}

export const qInt = (options: { ge?: number; le?: number; default?: number }): z.ZodType<number | undefined> => {
  const schema = z.unknown().transform((value, ctx) => {
    if (value === undefined) return options.default;
    if (typeof value !== "string" || !/^[+-]?\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
      return invalid(ctx, "int_parsing", "Input should be a valid integer, unable to parse string as an integer");
    }
    const parsed = Number(value);
    if (options.ge !== undefined && parsed < options.ge) return invalid(ctx, "greater_than_equal", `Input should be greater than or equal to ${String(options.ge)}`);
    if (options.le !== undefined && parsed > options.le) return invalid(ctx, "less_than_equal", `Input should be less than or equal to ${String(options.le)}`);
    return parsed;
  });
  return options.default === undefined ? schema.optional() : schema.default(options.default);
};

export const qBool = (options: { default?: boolean }): z.ZodType<boolean | undefined> => {
  const schema = z.unknown().transform((value, ctx) => {
    if (value === undefined) return options.default;
    if (typeof value === "string") {
      if (["true", "1", "on", "yes"].includes(value.toLowerCase())) return true;
      if (["false", "0", "off", "no"].includes(value.toLowerCase())) return false;
    }
    return invalid(ctx, "bool_parsing", "Input should be a valid boolean, unable to interpret input");
  });
  return options.default === undefined ? schema.optional() : schema.default(options.default);
};

export const qStr = (): z.ZodType<string | undefined> => z.string().optional().transform((value) => value === "" ? undefined : value);
export const pathInt = (_name: string): z.ZodType<number> => qInt({}).transform((value, ctx) =>
  value === undefined ? invalid(ctx, "missing", "Field required") : value,
);
export const dateTimeIn = (): z.ZodType<string> => z.string().transform((value, ctx) => {
  try { return parseDateTimeInput(value); }
  catch { return invalid(ctx, "datetime_from_date_parsing", "Input should be a valid datetime or date"); }
});
