import { checkDatabaseConnection } from '../src/server/db/client';
import { playbookRepository } from '../src/server/trading/repositories/playbook.repository';

/**
 * Tre13ze Database Seeder
 * Populates system-level default records (such as standard trading playbooks).
 * Strictly separated from the JSON migration pipeline.
 */
export async function seedDatabase(): Promise<void> {
  console.log('🌱 Starting database seed...');

  const dbHealth = await checkDatabaseConnection();
  if (!dbHealth.connected) {
    console.error('[Seed Error] Cannot seed database: PostgreSQL connection unavailable.', dbHealth.error);
    return;
  }

  const defaultPlaybooks = [
    {
      id: 'ict-silver-bullet',
      name: 'ICT Silver Bullet',
      description: 'Fenêtre temporelle NY AM (10:00-11:00 EST), prise de liquidité suivie d\'un FVG (Fair Value Gap) avec Market Structure Shift.',
      assetClass: ['INDICES', 'FOREX'],
      preferredTimeframe: '5m',
      preferredSession: 'New York',
      rules: [
        'Attendre 10:00 AM NY Open',
        'Balayage de liquidité Buy/Sell Side préalable',
        'Création d\'un Fair Value Gap (FVG) avec déplacement violent',
        'Entrée sur le retest du FVG avec SL serré au-dessus/en-dessous du swing',
        'Cibler 2R minimum ou le pool de liquidité opposé',
      ],
    },
    {
      id: 'smc-orderblock-fvg',
      name: 'SMC Order Block & FVG',
      description: 'Changement de caractère (CHoCH) en unité de temps supérieure, mitigation d\'un Order Block non testé.',
      assetClass: ['INDICES', 'CRYPTO', 'FOREX', 'COMMODITIES'],
      preferredTimeframe: '15m',
      preferredSession: 'London',
      rules: [
        'Identifier la tendance HTF (4H / 1H)',
        'Attendre un CHoCH propre en 15m / 5m',
        'Marquer l\'Order Block originel avec imbalance',
        'Placement de l\'ordre limite au 50% de l\'OB (Equilibrium)',
        'Invalidation si clôture au-delà de l\'OB',
      ],
    },
    {
      id: 'crypto-break-retest',
      name: 'Breakout & Retest Volume',
      description: 'Cassure d\'une zone de compression majeure avec pic de volume puis retest chirurgical.',
      assetClass: ['CRYPTO'],
      preferredTimeframe: '1H',
      preferredSession: 'Asian',
      rules: [
        'Zone de consolidation de plus de 48h',
        'Cassure franche avec volume supérieur à 2x la moyenne 20 MA',
        'Retest en bougie de rejet (pinbar / engulfing)',
        'Risk max 1.5% du capital',
      ],
    },
    {
      id: 'gold-liquidity-sweep',
      name: 'Gold (XAU) London Sweep',
      description: 'Faux breakout des plus hauts/bas de la session asiatique lors de l\'ouverture de Londres (08:00 UTC).',
      assetClass: ['COMMODITIES'],
      preferredTimeframe: '5m',
      preferredSession: 'London',
      rules: [
        'Marquer Asia High et Asia Low à 07:45 UTC',
        'Attendre le sweep agressif de Londres',
        'Entrée en contre-tendance sur bougie de réintégration 5m',
        'Target : Asia Low ou Equilibrium du range',
      ],
    },
  ];

  for (const pb of defaultPlaybooks) {
    try {
      await playbookRepository.upsert({
        id: pb.id,
        userId: undefined, // Global system strategy
        name: pb.name,
        description: pb.description,
        assetClass: pb.assetClass,
        preferredTimeframe: pb.preferredTimeframe,
        preferredSession: pb.preferredSession,
        rules: pb.rules,
        createdAt: new Date().toISOString(),
      });
      console.log(`[Seed] Playbook seeded: ${pb.name}`);
    } catch (err: any) {
      console.error(`[Seed Error] Playbook ${pb.id}:`, err.message);
    }
  }

  console.log('✅ Database seeding finished.');
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Fatal Error]:', err);
      process.exit(1);
    });
}
