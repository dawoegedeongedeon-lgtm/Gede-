import crypto from 'crypto';
import { SessionRecord } from '../types';

export interface ISessionRepository {
  create(userId: string, ttlDays?: number, meta?: { ip?: string; userAgent?: string }): Promise<SessionRecord>;
  findById(sessionId: string): Promise<SessionRecord | null>;
  delete(sessionId: string): Promise<boolean>;
  deleteByUserId(userId: string): Promise<number>;
  cleanExpired(): Promise<void>;
}

export class MemorySessionRepository implements ISessionRepository {
  private sessions: Map<string, SessionRecord> = new Map();

  public async create(
    userId: string,
    ttlDays: number = 7,
    meta?: { ip?: string; userAgent?: string }
  ): Promise<SessionRecord> {
    // Generate 64-char cryptographically secure random session ID
    const sessionId = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);

    const session: SessionRecord = {
      id: sessionId,
      userId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  public async findById(sessionId: string): Promise<SessionRecord | null> {
    if (!sessionId) return null;
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check expiration
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  public async delete(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  public async deleteByUserId(userId: string): Promise<number> {
    let count = 0;
    for (const [id, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(id);
        count++;
      }
    }
    return count;
  }

  public async cleanExpired(): Promise<void> {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (new Date(session.expiresAt).getTime() < now) {
        this.sessions.delete(id);
      }
    }
  }
}

// Singleton session repository export
export const sessionRepository: ISessionRepository = new MemorySessionRepository();
