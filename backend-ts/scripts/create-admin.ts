import { z } from "zod";
import { createUser } from "../src/modules/users/service";
import { readPasswordFromStdin, runCli } from "./_cli";

await runCli(z.object({ email: z.email(), full_name: z.string().trim().min(1) }), async (db, env, args) => {
  const password = await readPasswordFromStdin();
  const user = await createUser(db, env, { ...args, password, role: "admin", status: "approved" });
  return `created admin id=${user.id.toString()} email=${user.email}`;
});
