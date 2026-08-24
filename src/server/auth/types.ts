export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  role: string;
  plan: string;
  avatarUrl?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  avatarUrl?: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface SessionRecord {
  id: string; // Session token
  userId: string;
  createdAt: string;
  expiresAt: string;
  ip?: string;
  userAgent?: string;
}

export interface RegisterDto {
  email: string;
  name: string;
  password: string;
  confirmPassword?: string;
}

export interface LoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ResetPasswordDto {
  email: string;
  newPassword: string;
  confirmPassword?: string;
  token?: string;
}
