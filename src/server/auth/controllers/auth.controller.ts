import { Request, Response } from 'express';
import { authService, AuthError } from '../services/auth.service';
import { SESSION_COOKIE_NAME, extractSessionToken } from '../middlewares/auth.middleware';

// Cookie options helper
function getCookieOptions(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000) {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeMs,
  };
}

export class AuthController {
  /**
   * POST /api/auth/register
   */
  public static async register(req: Request, res: Response) {
    try {
      const { email, name, password, confirmPassword } = req.body;
      const forwarded = req.headers['x-forwarded-for'];
      const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.register(
        { email, name, password, confirmPassword },
        { ip, userAgent }
      );

      // Set HttpOnly session cookie
      res.cookie(SESSION_COOKIE_NAME, result.session.id, getCookieOptions());

      return res.status(201).json({
        success: true,
        user: result.user,
      });
    } catch (err: any) {
      const statusCode = err instanceof AuthError ? err.statusCode : 500;
      const message = err?.message || 'Erreur lors de la création du compte.';
      return res.status(statusCode).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /api/auth/login
   */
  public static async login(req: Request, res: Response) {
    try {
      const { email, password, rememberMe } = req.body;
      const forwarded = req.headers['x-forwarded-for'];
      const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login(
        { email, password, rememberMe },
        { ip, userAgent }
      );

      const maxAgeMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
      res.cookie(SESSION_COOKIE_NAME, result.session.id, getCookieOptions(maxAgeMs));

      return res.json({
        success: true,
        user: result.user,
      });
    } catch (err: any) {
      const statusCode = err instanceof AuthError ? err.statusCode : 500;
      const message = err?.message || 'Erreur lors de la connexion.';
      return res.status(statusCode).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * GET /api/auth/me
   * Protected by requireAuth middleware
   */
  public static async getMe(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Non authentifié.',
      });
    }

    return res.json({
      success: true,
      user: req.user,
    });
  }

  /**
   * POST /api/auth/logout
   */
  public static async logout(req: Request, res: Response) {
    try {
      const sessionId = req.sessionId || extractSessionToken(req);
      if (sessionId) {
        await authService.logout(sessionId);
      }

      res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      return res.json({
        success: true,
        message: 'Déconnexion réussie.',
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la déconnexion.',
      });
    }
  }

  /**
   * POST /api/auth/reset-password
   */
  public static async resetPassword(req: Request, res: Response) {
    try {
      const { email, newPassword, confirmPassword, token } = req.body;
      const result = await authService.resetPassword({
        email,
        newPassword,
        confirmPassword,
        token,
      });

      // Clear any active session cookie for safety
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });

      return res.json(result);
    } catch (err: any) {
      const statusCode = err instanceof AuthError ? err.statusCode : 500;
      return res.status(statusCode).json({
        success: false,
        error: err?.message || 'Erreur lors de la réinitialisation du mot de passe.',
      });
    }
  }

  /**
   * POST /api/auth/google
   */
  public static async googleAuth(req: Request, res: Response) {
    try {
      const { email, name, avatarUrl } = req.body;
      const forwarded = req.headers['x-forwarded-for'];
      const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.handleGoogleAuth(email, name, avatarUrl, { ip, userAgent });

      res.cookie(SESSION_COOKIE_NAME, result.session.id, getCookieOptions(14 * 24 * 60 * 60 * 1000));

      return res.json({
        success: true,
        user: result.user,
      });
    } catch (err: any) {
      const statusCode = err instanceof AuthError ? err.statusCode : 500;
      return res.status(statusCode).json({
        success: false,
        error: err?.message || 'Erreur lors de la connexion Google.',
      });
    }
  }
}
