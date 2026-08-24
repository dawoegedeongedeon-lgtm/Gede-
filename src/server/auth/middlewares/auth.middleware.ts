import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { UserPublic } from '../types';

export const SESSION_COOKIE_NAME = 'tre13ze_session';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: UserPublic;
      sessionId?: string;
    }
  }
}

/**
 * Extracts session token from Cookie or Authorization header.
 */
export function extractSessionToken(req: Request): string | null {
  // 1. Try HttpOnly Cookie
  if (req.cookies && req.cookies[SESSION_COOKIE_NAME]) {
    return req.cookies[SESSION_COOKIE_NAME];
  }

  // 2. Try raw Cookie header if cookie-parser is not available
  if (req.headers.cookie) {
    const match = req.headers.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
    if (match) {
      return decodeURIComponent(match.substring(SESSION_COOKIE_NAME.length + 1));
    }
  }

  // 3. Try Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * Middleware: Requires a valid active session.
 * Rejects with 401 Unauthorized if missing, invalid, or expired.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractSessionToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Non authentifié. Veuillez vous connecter.',
    });
  }

  try {
    const user = await authService.verifySession(token);
    if (!user) {
      // Clear cookie if session is invalid or expired
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      return res.status(401).json({
        success: false,
        error: 'Votre session a expiré. Veuillez vous reconnecter.',
      });
    }

    req.user = user;
    req.sessionId = token;
    return next();
  } catch (err: any) {
    console.error('[requireAuth] Verification error:', err?.message);
    return res.status(401).json({
      success: false,
      error: 'Erreur de vérification de session.',
    });
  }
}

/**
 * Middleware: Optional authentication.
 * Attaches req.user if session is valid, otherwise proceeds as guest.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractSessionToken(req);
  if (token) {
    try {
      const user = await authService.verifySession(token);
      if (user) {
        req.user = user;
        req.sessionId = token;
      }
    } catch {
      // Ignore errors for optional auth
    }
  }
  return next();
}
