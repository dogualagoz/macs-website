import { z } from "zod";
import { emailSchema } from "../src/modules/users/schemas";
import { setPassword } from "../src/modules/users/service";
import { readPasswordFromStdin, runCli } from "./_cli";

await runCli(z.object({ email: emailSchema }), async (db, env, args) => {
  const password = await readPasswordFromStdin();
  const user = await setPassword(db, env, args.email, password);
  return `password reset for ${user.email}`;
});
