/**
 * Secure Password Generator
 * Sprint 11 Phase 2: Server Actions & API
 */

import { randomBytes } from 'crypto';

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SPECIAL = '!@#$%^&*()_+-=[]{}|;:,.<>?';

/**
 * Generate a secure random password
 * @param length - Length of the password (default: 16)
 * @param options - Character set options
 * @returns Secure random password
 */
export function generateSecurePassword(
  length: number = 16,
  options: {
    includeLowercase?: boolean;
    includeUppercase?: boolean;
    includeNumbers?: boolean;
    includeSpecial?: boolean;
  } = {}
): string {
  const {
    includeLowercase = true,
    includeUppercase = true,
    includeNumbers = true,
    includeSpecial = true,
  } = options;

  // Build character set
  let charset = '';
  const requiredChars: string[] = [];

  if (includeLowercase) {
    charset += LOWERCASE;
    requiredChars.push(LOWERCASE[Math.floor(Math.random() * LOWERCASE.length)]);
  }
  if (includeUppercase) {
    charset += UPPERCASE;
    requiredChars.push(UPPERCASE[Math.floor(Math.random() * UPPERCASE.length)]);
  }
  if (includeNumbers) {
    charset += NUMBERS;
    requiredChars.push(NUMBERS[Math.floor(Math.random() * NUMBERS.length)]);
  }
  if (includeSpecial) {
    charset += SPECIAL;
    requiredChars.push(SPECIAL[Math.floor(Math.random() * SPECIAL.length)]);
  }

  if (charset.length === 0) {
    throw new Error('At least one character set must be enabled');
  }

  // Generate remaining characters using crypto.randomBytes for security
  const remainingLength = length - requiredChars.length;
  const randomChars: string[] = [];

  const bytes = randomBytes(remainingLength);
  for (let i = 0; i < remainingLength; i++) {
    const index = bytes[i] % charset.length;
    randomChars.push(charset[index]);
  }

  // Combine required chars with random chars and shuffle
  const allChars = [...requiredChars, ...randomChars];

  // Fisher-Yates shuffle
  for (let i = allChars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allChars[i], allChars[j]] = [allChars[j], allChars[i]];
  }

  return allChars.join('');
}

/**
 * Generate a memorable password using dictionary words
 * Format: Word1-Word2-1234
 * @returns Memorable password
 */
export function generateMemorablePassword(): string {
  const words = [
    'Ocean', 'Mountain', 'River', 'Forest', 'Desert',
    'Thunder', 'Lightning', 'Rainbow', 'Sunrise', 'Sunset',
    'Phoenix', 'Dragon', 'Tiger', 'Eagle', 'Wolf',
    'Crystal', 'Diamond', 'Ruby', 'Emerald', 'Sapphire',
    'Galaxy', 'Star', 'Moon', 'Comet', 'Meteor',
  ];

  const word1 = words[Math.floor(Math.random() * words.length)];
  const word2 = words[Math.floor(Math.random() * words.length)];
  const number = Math.floor(1000 + Math.random() * 9000); // 4-digit number

  return `${word1}-${word2}-${number}`;
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Strength score (0-4) and feedback
 */
export function validatePasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  else feedback.push('Password should be at least 8 characters long');

  if (password.length >= 12) score++;
  else if (password.length >= 8) feedback.push('Consider using 12+ characters for better security');

  // Character variety checks
  if (/[a-z]/.test(password)) score++;
  else feedback.push('Add lowercase letters');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Add uppercase letters');

  if (/\d/.test(password)) score++;
  else feedback.push('Add numbers');

  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else feedback.push('Add special characters');

  // Cap score at 4
  score = Math.min(4, score);

  if (score >= 3 && feedback.length === 0) {
    feedback.push('Strong password');
  }

  return { score, feedback };
}
