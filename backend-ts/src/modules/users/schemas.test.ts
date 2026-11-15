import { describe, expect, test } from "bun:test";
import { z } from "zod";
import probe from "../../../test/fixtures/email-validator-probe.json";
import { toFastApi422 } from "../../lib/validation";
import { adminRegisterSchema, registerSchema } from "../auth/schemas";
import { emailSchema } from "./schemas";

const emailBodySchema = z.object({ email: emailSchema });

describe("emailSchema legacy EmailStr parity", () => {
  test.each(probe.cases)(
    "matches pydantic EmailStr / email-validator 2.2.0 for $input",
    ({ input, accepted, normalized }) => {
      const result = emailSchema.safeParse(input);
      expect(result.success).toBe(accepted);
      if (accepted) {
        if (normalized === null) throw new Error("Expected normalized email");
        expect(result.data).toBe(normalized);
      } else {
        const bodyResult = emailBodySchema.safeParse({ email: input });
        expect(bodyResult.success).toBe(false);
        if (!bodyResult.success) {
          const formatted = toFastApi422(bodyResult.error, "body", { email: input });
          expect(formatted[0]).toMatchObject({ type: "value_error", loc: ["body", "email"], input });
          expect(formatted[0]?.msg).toContain("value is not a valid email address");
        }
      }
    },
  );

  test("registerSchema, adminRegisterSchema, and CLI share emailSchema parity", () => {
    for (const invalid of ["user@foo.test", "user@foo.local", "user@localhost", "\"quoted\"@gmail.com", "user@[127.0.0.1]"]) {
      expect(registerSchema.safeParse({ email: invalid, full_name: "Test", password: "password123" }).success).toBe(false);
      expect(adminRegisterSchema.safeParse({ email: invalid, full_name: "Test", password: "password123", admin_secret: "sec" }).success).toBe(false);
    }
    const ok = registerSchema.safeParse({ email: "MixedLocal@Example.COM", full_name: "Test", password: "password123" });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.email).toBe("MixedLocal@example.com");
      // Rollback regression: any normalized email produced by emailSchema must be accepted by old EmailStr rules.
      expect(emailSchema.safeParse(ok.data.email).success).toBe(true);
    }
  });
});
