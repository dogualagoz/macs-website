import { z } from "zod";
import { emailSchema } from "../src/modules/users/schemas";
import { HttpError } from "../src/lib/http-error";
import { findUserByEmail } from "../src/modules/users/repo";
import { setAccess } from "../src/modules/users/service";
import { runCli } from "./_cli";

const schema = z.object({
  email: emailSchema,
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  role: z.enum(["admin", "moderator"]).optional(),
  active: z.enum(["true", "false"]).transform(value => value === "true").optional(),
}).refine(args => args.status !== undefined || args.role !== undefined || args.active !== undefined,
  { message: "at least one of status, role, active is required" });

await runCli(schema, async (db, _env, args) => {
  const row = await findUserByEmail(db, args.email);
  if (!row) throw new HttpError(404, "Kullanıcı bulunamadı");
  const user = await setAccess(db, row.id, {
    ...(args.status === undefined ? {} : { status: args.status }),
    ...(args.role === undefined ? {} : { role: args.role }),
    ...(args.active === undefined ? {} : { is_active: args.active }),
  });
  return `updated ${user.email}: status=${user.status} role=${user.role} is_active=${String(user.is_active)}`;
});
