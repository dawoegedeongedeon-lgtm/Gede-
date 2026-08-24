import { UserRecord } from '../types';
import { getDb } from '../../db/postgres';

export interface IUserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(userData: Omit<UserRecord, 'id' | 'createdAt'>): Promise<UserRecord>;
  update(id: string, partial: Partial<UserRecord>): Promise<UserRecord | null>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
  listAll(): Promise<UserRecord[]>;
}

function mapRowToUser(r: any): UserRecord {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    passwordHash: r.password_hash ?? undefined,
    role: r.role || 'Trader Indépendant',
    plan: r.plan || 'Pro Desk & MT5 Live',
    avatarUrl: r.avatar_url ?? undefined,
    emailVerified: Boolean(r.email_verified),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at || new Date().toISOString()),
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : (r.updated_at ? String(r.updated_at) : undefined),
    lastLoginAt: r.last_login_at instanceof Date ? r.last_login_at.toISOString() : (r.last_login_at ? String(r.last_login_at) : undefined),
  };
}

export class PostgresUserRepository implements IUserRepository {
  public async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.toLowerCase().trim();
    const db = await getDb();
    const res = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [normalized]);
    return res.rows.length > 0 ? mapRowToUser(res.rows[0]) : null;
  }

  public async findById(id: string): Promise<UserRecord | null> {
    const db = await getDb();
    const res = await db.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    return res.rows.length > 0 ? mapRowToUser(res.rows[0]) : null;
  }

  public async create(userData: Omit<UserRecord, 'id' | 'createdAt'>): Promise<UserRecord> {
    const normalizedEmail = userData.email.toLowerCase().trim();
    const db = await getDb();

    // Check unique email
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      throw new Error('Un utilisateur avec cet e-mail existe déjà.');
    }

    const id = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const avatarUrl = userData.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${normalizedEmail}`;
    const now = new Date();

    const sql = `
      INSERT INTO users (id, email, name, password_hash, avatar_url, role, plan, email_verified, last_login_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const res = await db.query(sql, [
      id,
      normalizedEmail,
      userData.name.trim(),
      userData.passwordHash || null,
      avatarUrl,
      userData.role || 'Trader Indépendant',
      userData.plan || 'Pro Desk & MT5 Live',
      userData.emailVerified ?? false,
      userData.lastLoginAt ? new Date(userData.lastLoginAt) : now,
      now,
      now,
    ]);

    return mapRowToUser(res.rows[0]);
  }

  public async update(id: string, partial: Partial<UserRecord>): Promise<UserRecord | null> {
    const db = await getDb();
    const current = await this.findById(id);
    if (!current) return null;

    const email = partial.email !== undefined ? partial.email.toLowerCase().trim() : current.email;
    const name = partial.name !== undefined ? partial.name : current.name;
    const passwordHash = partial.passwordHash !== undefined ? partial.passwordHash : current.passwordHash;
    const avatarUrl = partial.avatarUrl !== undefined ? partial.avatarUrl : current.avatarUrl;
    const role = partial.role !== undefined ? partial.role : current.role;
    const plan = partial.plan !== undefined ? partial.plan : current.plan;
    const emailVerified = partial.emailVerified !== undefined ? partial.emailVerified : current.emailVerified;
    const lastLoginAt = partial.lastLoginAt !== undefined ? new Date(partial.lastLoginAt) : (current.lastLoginAt ? new Date(current.lastLoginAt) : null);
    const now = new Date();

    const sql = `
      UPDATE users
      SET email = $1, name = $2, password_hash = $3, avatar_url = $4, role = $5, plan = $6, email_verified = $7, last_login_at = $8, updated_at = $9
      WHERE id = $10
      RETURNING *
    `;

    const res = await db.query(sql, [
      email,
      name,
      passwordHash || null,
      avatarUrl || null,
      role,
      plan,
      emailVerified,
      lastLoginAt,
      now,
      id,
    ]);

    return res.rows.length > 0 ? mapRowToUser(res.rows[0]) : null;
  }

  public async delete(id: string): Promise<boolean> {
    const db = await getDb();
    const res = await db.query('DELETE FROM users WHERE id = $1', [id]);
    return res.rowCount > 0;
  }

  public async count(): Promise<number> {
    const db = await getDb();
    const res = await db.query('SELECT COUNT(*)::int as total FROM users');
    return res.rows.length > 0 ? Number(res.rows[0].total) : 0;
  }

  public async listAll(): Promise<UserRecord[]> {
    const db = await getDb();
    const res = await db.query('SELECT * FROM users ORDER BY created_at ASC');
    return res.rows.map(mapRowToUser);
  }
}

export const userRepository: IUserRepository = new PostgresUserRepository();
