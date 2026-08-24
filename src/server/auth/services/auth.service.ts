import { UserRecord, UserPublic, SessionRecord, RegisterDto, LoginDto, ResetPasswordDto } from '../types';
import { IUserRepository, userRepository } from '../repositories/user.repository';
import { ISessionRepository, sessionRepository } from '../repositories/session.repository';
import { PasswordService } from './password.service';

export class AuthError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AuthError';
  }
}

export class AuthService {
  constructor(
    private userRepo: IUserRepository = userRepository,
    private sessionRepo: ISessionRepository = sessionRepository
  ) {}

  /**
   * Sanitizes a UserRecord into a safe public profile without sensitive data.
   */
  public toUserPublic(user: UserRecord): UserPublic {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'Trader Indépendant',
      plan: user.plan || 'Pro Desk & MT5 Live',
      avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`,
      emailVerified: Boolean(user.emailVerified),
      createdAt: user.createdAt,
    };
  }

  /**
   * Validates email format strictly.
   */
  public isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Validates password strength (min 8 characters, at least 1 digit, at least 1 letter).
   */
  public validatePasswordStrength(password: string): { valid: boolean; message?: string } {
    if (!password || typeof password !== 'string') {
      return { valid: false, message: 'Le mot de passe est obligatoire.' };
    }
    if (password.length < 8) {
      return { valid: false, message: 'Le mot de passe doit contenir au moins 8 caractères.' };
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      return { valid: false, message: 'Le mot de passe doit combiner des lettres et au moins un chiffre.' };
    }
    return { valid: true };
  }

  /**
   * Register a new user with hashed password and initial session.
   */
  public async register(
    dto: RegisterDto,
    meta?: { ip?: string; userAgent?: string }
  ): Promise<{ user: UserPublic; session: SessionRecord }> {
    const rawEmail = dto.email;
    const rawName = dto.name;
    const rawPassword = dto.password;
    const rawConfirm = dto.confirmPassword;

    if (!rawEmail || !this.isValidEmail(rawEmail)) {
      throw new AuthError('Veuillez renseigner une adresse e-mail valide.', 400);
    }

    const cleanEmail = rawEmail.toLowerCase().trim();

    if (!rawName || rawName.trim().length < 2) {
      throw new AuthError('Veuillez renseigner votre nom complet (au moins 2 caractères).', 400);
    }

    const cleanName = rawName.trim();

    const pwdCheck = this.validatePasswordStrength(rawPassword);
    if (!pwdCheck.valid) {
      throw new AuthError(pwdCheck.message || 'Mot de passe invalide.', 400);
    }

    if (rawConfirm !== undefined && rawConfirm !== rawPassword) {
      throw new AuthError('Les deux mots de passe ne correspondent pas.', 400);
    }

    // Check if user already exists
    const existing = await this.userRepo.findByEmail(cleanEmail);
    if (existing) {
      throw new AuthError('Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter.', 409);
    }

    // Hash password with bcrypt
    const passwordHash = await PasswordService.hashPassword(rawPassword);

    // Persist new user
    const newUser = await this.userRepo.create({
      email: cleanEmail,
      name: cleanName,
      passwordHash,
      role: 'Trader Indépendant',
      plan: 'Pro Desk & MT5 Live',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`,
      emailVerified: false,
      lastLoginAt: new Date().toISOString(),
    });

    // Create session (7 days default)
    const session = await this.sessionRepo.create(newUser.id, 7, meta);

    return {
      user: this.toUserPublic(newUser),
      session,
    };
  }

  /**
   * Log in user with password verification and session creation.
   */
  public async login(
    dto: LoginDto,
    meta?: { ip?: string; userAgent?: string }
  ): Promise<{ user: UserPublic; session: SessionRecord }> {
    const rawEmail = dto.email;
    const rawPassword = dto.password;

    if (!rawEmail || !this.isValidEmail(rawEmail)) {
      throw new AuthError('Veuillez renseigner une adresse e-mail valide.', 400);
    }

    if (!rawPassword) {
      throw new AuthError('Veuillez saisir votre mot de passe.', 400);
    }

    const cleanEmail = rawEmail.toLowerCase().trim();
    const user = await this.userRepo.findByEmail(cleanEmail);

    if (!user) {
      // Generic error to avoid email enumeration
      throw new AuthError('Email ou mot de passe incorrect.', 401);
    }

    let isPasswordValid = false;

    // Check if user has passwordHash
    if (user.passwordHash) {
      isPasswordValid = await PasswordService.verifyPassword(rawPassword, user.passwordHash);
    } else if ((user as any).password) {
      // Legacy plain password fallback: verify and automatically upgrade to passwordHash
      if ((user as any).password === rawPassword) {
        isPasswordValid = true;
        const newHash = await PasswordService.hashPassword(rawPassword);
        delete (user as any).password;
        await this.userRepo.update(user.id, { passwordHash: newHash });
      }
    }

    if (!isPasswordValid) {
      throw new AuthError('Email ou mot de passe incorrect.', 401);
    }

    // Update last login timestamp
    await this.userRepo.update(user.id, { lastLoginAt: new Date().toISOString() });

    // Session TTL: 30 days if rememberMe, 7 days otherwise
    const ttlDays = dto.rememberMe ? 30 : 7;
    const session = await this.sessionRepo.create(user.id, ttlDays, meta);

    return {
      user: this.toUserPublic(user),
      session,
    };
  }

  /**
   * Verify an active session token and return the authenticated user.
   */
  public async verifySession(sessionId: string): Promise<UserPublic | null> {
    if (!sessionId) return null;

    const session = await this.sessionRepo.findById(sessionId);
    if (!session) return null;

    const user = await this.userRepo.findById(session.userId);
    if (!user) return null;

    return this.toUserPublic(user);
  }

  /**
   * Invalidate a session (Logout).
   */
  public async logout(sessionId: string): Promise<boolean> {
    if (!sessionId) return false;
    return this.sessionRepo.delete(sessionId);
  }

  /**
   * Reset user password with validation and hash generation.
   */
  public async resetPassword(dto: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
    const rawEmail = dto.email;
    const rawNewPassword = dto.newPassword;

    if (!rawEmail || !this.isValidEmail(rawEmail)) {
      throw new AuthError('Veuillez renseigner une adresse e-mail valide.', 400);
    }

    const pwdCheck = this.validatePasswordStrength(rawNewPassword);
    if (!pwdCheck.valid) {
      throw new AuthError(pwdCheck.message || 'Nouveau mot de passe invalide.', 400);
    }

    if (dto.confirmPassword !== undefined && dto.confirmPassword !== rawNewPassword) {
      throw new AuthError('Les deux mots de passe ne correspondent pas.', 400);
    }

    const cleanEmail = rawEmail.toLowerCase().trim();
    const user = await this.userRepo.findByEmail(cleanEmail);

    if (!user) {
      // Friendly message without leaking database internals
      throw new AuthError('Aucun compte associé à cette adresse e-mail.', 404);
    }

    const passwordHash = await PasswordService.hashPassword(rawNewPassword);

    await this.userRepo.update(user.id, {
      passwordHash,
    });

    // Invalidate all existing sessions for this user for security
    await this.sessionRepo.deleteByUserId(user.id);

    return {
      success: true,
      message: 'Votre mot de passe a été réinitialisé avec succès. Veuillez vous reconnecter.',
    };
  }

  /**
   * Google SSO helper (creates or logs in user safely).
   */
  public async handleGoogleAuth(
    email: string,
    name?: string,
    avatarUrl?: string,
    meta?: { ip?: string; userAgent?: string }
  ): Promise<{ user: UserPublic; session: SessionRecord }> {
    if (!email || !this.isValidEmail(email)) {
      throw new AuthError('Adresse e-mail Google invalide.', 400);
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = await this.userRepo.findByEmail(cleanEmail);

    if (!user) {
      const cleanName = name?.trim() || cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
      user = await this.userRepo.create({
        email: cleanEmail,
        name: cleanName,
        role: 'Trader Indépendant',
        plan: 'Pro Desk & MT5 Live',
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`,
        emailVerified: true,
        lastLoginAt: new Date().toISOString(),
      });
    } else {
      await this.userRepo.update(user.id, {
        lastLoginAt: new Date().toISOString(),
        avatarUrl: avatarUrl || user.avatarUrl,
      });
    }

    const session = await this.sessionRepo.create(user.id, 14, meta);
    return {
      user: this.toUserPublic(user),
      session,
    };
  }
}

export const authService = new AuthService();
