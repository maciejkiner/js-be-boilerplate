import { hash, verify } from "@node-rs/argon2";

/** Hashowanie haseł (argon2id). Parametry domyślne biblioteki są bezpieczne. */
export function hashPassword(plain: string): Promise<string> {
  return hash(plain);
}

export async function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashed, plain);
  } catch {
    // uszkodzony/niekompatybilny hash — traktujemy jak niezgodność, nie wyciekamy błędu
    return false;
  }
}
