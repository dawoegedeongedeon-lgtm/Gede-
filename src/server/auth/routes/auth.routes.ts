import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { loginRateLimiter, registerRateLimiter, resetPasswordRateLimiter } from '../middlewares/rate-limit.middleware';

export const authRouter = Router();

// Public routes with rate limiting
authRouter.post('/register', registerRateLimiter, AuthController.register);
authRouter.post('/login', loginRateLimiter, AuthController.login);
authRouter.post('/google', loginRateLimiter, AuthController.googleAuth);
authRouter.post('/reset-password', resetPasswordRateLimiter, AuthController.resetPassword);

// Prepared for Step 4 (Email provider / Tokenized reset flow)
authRouter.post('/forgot-password', resetPasswordRateLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      error: 'Veuillez renseigner une adresse e-mail valide.',
    });
  }
  // Generic confirmation to prevent email enumeration
  return res.json({
    success: true,
    message: 'Si cette adresse est enregistrée, un lien de réinitialisation vous sera envoyé.',
  });
});

// Protected routes
authRouter.get('/me', requireAuth, AuthController.getMe);
authRouter.post('/logout', AuthController.logout);
