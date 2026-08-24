import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/**
 * Creates an in-memory sliding window rate limiter.
 * @param windowMs Window duration in milliseconds (e.g. 60000 = 1 minute)
 * @param maxRequests Maximum allowed requests per IP in the window
 * @param message Error message returned if limit exceeded
 */
export function createRateLimiter(
  windowMs: number = 60000,
  maxRequests: number = 10,
  message: string = 'Trop de tentatives. Veuillez patienter avant de réessayer.'
) {
  const ipMap = new Map<string, RateLimitRecord>();

  // Periodically clean up stale rate limit entries
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipMap.entries()) {
      if (record.resetTime < now) {
        ipMap.delete(key);
      }
    }
  }, 60000);

  return (req: Request, res: Response, next: NextFunction) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress) || '127.0.0.1';
    const now = Date.now();

    let record = ipMap.get(ip);
    if (!record || record.resetTime < now) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      ipMap.set(ip, record);
      return next();
    }

    record.count++;
    if (record.count > maxRequests) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        error: message,
        retryAfter: retryAfterSec,
      });
    }

    next();
  };
}

export const loginRateLimiter = createRateLimiter(
  60000, // 1 minute
  6,     // max 6 attempts / min
  'Trop de tentatives de connexion. Par mesure de sécurité, veuillez patienter 1 minute.'
);

export const registerRateLimiter = createRateLimiter(
  60000, // 1 minute
  5,     // max 5 registers / min
  'Trop de créations de compte récentes. Veuillez patienter un instant.'
);

export const resetPasswordRateLimiter = createRateLimiter(
  60000, // 1 minute
  5,     // max 5 attempts / min
  'Trop de demandes de réinitialisation. Veuillez patienter avant de réessayer.'
);
