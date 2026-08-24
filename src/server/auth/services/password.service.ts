import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export class PasswordService {
  /**
   * Hashes a raw password securely with bcrypt salt rounds = 12.
   */
  public static async hashPassword(password: string): Promise<string> {
    if (!password || password.length < 8) {
      throw new Error('Le mot de passe doit contenir au moins 8 caractères.');
    }
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  }

  /**
   * Securely compares a raw password against the stored bcrypt hash.
   */
  public static async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }
    try {
      return await bcrypt.compare(password, hash);
    } catch {
      return false;
    }
  }
}
