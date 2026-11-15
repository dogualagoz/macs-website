import { afterAll, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { events, users } from "../../src/db/schema";
import { pgToNaiveIso, pgToUtcIso } from "../../src/lib/datetime";
import { sqlBoolFalse, sqlIntZero, sqlNaiveIso, sqlUtcIso } from "../../src/lib/sql-json";
import { testDeps } from "../helpers/app";

const deps = testDeps();
afterAll(async () => {
  await deps.sql.end({ timeout: 1 });
});

describe("sql-json PG13 golden parity", () => {
  test.each([
    ["2026-05-01 11:00:00", "2026-05-01T11:00:00"],
    ["2026-05-01 11:00:00.5", "2026-05-01T11:00:00.500000"],
    ["2026-05-01 11:00:00.12", "2026-05-01T11:00:00.120000"],
    ["2026-05-01 11:00:00.123456", "2026-05-01T11:00:00.123456"],
    ["2026-05-01 11:00:00.000001", "2026-05-01T11:00:00.000001"],
    ["0099-01-01 00:00:00", "0099-01-01T00:00:00"],
  ])("sqlNaiveIso(%s) matches pgToNaiveIso -> %s", async (input, expected) => {
    const rows = await deps.db.execute<{ formatted: string | null; raw: string | null }>(sql`
      SELECT
        ${sqlNaiveIso(sql`${input}::timestamp`)}::text AS formatted,
        (${input}::timestamp)::text AS raw
    `);
    const row = rows[0];
    expect(row?.formatted).toBe(expected);
    expect(row?.formatted).toBe(pgToNaiveIso(row?.raw ?? null));
  });

  test("sqlNaiveIso maps NULL::timestamp to SQL NULL and JSON null", async () => {
    const rows = await deps.db.execute<{ formatted: string | null; json: string }>(sql`
      SELECT
        ${sqlNaiveIso(sql`NULL::timestamp`)}::text AS formatted,
        json_build_object('ts', ${sqlNaiveIso(sql`NULL::timestamp`)})::text AS json
    `);
    const row = rows[0];
    expect(row?.formatted).toBeNull();
    expect(row?.formatted).toBe(pgToNaiveIso(null));
    expect(JSON.parse(row?.json ?? "{}")).toEqual({ ts: null });
  });

  test.each([
    ["2026-05-01 11:00:00+00", "2026-05-01T11:00:00Z"],
    ["2026-05-01 11:00:00.5+00", "2026-05-01T11:00:00.500000Z"],
    ["2026-05-01 11:00:00.12+00", "2026-05-01T11:00:00.120000Z"],
    ["2026-05-01 11:00:00.123456+00", "2026-05-01T11:00:00.123456Z"],
    ["2026-05-01 11:00:00.000001+00", "2026-05-01T11:00:00.000001Z"],
    ["0099-01-01 00:00:00+00", "0099-01-01T00:00:00Z"],
  ])("sqlUtcIso(%s) matches pgToUtcIso -> %s", async (input, expected) => {
    const rows = await deps.db.execute<{ formatted: string | null; raw: string | null }>(sql`
      SELECT
        ${sqlUtcIso(sql`${input}::timestamptz`)}::text AS formatted,
        (${input}::timestamptz)::text AS raw
    `);
    const row = rows[0];
    expect(row?.formatted).toBe(expected);
    expect(row?.formatted).toBe(pgToUtcIso(row?.raw ?? null));
  });

  test("sqlUtcIso maps NULL::timestamptz to SQL NULL and JSON null", async () => {
    const rows = await deps.db.execute<{ formatted: string | null; json: string }>(sql`
      SELECT
        ${sqlUtcIso(sql`NULL::timestamptz`)}::text AS formatted,
        json_build_object('ts', ${sqlUtcIso(sql`NULL::timestamptz`)})::text AS json
    `);
    const row = rows[0];
    expect(row?.formatted).toBeNull();
    expect(row?.formatted).toBe(pgToUtcIso(null));
    expect(JSON.parse(row?.json ?? "{}")).toEqual({ ts: null });
  });

  test("sqlUtcIso and sqlNaiveIso are independent of non-UTC session TimeZone (Europe/Istanbul +03)", async () => {
    await deps.db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL TIME ZONE 'Europe/Istanbul'`);
      const rows = await tx.execute<{
        utc_typed: string | null;
        utc_untyped: string | null;
        utc_whole: string | null;
        utc_null: string | null;
        naive_untyped: string | null;
      }>(sql`
        SELECT
          ${sqlUtcIso(sql`'2026-05-01 14:00:00.5+03'::timestamptz`)}::text AS utc_typed,
          ${sqlUtcIso(sql`'2026-05-01 14:00:00.5+03'`)}::text AS utc_untyped,
          ${sqlUtcIso(sql`'2026-05-01 14:00:00+03'::timestamptz`)}::text AS utc_whole,
          ${sqlUtcIso(sql`NULL::timestamptz`)}::text AS utc_null,
          ${sqlNaiveIso(sql`'2026-05-01 11:00:00.12'`)}::text AS naive_untyped
      `);
      const row = rows[0];
      expect(row?.utc_typed).toBe("2026-05-01T11:00:00.500000Z");
      expect(row?.utc_untyped).toBe("2026-05-01T11:00:00.500000Z");
      expect(row?.utc_whole).toBe("2026-05-01T11:00:00Z");
      expect(row?.utc_null).toBeNull();
      expect(row?.naive_untyped).toBe("2026-05-01T11:00:00.120000");
    });
  });

  test("sqlBoolFalse and sqlIntZero coerce NULL to false and 0::int", async () => {
    const rows = await deps.db.execute<{ json: string }>(sql`
      SELECT json_build_object(
        'bool_null', ${sqlBoolFalse(sql`NULL::boolean`)},
        'bool_true', ${sqlBoolFalse(sql`true`)},
        'bool_false', ${sqlBoolFalse(sql`false`)},
        'int_null', ${sqlIntZero(sql`NULL::int`)},
        'int_val', ${sqlIntZero(sql`42`)}
      )::text AS json
    `);
    expect(JSON.parse(rows[0]?.json ?? "{}")).toEqual({
      bool_null: false,
      bool_true: true,
      bool_false: false,
      int_null: 0,
      int_val: 42,
    });
  });

  test("json_build_object round-trips Turkish UTF-8, quotes, backslashes, and newlines cleanly", async () => {
    const trickyText = 'ÇĞIİÖŞÜçğıiöşü — "tırnak", \\ters\\bölü\\ ve\nyeni\rsatır\tsekme';
    const rows = await deps.db.execute<{ json: string }>(sql`
      SELECT json_build_object(
        'text', ${trickyText}::text,
        'naive_ts', ${sqlNaiveIso(sql`'2026-05-01 11:00:00.5'::timestamp`)},
        'utc_ts', ${sqlUtcIso(sql`'2026-05-01 14:00:00.12+03'::timestamptz`)},
        'null_ts', ${sqlUtcIso(sql`NULL::timestamptz`)},
        'active', ${sqlBoolFalse(sql`NULL::boolean`)},
        'count', ${sqlIntZero(sql`NULL::int`)}
      )::text AS json
    `);
    expect(JSON.parse(rows[0]?.json ?? "{}")).toEqual({
      text: trickyText,
      naive_ts: "2026-05-01T11:00:00.500000",
      utc_ts: "2026-05-01T11:00:00.120000Z",
      null_ts: null,
      active: false,
      count: 0,
    });
  });

  test("helpers accept Drizzle AnyColumn references against live schema columns", async () => {
    const rows = await deps.db.execute<{
      json: string;
      raw_start: string | null;
      raw_end: string | null;
      raw_created: string | null;
      raw_updated: string | null;
    }>(sql`
      SELECT
        json_build_object(
          'start_time', ${sqlNaiveIso(events.startTime)},
          'end_time', ${sqlNaiveIso(events.endTime)},
          'created_at', ${sqlUtcIso(events.createdAt)},
          'updated_at', ${sqlUtcIso(events.updatedAt)},
          'is_active', ${sqlBoolFalse(events.isActive)},
          'failed_attempts', ${sqlIntZero(users.failedLoginAttempts)}
        )::text AS json,
        ${events.startTime}::text AS raw_start,
        ${events.endTime}::text AS raw_end,
        ${events.createdAt}::text AS raw_created,
        ${events.updatedAt}::text AS raw_updated
      FROM ${events}
      LEFT JOIN ${users} ON ${users.id} = ${events.createdBy}
      WHERE ${events.id} = 1
    `);
    const row = rows[0];
    expect(row).toBeDefined();
    expect(JSON.parse(row?.json ?? "{}")).toEqual({
      start_time: pgToNaiveIso(row?.raw_start ?? null),
      end_time: pgToNaiveIso(row?.raw_end ?? null),
      created_at: pgToUtcIso(row?.raw_created ?? null),
      updated_at: pgToUtcIso(row?.raw_updated ?? null),
      is_active: true,
      failed_attempts: 0,
    });
  });
});
