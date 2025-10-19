/**
 * Crypto utilities for CLI scripts
 * Standalone version without 'server-only' dependency
 */

import bcryptjs from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}
