import { sql } from "drizzle-orm";
import type { AnyColumn, SQL, SQLWrapper } from "drizzle-orm";

export function sqlNaiveIso(column: SQLWrapper | AnyColumn): SQL<string | null> {
  const ts = sql`(${column}::timestamp)`;
  return sql<string | null>`CASE
    WHEN ${column} IS NULL THEN NULL
    WHEN date_trunc('second', ${ts}) = ${ts}
      THEN to_char(${ts}, 'YYYY-MM-DD"T"HH24:MI:SS')
    ELSE to_char(${ts}, 'YYYY-MM-DD"T"HH24:MI:SS.US')
  END`;
}

export function sqlUtcIso(column: SQLWrapper | AnyColumn): SQL<string | null> {
  const utc = sql`(${column}::timestamptz AT TIME ZONE 'UTC')`;
  return sql<string | null>`CASE
    WHEN ${column} IS NULL THEN NULL
    WHEN date_trunc('second', ${utc}) = ${utc}
      THEN to_char(${utc}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ELSE to_char(${utc}, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
  END`;
}

export function sqlBoolFalse(column: SQLWrapper | AnyColumn): SQL<boolean> {
  return sql<boolean>`coalesce(${column}, false)`;
}

export function sqlIntZero(column: SQLWrapper | AnyColumn): SQL<number> {
  return sql<number>`coalesce(${column}, 0)::int`;
}
