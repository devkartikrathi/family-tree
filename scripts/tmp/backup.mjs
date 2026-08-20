import { PrismaClient } from '@prisma/client';
import { writeFile } from 'node:fs/promises';

const prisma = new PrismaClient();
const tables = ['users', 'families', 'family_members', 'family_nodes', 'family_edges', '_prisma_migrations'];
const dump = { takenAt: new Date().toISOString(), tables: {} };

for (const table of tables) {
  dump.tables[table] = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}"`);
}

const path = `backup-v1-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
await writeFile(path, JSON.stringify(dump, (_, v) => (typeof v === 'bigint' ? String(v) : v), 2));
console.log(`Wrote ${path}`);
for (const [table, rows] of Object.entries(dump.tables)) console.log(`  ${table}: ${rows.length}`);
await prisma.$disconnect();
