import { expect, test } from "bun:test";
import { createDb } from "../../src/db/client";
import { captureQueries } from "../../bench/explain";

test("benchmark capture records exact SQL and bindings and restores debug on success and failure", async () => {
  const database = createDb(process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5436/macs_test");
  try {
    await database.sql`SELECT 1`;
    const debug = database.sql.options.debug;
    const captured = await captureQueries(database.sql, async () => {
      await database.sql`SELECT ${"audit-value"}::text AS value, ${42}::int AS number`;
    });
    expect(captured).toEqual([{ text: "SELECT $1::text AS value, $2::int AS number", params: ["audit-value", "42"] }]);
    expect(database.sql.options.debug).toBe(debug);
    const error: unknown = await captureQueries(database.sql, async () => { await database.sql`SELECT missing_audit_function()`; }).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(Error);
    if (!(error instanceof Error)) throw new Error("Expected capture to reject");
    expect(error.message).toContain("missing_audit_function");
    expect(database.sql.options.debug).toBe(debug);
  } finally { await database.sql.end({ timeout: 1 }); }
});
