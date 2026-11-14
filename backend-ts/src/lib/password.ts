export async function hashPassword(plain: string): Promise<string> {
  const bytes = Buffer.from(plain, "utf8").subarray(0, 72);
  return Bun.password.hash(bytes, { algorithm: "bcrypt", cost: 12 });
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false;
  try {
    const bytes = Buffer.from(plain, "utf8").subarray(0, 72);
    return await Bun.password.verify(bytes, hash, "bcrypt");
  } catch {
    return false;
  }
}
