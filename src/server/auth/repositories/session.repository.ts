import crypto from 'crypto';
import { SessionRecord } from '../types';
import { prisma } from '../../db/client';

export interface ISessionRepository {
  create(userId: string, ttlDays?: number, meta?: { ip?: string; userAgent?: string }): Promise<SessionRecord>;
  findById(sessionId: string): Promise<SessionRecord | null>;
  delete(sessionId: string): Promise<boolean>;
  deleteByUserId(userId: string): Promise<number>;
  cleanExpired(): Promise<void>;
  count(): Promise<number>;
}

function mapPrismaSession(s: any): SessionRecord {
  return {
    id: s.id,
    userId: s.userId,
    createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt || new Date().toISOString()),
    expiresAt: s.expiresAt instanceof Date ? s.expiresAt.toISOString() : String(s.expiresAt),
    ip: s.ip ?? undefined,
    userAgent: s.userAgent ?? undefined,
  };
}

export class PrismaSessionRepository implements ISessionRepository {
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  public async create(
    userId: string,
    ttlDays: number = 7,
    meta?: { ip?: string; userAgent?: string }
  ): Promise<SessionRecord> {
    const rawSessionId = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawSessionId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);

    const session = await prisma.session.create({
      data: {
        id: rawSessionId,
        userId,
        tokenHash,
        ip: meta?.ip || null,
        userAgent: meta?.userAgent || null,
        expiresAt,
      },
    });

    return mapPrismaSession(session);
  }

  public async findById(sessionId: string): Promise<SessionRecord | null> {
    if (!sessionId || typeof sessionId !== 'string') return null;

    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
      });
      if (!session) return null;

      const record = mapPrismaSession(session);

      // Verify expiration
      if (new Date(record.expiresAt).getTime() < Date.now()) {
        await this.delete(sessionId);
        return null;
      }

      return record;
    } catch (err: any) {
      console.error('[PrismaSessionRepository.findById Error]:', err.message);
      return null;
    }
  }

  public async delete(sessionId: string): Promise<boolean> {
    if (!sessionId) return false;
    try {
      await prisma.session.delete({
        where: { id: sessionId },
      });
      return true;
    } catch (err: any) {
      console.error('[PrismaSessionRepository.delete Error]:', err.message);
      return false;
    }
  }

  public async deleteByUserId(userId: string): Promise<number> {
    try {
      const res = await prisma.session.deleteMany({
        where: { userId },
      });
      return res.count;
    } catch (err: any) {
      console.error('[PrismaSessionRepository.deleteByUserId Error]:', err.message);
      return 0;
    }
  }

  public async cleanExpired(): Promise<void> {
    try {
      await prisma.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
    } catch (err: any) {
      console.error('[PrismaSessionRepository.cleanExpired Error]:', err.message);
    }
  }

  public async count(): Promise<number> {
    try {
      return await prisma.session.count();
    } catch (err: any) {
      return 0;
    }
  }
}

export const sessionRepository: ISessionRepository = new PrismaSessionRepository();

