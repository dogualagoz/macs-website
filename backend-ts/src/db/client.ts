import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Sql = postgres.Sql;
export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export interface QueryCounter {
  count(): number;
  queries(): readonly string[];
  reset(): void;
}

export function createDb(url: string, opts?: { max?: number }): { db: Db; sql: Sql; counter: QueryCounter } {
  let statements: string[] = [];
  const counter: QueryCounter = {
    count: () => statements.length,
    queries: () => [...statements],
    reset: () => { statements = []; },
  };
  const sql = postgres(url, {
    max: opts?.max ?? 10,
    connect_timeout: 5,
    idle_timeout: 30,
    prepare: true,
    connection: { TimeZone: "UTC", statement_timeout: 10000 },
    types: {
      dateString: { to: 1184, from: [1114, 1184, 1082], serialize: (value: string) => value, parse: (value: string) => value },
    },
    debug: (_connection, query) => { statements.push(query); },
  });
  return { db: drizzle(sql, { schema }), sql, counter };
}
