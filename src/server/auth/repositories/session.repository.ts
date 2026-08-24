import crypto from 'crypto';
import { SessionRecord } from '../types';
import { getDb } from '../../db/postgres';

export interface ISessionRepository {
  create(userId: string, ttlDays?: number, meta?: { ip?: string; userAgent?: string }): Promise<SessionRecord>;
  findById(sessionId: string): Promise<SessionRecord | null>;
  delete(sessionId: string): Promise<boolean>;
  deleteByUserId(userId: string): Promise<number>;
  cleanExpired(): Promise<void>;
  count(): Promise<number>;
}

function mapRowToSession(r: any): SessionRecord {
  return {
    id: r.id,
    userId: r.user_id,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at || new Date().toISOString()),
    expiresAt: r.expires_at instanceof Date ? r.expires_at.toISOString() : String(r.expires_at),
    ip: r.ip ?? undefined,
    userAgent: r.user_agent ?? undefined,
  };
}

export class PostgresSessionRepository implements ISessionRepository {
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

    const db = await getDb();
    const sql = `
      INSERT INTO sessions (id, user_id, token_hash, ip, user_agent, expires_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const res = await db.query(sql, [
      rawSessionId,
      userId,
      tokenHash,
      meta?.ip || null,
      meta?.userAgent || null,
      expiresAt,
      now,
      now,
    ]);

    return mapRowToSession(res.rows[0]);
  }

  public async findById(sessionId: string): Promise<SessionRecord | null> {
    if (!sessionId || typeof sessionId !== 'string') return null;

    try {
      const db = await getDb();
      const res = await db.query('SELECT * FROM sessions WHERE id = $1 LIMIT 1', [sessionId]);
      if (res.rows.length === 0) return null;

      const session = mapRowToSession(res.rows[0]);

      // Verify expiration
      if (new Date(session.expiresAt).getTime() < Date.now()) {
        await this.delete(sessionId);
        return null;
      }

      return session;
    } catch (err: any) {
      console.error('[PostgresSessionRepository.findById Error]:', err.message);
      return null;
    }
  }

  public async delete(sessionId: string): Promise<boolean> {
    if (!sessionId) return false;
    try {
      const db = await getDb();
      const res = await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
      return res.rowCount > 0;
    } catch (err: any) {
      console.error('[PostgresSessionRepository.delete Error]:', err.message);
      return false;
    }
  }

  public async deleteByUserId(userId: string): Promise<number> {
    try {
      const db = await getDb();
      const res = await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
      return res.rowCount;
    } catch (err: any) {
      console.error('[PostgresSessionRepository.deleteByUserId Error]:', err.message);
      return 0;
    }
  }

  public async cleanExpired(): Promise<void> {
    try {
      const db = await getDb();
      await db.query('DELETE FROM sessions WHERE expires_at < NOW()');
    } catch (err: any) {
      console.error('[PostgresSessionRepository.cleanExpired Error]:', err.message);
    }
  }

  public async count(): Promise<number> {
    try {
      const db = await getDb();
      const res = await db.query('SELECT COUNT(*)::int as total FROM sessions');
      return res.rows.length > 0 ? Number(res.rows[0].total) : 0;
    } catch (err: any) {
      return 0;
    }
  }
}

export const sessionRepository: ISessionRepository = new PostgresSessionRepository();
