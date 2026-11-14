import { expect, test } from "bun:test";
import { z } from "zod";
import { bodyInt, dateTimeIn, pathInt, qBool, qInt, qStr, toFastApi422, validationError } from "./validation";

const run = (schema: z.ZodType, src: 'body'|'query'|'path', raw: unknown) => { const r = schema.safeParse(raw); return r.success ? [] : toFastApi422(r.error, src, raw); };
test('missing body field', () => { expect(run(z.object({ email: z.string() }), 'body', { x: 1 })).toEqual(
  [{ type: 'missing', loc: ['body', 'email'], msg: 'Field required', input: { x: 1 } }]); });
test('query int parsing', () => { expect(run(z.object({ limit: qInt({ ge: 1, le: 100, default: 10 }) }), 'query', { limit: 'abc' })).toEqual(
  [{ type: 'int_parsing', loc: ['query', 'limit'], msg: 'Input should be a valid integer, unable to parse string as an integer', input: 'abc' }]); });
test('query le bound', () => { expect(run(z.object({ limit: qInt({ ge: 1, le: 100 }) }), 'query', { limit: '1000000' })[0]).toEqual(
  { type: 'less_than_equal', loc: ['query', 'limit'], msg: 'Input should be less than or equal to 100', input: '1000000' }); });
test('query ge bound', () => { expect(run(z.object({ skip: qInt({ ge: 0 }) }), 'query', { skip: '-1' })[0]).toEqual(
  { type: 'greater_than_equal', loc: ['query', 'skip'], msg: 'Input should be greater than or equal to 0', input: '-1' }); });
test('qInt default + absent', () => { expect(z.object({ limit: qInt({ default: 10 }) }).parse({})).toEqual({ limit: 10 }); });
test('qInt rejects floats and blanks', () => { for (const v of ['1.5', '', ' ', '1e3']) expect(run(z.object({ a: qInt({}) }), 'query', { a: v })[0]?.type).toBe('int_parsing'); });
test('qBool', () => {
  const s = z.object({ b: qBool({ default: false }) });
  for (const v of ['true', 'True', '1', 'on', 'yes']) expect(s.parse({ b: v }).b).toBe(true);
  for (const v of ['false', '0', 'off', 'no']) expect(s.parse({ b: v }).b).toBe(false);
  expect(run(s, 'query', { b: 'maybe' })[0]).toEqual({ type: 'bool_parsing', loc: ['query', 'b'], msg: 'Input should be a valid boolean, unable to interpret input', input: 'maybe' });
});
test('enum', () => { expect(run(z.object({ status: z.enum(['all', 'upcoming', 'past']) }), 'query', { status: 'x' })[0]).toEqual(
  { type: 'enum', loc: ['query', 'status'], msg: "Input should be 'all', 'upcoming' or 'past'", input: 'x' }); });
test('string bounds', () => {
  expect(run(z.object({ name: z.string().min(2) }), 'body', { name: 'a' })[0]).toEqual({ type: 'string_too_short', loc: ['body', 'name'], msg: 'String should have at least 2 characters', input: 'a' });
  expect(run(z.object({ c: z.string().max(3) }), 'body', { c: 'abcd' })[0]?.msg).toBe('String should have at most 3 characters');
});
test('custom refine → value_error', () => { expect(run(z.object({ password: z.string().refine(v => v.length >= 6, 'Şifre en az 6 karakter olmalıdır') }), 'body', { password: '123' })[0]).toEqual(
  { type: 'value_error', loc: ['body', 'password'], msg: 'Value error, Şifre en az 6 karakter olmalıdır', input: '123' }); });
test('path int', () => { expect(run(z.object({ event_id: pathInt('event_id') }), 'path', { event_id: 'abc' })[0]).toEqual(
  { type: 'int_parsing', loc: ['path', 'event_id'], msg: 'Input should be a valid integer, unable to parse string as an integer', input: 'abc' }); });
test('nested array loc', () => { expect(run(z.object({ member_ids: z.array(z.object({ member_id: z.number().int() })) }), 'body', { member_ids: [{ member_id: 1 }, {}] })[0]?.loc).toEqual(['body', 'member_ids', 1, 'member_id']); });

test("qStr normalizes empty and absent values", () => {
  expect(qStr().parse("")).toBeUndefined();
  expect(qStr().parse(undefined)).toBeUndefined();
  expect(qStr().parse("macs")).toBe("macs");
});
test("query helpers reject non-scalar values", () => {
  for (const schema of [qStr(), qInt({}), qBool({})]) {
    expect(schema.safeParse(["1", "2"]).success).toBe(false);
  }
});
test("query defaults apply only when absent", () => {
  expect(qInt({}).parse(undefined)).toBeUndefined();
  expect(qBool({}).parse(undefined)).toBeUndefined();
  expect(qBool({ default: true }).parse(undefined)).toBe(true);
});
test("datetime input becomes a PostgreSQL literal", () => {
  expect(dateTimeIn().parse("2026-05-01T14:00:00.123456+03:00")).toBe("2026-05-01 11:00:00.123456");
  expect(run(z.object({ start_time: dateTimeIn() }), "body", { start_time: "invalid" })).toEqual([
    { type: "datetime_from_date_parsing", loc: ["body", "start_time"], msg: "Input should be a valid datetime or date", input: "invalid" },
  ]);
});
test("validationError stores items without double nesting", () => {
  const items = run(z.string(), "body", 1);
  expect(validationError(items).status).toBe(422);
  expect(validationError(items).detail).toEqual(items);
});
test("primitive type errors and missing query input", () => {
  expect(run(z.object({ a: z.string() }), "query", {})).toEqual([
    { type: "missing", loc: ["query", "a"], msg: "Field required", input: null },
  ]);
  expect(run(z.string(), "body", 1)).toEqual([
    { type: "string_type", loc: ["body"], msg: "Input should be a valid string", input: 1 },
  ]);
  expect(run(z.int(), "body", 1.5)[0]?.type).toBe("int_type");
  expect(run(z.email(), "body", "bad")[0]?.msg).toBe("value is not a valid email address");
});
test("bodyInt accepts integers and integer strings and rejects floats, text, and booleans", () => {
  const required = z.object({ id: bodyInt() });
  const optional = z.object({ category_id: bodyInt().nullish() });
  expect(required.parse({ id: 1 })).toEqual({ id: 1 });
  expect(required.parse({ id: "1" })).toEqual({ id: 1 });
  expect(required.parse({ id: " -42 " })).toEqual({ id: -42 });
  expect(optional.parse({})).toEqual({});
  expect(optional.parse({ category_id: null })).toEqual({ category_id: null });
  expect(optional.parse({ category_id: "1" })).toEqual({ category_id: 1 });
  expect(run(required, "body", { other: 1 })).toEqual([
    { type: "missing", loc: ["body", "id"], msg: "Field required", input: { other: 1 } },
  ]);
  for (const bad of ["1.5", "abc", "", " "]) {
    expect(run(optional, "body", { category_id: bad })).toEqual([
      { type: "int_parsing", loc: ["body", "category_id"], msg: "Input should be a valid integer, unable to parse string as an integer", input: bad },
    ]);
  }
  for (const bad of [true, false, 1.5]) {
    expect(run(optional, "body", { category_id: bad })).toEqual([
      { type: "int_type", loc: ["body", "category_id"], msg: "Input should be a valid integer", input: bad },
    ]);
  }
});
