import { z } from "zod";
import { listUsers } from "../src/modules/users/service";
import type { UserResponse } from "../src/modules/users/schemas";
import { runCli } from "./_cli";

await runCli(z.object({ json: z.boolean().default(false) }), async (db, _env, args) => {
  const users: UserResponse[] = [];
  // Read every page rather than silently truncating an administrative listing.
  for (let skip = 0; ; skip += 100) {
    const page = await listUsers(db, skip, 100);
    users.push(...page.users);
    if (page.users.length < 100 || users.length >= page.total) break;
  }
  if (args.json) return JSON.stringify(users);
  return ["id  email  role  status  active  last_login", ...users.map(user =>
    [user.id, user.email, user.role, user.status, user.is_active, user.last_login ?? "-"].join("  "))].join("\n");
});
