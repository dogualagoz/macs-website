import { z } from "zod";
import { emailSchema, passwordSchema } from "../users/schemas";

export const registerSchema = z.object({
  email: emailSchema,
  full_name: z.string(), password: passwordSchema,
});
export const adminRegisterSchema = registerSchema.extend({ admin_secret: z.string() });
const requiredFormString = z.string().refine(value => value !== "", {
  message: "Field required", params: { py: { type: "missing", msg: "Field required" } },
});
export const loginSchema = z.object({ username: requiredFormString, password: requiredFormString });
export const tokenSchema = z.object({ access_token: z.string(), token_type: z.literal("bearer") });
