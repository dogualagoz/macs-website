import { z } from "zod";
import { pathInt, qInt, qStr } from "../../lib/validation";

export const passwordSchema = z.string().refine(value => Array.from(value).length >= 6, "Şifre en az 6 karakter olmalıdır");
export const userResponseSchema = z.object({
  email: z.string(), full_name: z.string(), id: z.number().int(), status: z.string(), role: z.string(), is_active: z.boolean(),
  last_login: z.string().nullable(), failed_login_attempts: z.number().int(), password_changed_at: z.string().nullable(),
});
export type UserResponse = z.infer<typeof userResponseSchema>;
export const userParamsSchema = z.object({ user_id: pathInt("user_id") });
export const profileQuerySchema = z.object({ full_name: qStr() });
export const listQuerySchema = z.object({ skip: qInt({ ge: 0, default: 0 }), limit: qInt({ ge: 1, le: 100, default: 10 }) });
export const passwordChangeSchema = z.object({ current_password: z.string(), new_password: passwordSchema, confirm_password: z.string() })
  .refine(value => Array.from(value.new_password).length < 6 || value.new_password === value.confirm_password, { path: ["confirm_password"], message: "Şifreler eşleşmiyor" });
const accessBoolean = z.preprocess(value => {
  if (typeof value === "string") {
    if (["true", "1", "on", "yes", "t", "y"].includes(value.toLowerCase())) return true;
    if (["false", "0", "off", "no", "f", "n"].includes(value.toLowerCase())) return false;
  }
  if (value === 1) return true;
  if (value === 0) return false;
  return value;
}, z.boolean());
export const accessSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).nullish(),
  role: z.enum(["admin", "moderator"]).nullish(), is_active: accessBoolean.nullish(),
}).transform(value => ({
  ...(value.status == null ? {} : { status: value.status }),
  ...(value.role == null ? {} : { role: value.role }),
  ...(value.is_active == null ? {} : { is_active: value.is_active }),
}));
