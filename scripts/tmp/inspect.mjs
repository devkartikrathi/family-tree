import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const rows = await p.$queryRawUnsafe(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = current_schema() ORDER BY table_name`);
console.log('tables:', rows.map(r => r.table_name).join(', ') || '(none)');
for (const t of ['families','family_nodes','family_edges','family_members','users','_prisma_migrations']) {
  if (!rows.some(r => r.table_name === t)) continue;
  const c = await p.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${t}"`);
  console.log(`  ${t}: ${c[0].n} rows`);
}
await p.$disconnect();
