import { prisma } from '../../db/client';

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

function mapPrismaPlaybook(r: any): PlaybookRecord {
  return {
    id: r.id,
    userId: r.userId ?? undefined,
    name: r.name,
    description: r.description ?? undefined,
    assetClass: Array.isArray(r.assetClass) ? r.assetClass : [],
    preferredTimeframe: r.preferredTimeframe ?? undefined,
    preferredSession: r.preferredSession ?? undefined,
    rules: Array.isArray(r.rules) ? r.rules : [],
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt || new Date().toISOString()),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : undefined,
  };
}

export class PrismaPlaybookRepository implements IPlaybookRepository {
  public async findById(id: string): Promise<PlaybookRecord | null> {
    if (!id || typeof id !== 'string') return null;
    try {
      const pb = await prisma.playbook.findUnique({
        where: { id },
      });
      return pb ? mapPrismaPlaybook(pb) : null;
    } catch (err: any) {
      console.error('[PrismaPlaybookRepository.findById Error]:', err.message);
      return null;
    }
  }

  public async findByUserId(userId?: string): Promise<PlaybookRecord[]> {
    try {
      const pbs = await prisma.playbook.findMany({
        where: userId
          ? {
              OR: [{ userId }, { userId: null }],
            }
          : undefined,
        orderBy: { createdAt: 'asc' },
      });
      return pbs.map(mapPrismaPlaybook);
    } catch (err: any) {
      console.error('[PrismaPlaybookRepository.findByUserId Error]:', err.message);
      return [];
    }
  }

  public async listAll(): Promise<PlaybookRecord[]> {
    try {
      const pbs = await prisma.playbook.findMany({
        orderBy: { createdAt: 'asc' },
      });
      return pbs.map(mapPrismaPlaybook);
    } catch (err: any) {
      console.error('[PrismaPlaybookRepository.listAll Error]:', err.message);
      return [];
    }
  }

  public async create(data: Omit<PlaybookRecord, 'createdAt' | 'updatedAt'>): Promise<PlaybookRecord> {
    const id = data.id || `pb_${Date.now().toString(36)}`;
    const pb = await prisma.playbook.create({
      data: {
        id,
        userId: data.userId || null,
        name: data.name,
        description: data.description || null,
        assetClass: Array.isArray(data.assetClass) ? data.assetClass : [],
        preferredTimeframe: data.preferredTimeframe || null,
        preferredSession: data.preferredSession || null,
        rules: Array.isArray(data.rules) ? data.rules : [],
      },
    });

    return mapPrismaPlaybook(pb);
  }

  public async update(id: string, partial: Partial<PlaybookRecord>): Promise<PlaybookRecord | null> {
    try {
      const data: any = {};
      if (partial.name !== undefined) data.name = partial.name;
      if (partial.description !== undefined) data.description = partial.description || null;
      if (partial.assetClass !== undefined) data.assetClass = Array.isArray(partial.assetClass) ? partial.assetClass : [];
      if (partial.preferredTimeframe !== undefined) data.preferredTimeframe = partial.preferredTimeframe || null;
      if (partial.preferredSession !== undefined) data.preferredSession = partial.preferredSession || null;
      if (partial.rules !== undefined) data.rules = Array.isArray(partial.rules) ? partial.rules : [];

      const pb = await prisma.playbook.update({
        where: { id },
        data,
      });

      return mapPrismaPlaybook(pb);
    } catch (err: any) {
      console.error('[PrismaPlaybookRepository.update Error]:', err.message);
      return null;
    }
  }

  public async delete(id: string): Promise<boolean> {
    try {
      await prisma.playbook.delete({
        where: { id },
      });
      return true;
    } catch (err: any) {
      console.error('[PrismaPlaybookRepository.delete Error]:', err.message);
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
      return await prisma.playbook.count({
        where: userId ? { OR: [{ userId }, { userId: null }] } : undefined,
      });
    } catch (err: any) {
      return 0;
    }
  }
}

export const playbookRepository: IPlaybookRepository = new PrismaPlaybookRepository();

