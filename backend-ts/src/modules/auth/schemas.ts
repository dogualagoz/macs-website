import { z } from "zod";
import { passwordSchema } from "../users/schemas";

export const registerSchema = z.object({
  email: z.email().transform(value => { const at = value.lastIndexOf("@"); return value.slice(0, at + 1) + value.slice(at + 1).toLowerCase(); }),
  full_name: z.string(), password: passwordSchema,
});
export const adminRegisterSchema = registerSchema.extend({ admin_secret: z.string() });
const requiredFormString = z.string().refine(value => value !== "", {
  message: "Field required", params: { py: { type: "missing", msg: "Field required" } },
});
export const loginSchema = z.object({ username: requiredFormString, password: requiredFormString });
export const tokenSchema = z.object({ access_token: z.string(), token_type: z.literal("bearer") });
