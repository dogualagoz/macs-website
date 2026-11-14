import { expect, test } from "bun:test";
import { parseDateTimeInput, pgToNaiveIso, pgToUtcIso, slugTimestamp } from "./datetime";

test.each([
  ["2026-05-01 11:00:00", "2026-05-01T11:00:00"],
  ["2026-05-01 11:00:00.5", "2026-05-01T11:00:00.500000"],
  ["2026-05-01T11:00:00", "2026-05-01T11:00:00"],
  ["2026-05-01T11:00:00.123456", "2026-05-01T11:00:00.123456"],
  [null, null],
])("pgToNaiveIso(%s) preserves wall time and microseconds", (input, expected) => {
  expect(pgToNaiveIso(input)).toBe(expected);
});

test.each([
  ["2026-05-01 11:00:00.123456+00", "2026-05-01T11:00:00.123456Z"],
  ["2026-05-01 11:00:00+00", "2026-05-01T11:00:00Z"],
  ["2026-05-01 11:00:00.12+00", "2026-05-01T11:00:00.120000Z"],
  ["2026-05-01T11:00:00.123456+00:00", "2026-05-01T11:00:00.123456Z"],
  ["2026-05-01T11:00:00Z", "2026-05-01T11:00:00Z"],
  [null, null],
])("pgToUtcIso(%s) handles text and json_agg formats", (input, expected) => {
  expect(pgToUtcIso(input)).toBe(expected);
});

test.each(["2026-05-01 14:00:00+03", "2026-05-01T14:00:00+03:00", "2026-05-01 11:00:00"])(
  "pgToUtcIso rejects non-UTC or missing offsets: %s", (input) => {
    expect(() => pgToUtcIso(input)).toThrow(RangeError);
  },
);

test.each([
  ["2026-05-01T10:00:00", "2026-05-01 10:00:00"],
  ["2026-05-01T10:00", "2026-05-01 10:00:00"],
  ["2026-05-01 10:00:00.250", "2026-05-01 10:00:00.250000"],
  ["2026-05-01T10:00:00Z", "2026-05-01 10:00:00"],
  ["2026-05-01T10:00:00+03:00", "2026-05-01 07:00:00"],
  ["2026-01-01T01:30:00+03:00", "2025-12-31 22:30:00"],
  ["2026-05-01", "2026-05-01 00:00:00"],
  ["2024-02-29T23:59:59.123456-02:30", "2024-03-01 02:29:59.123456"],
  ["0099-01-01T00:00:00", "0099-01-01 00:00:00"],
  ["2026-05-01T10:00:00.000000", "2026-05-01 10:00:00"],
])("parseDateTimeInput(%s) produces a naive UTC PG literal", (input, expected) => {
  expect(parseDateTimeInput(input)).toBe(expected);
});

test.each([
  "", "yarin", "2026-13-01T00:00:00", "2026-02-30T00:00:00", "2026-05-01T25:00:00",
  "2026-00-01", "2026-01-00", "2025-02-29", "2026-05-01T10:60:00",
  "2026-05-01T10:00:60", "2026-05-01T10:00:00+24:00", "2026-05-01T10:00:00+03:60",
  "2026-05-01T10:00:00junk", "0000-01-01", "2026-05-01T10:00:00\n",
])("parseDateTimeInput rejects invalid date %s", (input) => {
  expect(() => parseDateTimeInput(input)).toThrow(RangeError);
});

test("slugTimestamp uses UTC", () => {
  expect(slugTimestamp(new Date("2026-11-14T11:05:09+03:00"))).toBe("20261114-080509");
});
