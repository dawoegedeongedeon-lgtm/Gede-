import fs from 'fs';
import path from 'path';
import { UserRecord } from '../types';

export interface IUserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(userData: Omit<UserRecord, 'id' | 'createdAt'>): Promise<UserRecord>;
  update(id: string, partial: Partial<UserRecord>): Promise<UserRecord | null>;
  delete(id: string): Promise<boolean>;
}

const DB_FILE = path.join(process.cwd(), 'trades_db.json');

export class JsonUserRepository implements IUserRepository {
  private readUsers(): UserRecord[] {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        if (raw && raw.trim().length > 0) {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed.users) ? parsed.users : [];
        }
      }
    } catch (err) {
      console.error('[JsonUserRepository] Error reading users from DB_FILE:', err);
    }
    return [];
  }

  private saveUsers(users: UserRecord[]): void {
    try {
      let dbData: any = {};
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        if (raw && raw.trim().length > 0) {
          dbData = JSON.parse(raw);
        }
      }
      dbData.users = users;
      dbData.updatedAt = new Date().toISOString();

      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(dbData, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('[JsonUserRepository] Error writing users to DB_FILE:', err);
    }
  }

  public async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.toLowerCase().trim();
    const users = this.readUsers();
    const found = users.find((u) => u.email.toLowerCase() === normalized);
    return found || null;
  }

  public async findById(id: string): Promise<UserRecord | null> {
    const users = this.readUsers();
    const found = users.find((u) => u.id === id);
    return found || null;
  }

  public async create(userData: Omit<UserRecord, 'id' | 'createdAt'>): Promise<UserRecord> {
    const users = this.readUsers();
    const normalizedEmail = userData.email.toLowerCase().trim();

    const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      throw new Error('Un utilisateur avec cet e-mail existe déjà.');
    }

    const newUser: UserRecord = {
      id: `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`,
      email: normalizedEmail,
      name: userData.name.trim(),
      passwordHash: userData.passwordHash,
      role: userData.role || 'Trader Indépendant',
      plan: userData.plan || 'Pro Desk & MT5 Live',
      avatarUrl: userData.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${normalizedEmail}`,
      emailVerified: userData.emailVerified ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: userData.lastLoginAt || new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  }

  public async update(id: string, partial: Partial<UserRecord>): Promise<UserRecord | null> {
    const users = this.readUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) {
      return null;
    }

    const current = users[index];
    const updated: UserRecord = {
      ...current,
      ...partial,
      id: current.id, // Immutable
      updatedAt: new Date().toISOString(),
    };

    users[index] = updated;
    this.saveUsers(users);
    return updated;
  }

  public async delete(id: string): Promise<boolean> {
    const users = this.readUsers();
    const initialLen = users.length;
    const filtered = users.filter((u) => u.id !== id);
    if (filtered.length !== initialLen) {
      this.saveUsers(filtered);
      return true;
    }
    return false;
  }
}

// Singleton repository export
export const userRepository: IUserRepository = new JsonUserRepository();
