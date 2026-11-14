import { z } from "zod";
import { setPassword } from "../src/modules/users/service";
import { readPasswordFromStdin, runCli } from "./_cli";

await runCli(z.object({ email: z.email() }), async (db, env, args) => {
  const password = await readPasswordFromStdin();
  const user = await setPassword(db, env, args.email, password);
  return `password reset for ${user.email}`;
});
