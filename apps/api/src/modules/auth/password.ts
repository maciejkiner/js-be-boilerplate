import { hash, verify } from "@node-rs/argon2";

/** Password hashing (argon2id). The library's defaults are safe. */
export function hashPassword(plain: string): Promise<string> {
  return hash(plain);
}

export async function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashed, plain);
  } catch {
    // a corrupted or incompatible hash — treated as a mismatch; we do not leak the error
    return false;
  }
}
