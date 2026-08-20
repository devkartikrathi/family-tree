import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const trees = await p.tree.findMany({
  include: { _count: { select: { persons: true, unions: true, links: true, members: true } } },
  orderBy: { createdAt: 'asc' },
});

for (const t of trees) {
  console.log(`${t.name}  (${t.id})`);
  console.log(`   ${t._count.persons} people · ${t._count.unions} unions · ${t._count.links} links · ${t._count.members} members`);
}

const sample = await p.person.findMany({
  take: 6,
  orderBy: { createdAt: 'asc' },
  select: { givenName: true, familyName: true, birthDate: true, isLiving: true, residencePlace: true, residenceLat: true },
});
console.log('\nsample people:');
for (const s of sample) {
  console.log(`   ${s.givenName} ${s.familyName ?? ''} | b.${s.birthDate ?? '?'} | ${s.isLiving ? 'living' : 'deceased'} | ${s.residencePlace ?? '-'}${s.residenceLat ? ` (${s.residenceLat})` : ''}`);
}

const orphanUnions = await p.union.findMany({ include: { partners: true } });
console.log(`\nunions with <2 partners: ${orphanUnions.filter(u => u.partners.length < 2).length}`);
await p.$disconnect();
