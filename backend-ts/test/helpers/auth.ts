import { signAccessToken } from "../../src/lib/jwt";
import { TEST_JWT_SECRET } from "./app";

export function tokenFor(email: string, role: string): Promise<string> {
  return signAccessToken({ sub: email, role }, TEST_JWT_SECRET, 60, new Date());
}
