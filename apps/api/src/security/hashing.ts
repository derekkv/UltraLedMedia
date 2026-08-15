import { hash, verify } from '@node-rs/argon2';

/** Hashea una contraseña con Argon2id (parámetros por defecto de @node-rs/argon2). */
export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

/** Verifica una contraseña contra su hash Argon2id. */
export function verifyPassword(hashed: string, password: string): Promise<boolean> {
  return verify(hashed, password);
}
