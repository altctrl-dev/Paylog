// import 'server-only'; // Commented out for seed script compatibility
import bcrypt from 'bcryptjs';

/**
 * Hash password with bcrypt
 * Cost factor: 12 (OWASP recommended, ~400ms per hash)
 * Balances security vs performance for production use
 */
export async function hashPassword(password: string): Promise<string> {
  const BCRYPT_COST = parseInt(process.env.BCRYPT_COST || '12', 10);
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
