import { expect, test } from "bun:test";
import { z } from "zod";
import { bodyBool, bodyFloat, bodyInt, dateTimeIn, pathInt, qBool, qInt, qStr, toFastApi422, validationError } from "./validation";

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
test("bodyInt matches Pydantic 2.11.7 lax int accept, reject, and error-type table", () => {
  const required = z.object({ id: bodyInt() });
  const optional = z.object({ category_id: bodyInt().nullish() });
  const accepted: readonly [unknown, number][] = [
    [1, 1], [0, 0], [-42, -42], [1.0, 1], [-0.0, 0], [true, 1], [false, 0],
    [9007199254740991, 9007199254740991], [-9007199254740991, -9007199254740991],
    ["1", 1], ["+2", 2], ["-3", -3], [" 1 ", 1], [" -42 ", -42], ["-0", 0], ["-0.0", 0],
    ["1.0", 1], ["1.000", 1], ["+1.0", 1], ["-2.00", -2],
    ["1_000", 1000], [" 1_000 ", 1000], ["1_000.0", 1000], ["1_000.000", 1000],
    ["9007199254740991", 9007199254740991], ["-9007199254740991", -9007199254740991],
  ];
  for (const [input, expected] of accepted) {
    expect(required.parse({ id: input })).toEqual({ id: expected });
    expect(optional.parse({ category_id: input })).toEqual({ category_id: expected });
  }
  expect(optional.parse({})).toEqual({});
  expect(optional.parse({ category_id: null })).toEqual({ category_id: null });
  expect(run(required, "body", { other: 1 })).toEqual([
    { type: "missing", loc: ["body", "id"], msg: "Field required", input: { other: 1 } },
  ]);
  for (const bad of [1.5, -1.5]) {
    expect(run(optional, "body", { category_id: bad })).toEqual([
      { type: "int_from_float", loc: ["body", "category_id"], msg: "Input should be a valid integer, got a number with a fractional part", input: bad },
    ]);
  }
  for (const bad of [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN]) {
    expect(run(optional, "body", { category_id: bad })).toEqual([
      { type: "finite_number", loc: ["body", "category_id"], msg: "Input should be a finite number", input: bad },
    ]);
  }
  for (const bad of ["1.5", "1.05", "1_000.0_0", "1_", "_1", "1__0", "+_1", "-_1", "1_.0", "1._0", "1.", ".0", "1e3", "1e0", "abc", "", " "]) {
    expect(run(optional, "body", { category_id: bad })).toEqual([
      { type: "int_parsing", loc: ["body", "category_id"], msg: "Input should be a valid integer, unable to parse string as an integer", input: bad },
    ]);
  }
  expect(run(required, "body", { id: null })).toEqual([
    { type: "int_type", loc: ["body", "id"], msg: "Input should be a valid integer", input: null },
  ]);
  for (const bad of [[], {}]) {
    expect(run(optional, "body", { category_id: bad })).toEqual([
      { type: "int_type", loc: ["body", "category_id"], msg: "Input should be a valid integer", input: bad },
    ]);
  }
});

test("intentional int4 safety deviation: reject integers beyond Number.MAX_SAFE_INTEGER (Pydantic accepts; old DB writes fail)", () => {
  const schema = z.object({ category_id: bodyInt().nullish() });
  expect(run(schema, "body", { category_id: "999999999999999999999" })).toEqual([
    { type: "int_parsing", loc: ["body", "category_id"], msg: "Input should be a valid integer, unable to parse string as an integer", input: "999999999999999999999" },
  ]);
  expect(run(schema, "body", { category_id: 9007199254740992 })).toEqual([
    { type: "int_type", loc: ["body", "category_id"], msg: "Input should be a valid integer", input: 9007199254740992 },
  ]);
});

test("bodyBool matches Pydantic lax aliases, defaults, nullability and error types", () => {
  const schema = z.object({ flag: bodyBool() });
  for (const input of [true, 1, "1", "true", "TRUE", "on", "YES", "t", "y"]) expect(schema.parse({ flag: input })).toEqual({ flag: true });
  for (const input of [false, 0, "0", "false", "FALSE", "off", "NO", "f", "n"]) expect(schema.parse({ flag: input })).toEqual({ flag: false });
  for (const input of [2, -1, "maybe", "1.0", " true "]) expect(run(schema, "body", { flag: input })).toEqual([
    { type: "bool_parsing", loc: ["body", "flag"], msg: "Input should be a valid boolean, unable to interpret input", input },
  ]);
  for (const input of [null, [], {}, 1.5]) expect(run(schema, "body", { flag: input })).toEqual([
    { type: "bool_type", loc: ["body", "flag"], msg: "Input should be a valid boolean", input },
  ]);
  expect(run(schema, "body", {})).toEqual([{ type: "missing", loc: ["body", "flag"], msg: "Field required", input: {} }]);
  expect(z.object({ flag: bodyBool().default(true) }).parse({})).toEqual({ flag: true });
  expect(z.object({ flag: bodyBool().nullish() }).parse({ flag: null })).toEqual({ flag: null });
});

test("bodyFloat matches Pydantic coordinate parsing and bounded error types", () => {
  const schema = z.object({ latitude: bodyFloat({ ge: -90, le: 90 }).nullish() });
  for (const [input, expected] of [[41.5, 41.5], [" 41.5 ", 41.5], ["1e1", 10], ["1_0.5", 10.5], ["1_.0", 1], ["1._0", 1], ["+.5", 0.5], ["1.", 1], [true, 1], [false, 0], [-90, -90], [90, 90]] as const) {
    expect(schema.parse({ latitude: input })).toEqual({ latitude: expected });
  }
  for (const input of ["abc", "0x1", "", " ", "1__0", "_1", "1_"]) expect(run(schema, "body", { latitude: input })).toEqual([
    { type: "float_parsing", loc: ["body", "latitude"], msg: "Input should be a valid number, unable to parse string as a number", input },
  ]);
  for (const input of [[], {}]) expect(run(schema, "body", { latitude: input })).toEqual([
    { type: "float_type", loc: ["body", "latitude"], msg: "Input should be a valid number", input },
  ]);
  for (const input of [91, "NaN", "inf", "Infinity"]) expect(run(schema, "body", { latitude: input })).toEqual([
    { type: "less_than_equal", loc: ["body", "latitude"], msg: "Input should be less than or equal to 90", input },
  ]);
  for (const input of [-91, "-inf"]) expect(run(schema, "body", { latitude: input })).toEqual([
    { type: "greater_than_equal", loc: ["body", "latitude"], msg: "Input should be greater than or equal to -90", input },
  ]);
  expect(schema.parse({})).toEqual({}); expect(schema.parse({ latitude: null })).toEqual({ latitude: null });
});

test("qBool accepts Pydantic single-letter query aliases", () => {
  for (const input of ["t", "T", "y", "Y"]) expect(qBool({}).parse(input)).toBe(true);
  for (const input of ["f", "F", "n", "N"]) expect(qBool({}).parse(input)).toBe(false);
});
