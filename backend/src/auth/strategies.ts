import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection';
import { logger } from '../utils/logger';
import { AppConfig } from '../config/configValidator';

const log = logger.child('AuthStrategies');

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
  error?: string;
}

/**
 * Email/Password Registration
 */
export async function registerWithEmail(
  email: string,
  password: string,
  name: string,
  config: AppConfig
): Promise<AuthResult> {
  // Validate password against config rules
  const emailPwConfig = config.auth.methods.find((m) => m.type === 'email_password');
  const minLength = emailPwConfig?.passwordMinLength || 8;
  const requireUppercase = emailPwConfig?.requireUppercase || false;
  const requireNumber = emailPwConfig?.requireNumber || false;

  if (password.length < minLength) {
    return { success: false, error: `Password must be at least ${minLength} characters` };
  }
  if (requireUppercase && !/[A-Z]/.test(password)) {
    return { success: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (requireNumber && !/[0-9]/.test(password)) {
    return { success: false, error: 'Password must contain at least one number' };
  }

  // Check if user exists
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0) {
    return { success: false, error: 'An account with this email already exists' };
  }

  // Hash password and insert user
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const result = await db.query(
    `INSERT INTO users (email, password_hash, name, is_verified)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name`,
    [email.toLowerCase(), passwordHash, name, false]
  );

  log.info('User registered via email/password', { email });
  return {
    success: true,
    user: result.rows[0],
  };
}

/**
 * Email/Password Login
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const result = await db.query(
    'SELECT id, email, name, password_hash FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    return { success: false, error: 'Invalid email or password' };
  }

  const user = result.rows[0];

  if (!user.password_hash) {
    return { success: false, error: 'This account uses a different login method' };
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return { success: false, error: 'Invalid email or password' };
  }

  log.info('User logged in via email/password', { email });
  return {
    success: true,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

/**
 * Generate Magic Link token
 */
export async function generateMagicLink(
  email: string,
  config: AppConfig
): Promise<{ success: boolean; token?: string; error?: string }> {
  const magicConfig = config.auth.methods.find((m) => m.type === 'magic_link');
  const expiresInMinutes = magicConfig?.expiresInMinutes || 15;

  // Upsert user (create if not exists)
  let userId: string;
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);

  if (existing.rows.length === 0) {
    const newUser = await db.query(
      `INSERT INTO users (email, is_verified) VALUES ($1, false) RETURNING id`,
      [email.toLowerCase()]
    );
    userId = newUser.rows[0].id;
  } else {
    userId = existing.rows[0].id;
  }

  // Generate token
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  await db.query(
    `UPDATE users SET magic_link_token = $1, magic_link_expires = $2 WHERE id = $3`,
    [token, expiresAt, userId]
  );

  log.info('Magic link generated', { email, expiresInMinutes });
  return { success: true, token };
}

/**
 * Verify Magic Link token
 */
export async function verifyMagicLink(token: string): Promise<AuthResult> {
  const result = await db.query(
    `SELECT id, email, name FROM users
     WHERE magic_link_token = $1 AND magic_link_expires > NOW()`,
    [token]
  );

  if (result.rows.length === 0) {
    return { success: false, error: 'Invalid or expired magic link' };
  }

  const user = result.rows[0];

  // Clear the magic link token and verify the user
  await db.query(
    `UPDATE users SET magic_link_token = NULL, magic_link_expires = NULL, is_verified = true WHERE id = $1`,
    [user.id]
  );

  log.info('User verified via magic link', { email: user.email });
  return {
    success: true,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

/**
 * Store refresh token in sessions table.
 */
export async function storeRefreshToken(
  userId: string,
  refreshToken: string,
  expiresInDays: number = 30
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  await db.query(
    `INSERT INTO sessions (user_id, refresh_token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, refreshToken, expiresAt]
  );
}

/**
 * Validate refresh token from sessions table.
 */
export async function validateRefreshToken(
  refreshToken: string
): Promise<{ userId: string } | null> {
  const result = await db.query(
    `SELECT user_id FROM sessions
     WHERE refresh_token = $1 AND expires_at > NOW()`,
    [refreshToken]
  );
  return result.rows.length > 0 ? { userId: result.rows[0].user_id } : null;
}

/**
 * Revoke a refresh token.
 */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await db.query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);
}
