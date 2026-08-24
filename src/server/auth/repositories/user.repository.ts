import { UserRecord } from '../types';
import { prisma } from '../../db/client';

export interface IUserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(userData: Omit<UserRecord, 'id' | 'createdAt'>): Promise<UserRecord>;
  update(id: string, partial: Partial<UserRecord>): Promise<UserRecord | null>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
  listAll(): Promise<UserRecord[]>;
}

function mapPrismaUser(u: any): UserRecord {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    passwordHash: u.passwordHash ?? undefined,
    role: u.role || 'Trader Indépendant',
    plan: u.plan || 'Pro Desk & MT5 Live',
    avatarUrl: u.avatarUrl ?? undefined,
    emailVerified: Boolean(u.emailVerified),
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
    updatedAt: u.updatedAt instanceof Date ? u.updatedAt.toISOString() : (u.updatedAt ? String(u.updatedAt) : undefined),
    lastLoginAt: u.lastLoginAt instanceof Date ? u.lastLoginAt.toISOString() : (u.lastLoginAt ? String(u.lastLoginAt) : undefined),
  };
}

export class PrismaUserRepository implements IUserRepository {
  public async findByEmail(email: string): Promise<UserRecord | null> {
    if (!email || typeof email !== 'string') return null;
    const normalized = email.toLowerCase().trim();
    try {
      const user = await prisma.user.findFirst({
        where: {
          email: {
            equals: normalized,
            mode: 'insensitive',
          },
        },
      });
      return user ? mapPrismaUser(user) : null;
    } catch (err: any) {
      console.error('[PrismaUserRepository.findByEmail Error]:', err.message);
      return null;
    }
  }

  public async findById(id: string): Promise<UserRecord | null> {
    if (!id || typeof id !== 'string') return null;
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });
      return user ? mapPrismaUser(user) : null;
    } catch (err: any) {
      console.error('[PrismaUserRepository.findById Error]:', err.message);
      return null;
    }
  }

  public async create(userData: Omit<UserRecord, 'id' | 'createdAt'>): Promise<UserRecord> {
    const normalizedEmail = userData.email.toLowerCase().trim();

    // Check unique email
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      throw new Error('Un utilisateur avec cet e-mail existe déjà.');
    }

    const id = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const avatarUrl = userData.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${normalizedEmail}`;

    const user = await prisma.user.create({
      data: {
        id,
        email: normalizedEmail,
        name: userData.name.trim(),
        passwordHash: userData.passwordHash || null,
        avatarUrl,
        role: userData.role || 'Trader Indépendant',
        plan: userData.plan || 'Pro Desk & MT5 Live',
        emailVerified: userData.emailVerified ?? false,
        lastLoginAt: userData.lastLoginAt ? new Date(userData.lastLoginAt) : new Date(),
      },
    });

    return mapPrismaUser(user);
  }

  public async update(id: string, partial: Partial<UserRecord>): Promise<UserRecord | null> {
    try {
      const data: any = {};
      if (partial.email !== undefined) data.email = partial.email.toLowerCase().trim();
      if (partial.name !== undefined) data.name = partial.name.trim();
      if (partial.passwordHash !== undefined) data.passwordHash = partial.passwordHash;
      if (partial.avatarUrl !== undefined) data.avatarUrl = partial.avatarUrl;
      if (partial.role !== undefined) data.role = partial.role;
      if (partial.plan !== undefined) data.plan = partial.plan;
      if (partial.emailVerified !== undefined) data.emailVerified = partial.emailVerified;
      if (partial.lastLoginAt !== undefined) {
        data.lastLoginAt = partial.lastLoginAt ? new Date(partial.lastLoginAt) : null;
      }

      const user = await prisma.user.update({
        where: { id },
        data,
      });

      return mapPrismaUser(user);
    } catch (err: any) {
      console.error('[PrismaUserRepository.update Error]:', err.message);
      return null;
    }
  }

  public async delete(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id },
      });
      return true;
    } catch (err: any) {
      console.error('[PrismaUserRepository.delete Error]:', err.message);
      return false;
    }
  }

  public async count(): Promise<number> {
    try {
      return await prisma.user.count();
    } catch (err: any) {
      console.error('[PrismaUserRepository.count Error]:', err.message);
      return 0;
    }
  }

  public async listAll(): Promise<UserRecord[]> {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'asc' },
      });
      return users.map(mapPrismaUser);
    } catch (err: any) {
      console.error('[PrismaUserRepository.listAll Error]:', err.message);
      return [];
    }
  }
}

export const userRepository: IUserRepository = new PrismaUserRepository();

