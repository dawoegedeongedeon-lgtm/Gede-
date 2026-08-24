import { getDb } from '../../db/postgres';

export interface PlaybookRecord {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  assetClass: string[];
  preferredTimeframe?: string;
  preferredSession?: string;
  rules: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface IPlaybookRepository {
  findById(id: string): Promise<PlaybookRecord | null>;
  findByUserId(userId?: string): Promise<PlaybookRecord[]>;
  listAll(): Promise<PlaybookRecord[]>;
  create(data: Omit<PlaybookRecord, 'createdAt' | 'updatedAt'>): Promise<PlaybookRecord>;
  update(id: string, partial: Partial<PlaybookRecord>): Promise<PlaybookRecord | null>;
  delete(id: string): Promise<boolean>;
  upsert(playbook: PlaybookRecord): Promise<PlaybookRecord>;
  count(userId?: string): Promise<number>;
}

function parseJsonField(val: any): any[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const p = JSON.parse(val);
      return Array.isArray(p) ? p : [];
    } catch {}
  }
  return [];
}

function mapRowToPlaybook(r: any): PlaybookRecord {
  return {
    id: r.id,
    userId: r.user_id ?? undefined,
    name: r.name,
    description: r.description ?? undefined,
    assetClass: parseJsonField(r.asset_class),
    preferredTimeframe: r.preferred_timeframe ?? undefined,
    preferredSession: r.preferred_session ?? undefined,
    rules: parseJsonField(r.rules),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at || new Date().toISOString()),
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : undefined,
  };
}

export class PostgresPlaybookRepository implements IPlaybookRepository {
  public async findById(id: string): Promise<PlaybookRecord | null> {
    try {
      const db = await getDb();
      const res = await db.query('SELECT * FROM playbooks WHERE id = $1 LIMIT 1', [id]);
      return res.rows.length > 0 ? mapRowToPlaybook(res.rows[0]) : null;
    } catch (err: any) {
      console.error('[PostgresPlaybookRepository.findById Error]:', err.message);
      return null;
    }
  }

  public async findByUserId(userId?: string): Promise<PlaybookRecord[]> {
    try {
      const db = await getDb();
      const res = userId
        ? await db.query('SELECT * FROM playbooks WHERE user_id = $1 OR user_id IS NULL ORDER BY created_at ASC', [userId])
        : await db.query('SELECT * FROM playbooks ORDER BY created_at ASC');
      return res.rows.map(mapRowToPlaybook);
    } catch (err: any) {
      console.error('[PostgresPlaybookRepository.findByUserId Error]:', err.message);
      return [];
    }
  }

  public async listAll(): Promise<PlaybookRecord[]> {
    try {
      const db = await getDb();
      const res = await db.query('SELECT * FROM playbooks ORDER BY created_at ASC');
      return res.rows.map(mapRowToPlaybook);
    } catch (err: any) {
      console.error('[PostgresPlaybookRepository.listAll Error]:', err.message);
      return [];
    }
  }

  public async create(data: Omit<PlaybookRecord, 'createdAt' | 'updatedAt'>): Promise<PlaybookRecord> {
    const db = await getDb();
    const id = data.id || `pb_${Date.now().toString(36)}`;
    const now = new Date();

    const sql = `
      INSERT INTO playbooks (id, user_id, name, description, asset_class, preferred_timeframe, preferred_session, rules, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const res = await db.query(sql, [
      id,
      data.userId || null,
      data.name,
      data.description || null,
      JSON.stringify(data.assetClass || []),
      data.preferredTimeframe || null,
      data.preferredSession || null,
      JSON.stringify(data.rules || []),
      now,
      now,
    ]);

    return mapRowToPlaybook(res.rows[0]);
  }

  public async update(id: string, partial: Partial<PlaybookRecord>): Promise<PlaybookRecord | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const db = await getDb();
    const name = partial.name !== undefined ? partial.name : current.name;
    const description = partial.description !== undefined ? partial.description : current.description;
    const assetClass = partial.assetClass !== undefined ? partial.assetClass : current.assetClass;
    const preferredTimeframe = partial.preferredTimeframe !== undefined ? partial.preferredTimeframe : current.preferredTimeframe;
    const preferredSession = partial.preferredSession !== undefined ? partial.preferredSession : current.preferredSession;
    const rules = partial.rules !== undefined ? partial.rules : current.rules;
    const now = new Date();

    const sql = `
      UPDATE playbooks
      SET name = $1, description = $2, asset_class = $3, preferred_timeframe = $4, preferred_session = $5, rules = $6, updated_at = $7
      WHERE id = $8
      RETURNING *
    `;

    const res = await db.query(sql, [
      name,
      description || null,
      JSON.stringify(assetClass || []),
      preferredTimeframe || null,
      preferredSession || null,
      JSON.stringify(rules || []),
      now,
      id,
    ]);

    return res.rows.length > 0 ? mapRowToPlaybook(res.rows[0]) : null;
  }

  public async delete(id: string): Promise<boolean> {
    try {
      const db = await getDb();
      const res = await db.query('DELETE FROM playbooks WHERE id = $1', [id]);
      return res.rowCount > 0;
    } catch (err: any) {
      console.error('[PostgresPlaybookRepository.delete Error]:', err.message);
      return false;
    }
  }

  public async upsert(playbook: PlaybookRecord): Promise<PlaybookRecord> {
    const existing = await this.findById(playbook.id);
    if (existing) {
      const updated = await this.update(playbook.id, playbook);
      return updated || existing;
    }
    return this.create(playbook);
  }

  public async count(userId?: string): Promise<number> {
    try {
      const db = await getDb();
      const res = userId
        ? await db.query('SELECT COUNT(*)::int as total FROM playbooks WHERE user_id = $1 OR user_id IS NULL', [userId])
        : await db.query('SELECT COUNT(*)::int as total FROM playbooks');
      return res.rows.length > 0 ? Number(res.rows[0].total) : 0;
    } catch (err: any) {
      return 0;
    }
  }
}

export const playbookRepository: IPlaybookRepository = new PostgresPlaybookRepository();
