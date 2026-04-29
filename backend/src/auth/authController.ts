import { Router, Request, Response } from 'express';
import { asyncHandler, ValidationError } from '../utils/errorHandler';
import {
  authMiddleware,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from './authMiddleware';
import {
  registerWithEmail,
  loginWithEmail,
  generateMagicLink,
  verifyMagicLink,
  storeRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
} from './strategies';
import { configLoader } from '../config/configLoader';
import { db } from '../database/connection';
import { logger } from '../utils/logger';
import nodemailer from 'nodemailer';

const log = logger.child('AuthController');

/**
 * Creates auth routes dynamically based on the config.
 * Supports email/password and magic link methods.
 */
export function createAuthRouter(): Router {
  const router = Router();
  const config = configLoader.getConfig();

  if (!config.auth.enabled) {
    log.info('Auth is disabled in config');
    return router;
  }

  const emailPwEnabled = config.auth.methods.some(
    (m) => m.type === 'email_password' && m.enabled
  );
  const magicLinkEnabled = config.auth.methods.some(
    (m) => m.type === 'magic_link' && m.enabled
  );

  // ── Email/Password Registration ──────────────────────────────────────
  if (emailPwEnabled) {
    router.post(
      '/register',
      asyncHandler(async (req: Request, res: Response) => {
        const { email, password, name } = req.body;

        if (!email || !password) {
          throw new ValidationError('Email and password are required');
        }

        const result = await registerWithEmail(email, password, name || '', config);

        if (!result.success) {
          throw new ValidationError(result.error || 'Registration failed');
        }

        const accessToken = generateAccessToken({
          userId: result.user!.id,
          email: result.user!.email,
        });

        const refreshToken = generateRefreshToken({
          userId: result.user!.id,
          email: result.user!.email,
        });

        await storeRefreshToken(result.user!.id, refreshToken);

        res.status(201).json({
          success: true,
          data: {
            user: result.user,
            accessToken,
            refreshToken,
          },
        });
      })
    );

    // ── Email/Password Login ─────────────────────────────────────────────
    router.post(
      '/login',
      asyncHandler(async (req: Request, res: Response) => {
        const { email, password } = req.body;

        if (!email || !password) {
          throw new ValidationError('Email and password are required');
        }

        const result = await loginWithEmail(email, password);

        if (!result.success) {
          throw new ValidationError(result.error || 'Login failed');
        }

        const accessToken = generateAccessToken({
          userId: result.user!.id,
          email: result.user!.email,
        });

        const refreshToken = generateRefreshToken({
          userId: result.user!.id,
          email: result.user!.email,
        });

        await storeRefreshToken(result.user!.id, refreshToken);

        res.json({
          success: true,
          data: {
            user: result.user,
            accessToken,
            refreshToken,
          },
        });
      })
    );
  }

  // ── Magic Link ──────────────────────────────────────────────────────
  if (magicLinkEnabled) {
    router.post(
      '/magic-link',
      asyncHandler(async (req: Request, res: Response) => {
        const { email } = req.body;

        if (!email) {
          throw new ValidationError('Email is required');
        }

        const result = await generateMagicLink(email, config);

        if (!result.success) {
          throw new ValidationError(result.error || 'Failed to generate magic link');
        }

        // Send email with magic link
        try {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          const magicUrl = `${frontendUrl}/auth/verify?token=${result.token}`;

          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '2525', 10),
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          });

          await transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@app.com',
            to: email,
            subject: `Sign in to ${config.app.name}`,
            html: `
              <h2>Sign in to ${config.app.name}</h2>
              <p>Click the link below to sign in:</p>
              <a href="${magicUrl}" style="
                display: inline-block;
                padding: 12px 24px;
                background-color: ${config.app.theme.primaryColor};
                color: white;
                text-decoration: none;
                border-radius: 8px;
              ">Sign In</a>
              <p>This link expires in 15 minutes.</p>
              <p>If you didn't request this, you can safely ignore this email.</p>
            `,
          });

          log.info('Magic link email sent', { email });
        } catch (err) {
          log.warn('Failed to send magic link email. Token still generated.', {
            error: err instanceof Error ? err.message : String(err),
          });
        }

        // Always return success — don't leak whether the email exists
        res.json({
          success: true,
          message: 'If an account exists for that email, a magic link has been sent.',
          // Include token in dev for testing
          ...(process.env.NODE_ENV !== 'production' ? { token: result.token } : {}),
        });
      })
    );

    // ── Verify Magic Link ────────────────────────────────────────────────
    router.post(
      '/verify-magic-link',
      asyncHandler(async (req: Request, res: Response) => {
        const { token } = req.body;

        if (!token) {
          throw new ValidationError('Token is required');
        }

        const result = await verifyMagicLink(token);

        if (!result.success) {
          throw new ValidationError(result.error || 'Verification failed');
        }

        const accessToken = generateAccessToken({
          userId: result.user!.id,
          email: result.user!.email,
        });

        const refreshToken = generateRefreshToken({
          userId: result.user!.id,
          email: result.user!.email,
        });

        await storeRefreshToken(result.user!.id, refreshToken);

        res.json({
          success: true,
          data: {
            user: result.user,
            accessToken,
            refreshToken,
          },
        });
      })
    );
  }

  // ── Refresh Token ──────────────────────────────────────────────────
  router.post(
    '/refresh',
    asyncHandler(async (req: Request, res: Response) => {
      const { refreshToken: token } = req.body;

      if (!token) {
        throw new ValidationError('Refresh token is required');
      }

      // Verify JWT signature
      let decoded;
      try {
        decoded = verifyRefreshToken(token);
      } catch {
        throw new ValidationError('Invalid refresh token');
      }

      // Verify token exists in sessions
      const session = await validateRefreshToken(token);
      if (!session) {
        throw new ValidationError('Refresh token has been revoked or expired');
      }

      // Revoke old token and issue new pair
      await revokeRefreshToken(token);

      const accessToken = generateAccessToken({
        userId: decoded.userId,
        email: decoded.email,
      });

      const newRefreshToken = generateRefreshToken({
        userId: decoded.userId,
        email: decoded.email,
      });

      await storeRefreshToken(decoded.userId, newRefreshToken);

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken: newRefreshToken,
        },
      });
    })
  );

  // ── Logout ──────────────────────────────────────────────────────────
  router.post(
    '/logout',
    asyncHandler(async (req: Request, res: Response) => {
      const { refreshToken: token } = req.body;

      if (token) {
        await revokeRefreshToken(token);
      }

      res.json({ success: true, message: 'Logged out' });
    })
  );

  // ── Get Current User ───────────────────────────────────────────────
  router.get(
    '/me',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const result = await db.query(
        'SELECT id, email, name, is_verified, created_at FROM users WHERE id = $1',
        [req.user!.userId]
      );

      if (result.rows.length === 0) {
        throw new ValidationError('User not found');
      }

      res.json({
        success: true,
        data: { user: result.rows[0] },
      });
    })
  );

  log.info('Auth routes created', {
    emailPassword: emailPwEnabled,
    magicLink: magicLinkEnabled,
  });

  return router;
}
