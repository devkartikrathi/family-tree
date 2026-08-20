/**
 * Fills a tree with a realistic family so the canvas, map and timeline have
 * something to show on a fresh database.
 *
 *   bun run seed -- --user <clerk-user-id>
 *
 * Without --user it attaches the tree to the first user in the database, which
 * is what you want after signing in once locally.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const argOf = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

interface Seed {
  key: string;
  givenName: string;
  familyName: string;
  sex: 'MALE' | 'FEMALE';
  birthDate?: string;
  birthPlace?: string;
  birthLat?: number;
  birthLng?: number;
  isLiving?: boolean;
  deathDate?: string;
  deathPlace?: string;
  deathLat?: number;
  deathLng?: number;
  residencePlace?: string;
  residenceLat?: number;
  residenceLng?: number;
  occupation?: string;
  maidenName?: string;
  bio?: string;
}

const JAIPUR = { lat: 26.9124, lng: 75.7873 };
const DELHI = { lat: 28.6139, lng: 77.209 };
const MUMBAI = { lat: 19.076, lng: 72.8777 };
const PUNE = { lat: 18.5204, lng: 73.8567 };
const LONDON = { lat: 51.5072, lng: -0.1276 };
const BENGALURU = { lat: 12.9716, lng: 77.5946 };

const PEOPLE: Seed[] = [
  {
    key: 'ramesh', givenName: 'Ramesh', familyName: 'Rathi', sex: 'MALE',
    birthDate: '1935-04-02', birthPlace: 'Jaipur, Rajasthan, India', ...prefix(JAIPUR, 'birth'),
    isLiving: false, deathDate: '2011-09-14', deathPlace: 'Delhi, India', ...prefix(DELHI, 'death'),
    occupation: 'Schoolteacher',
    bio: 'Kept bees behind the house in Jaipur and wrote to every one of his children on Sundays, in fountain pen, until the year he died.',
  },
  {
    key: 'sunita', givenName: 'Sunita', familyName: 'Rathi', maidenName: 'Sharma', sex: 'FEMALE',
    birthDate: '1938-11-19', birthPlace: 'Jaipur, Rajasthan, India', ...prefix(JAIPUR, 'birth'),
    isLiving: false, deathDate: '2019-02-03', deathPlace: 'Delhi, India', ...prefix(DELHI, 'death'),
    occupation: 'Seamstress',
    bio: 'Could name every person in a wedding photograph forty years after it was taken.',
  },
  {
    key: 'kamala', givenName: 'Kamala', familyName: 'Rathi', maidenName: 'Verma', sex: 'FEMALE',
    birthDate: '1948', birthPlace: 'Ajmer, Rajasthan, India',
    residencePlace: 'Delhi, India', ...prefix(DELHI, 'residence'),
  },

  {
    key: 'anil', givenName: 'Anil', familyName: 'Rathi', sex: 'MALE',
    birthDate: '1960-06-30', birthPlace: 'Jaipur, Rajasthan, India', ...prefix(JAIPUR, 'birth'),
    residencePlace: 'Delhi, India', ...prefix(DELHI, 'residence'),
    occupation: 'Civil engineer',
    bio: 'Moved to Delhi for the metro project in 1998 and never moved back.',
  },
  {
    key: 'priya', givenName: 'Priya', familyName: 'Rathi', maidenName: 'Nair', sex: 'FEMALE',
    birthDate: '1962-01-22', birthPlace: 'Mumbai, Maharashtra, India', ...prefix(MUMBAI, 'birth'),
    residencePlace: 'Delhi, India', ...prefix(DELHI, 'residence'),
    occupation: 'Paediatrician',
  },
  {
    key: 'deepa', givenName: 'Deepa', familyName: 'Kulkarni', maidenName: 'Rathi', sex: 'FEMALE',
    birthDate: '1963-08-08', birthPlace: 'Jaipur, Rajasthan, India', ...prefix(JAIPUR, 'birth'),
    residencePlace: 'Pune, Maharashtra, India', ...prefix(PUNE, 'residence'),
    occupation: 'Archivist',
  },
  {
    key: 'suresh', givenName: 'Suresh', familyName: 'Kulkarni', sex: 'MALE',
    birthDate: '1961-03-17', birthPlace: 'Pune, Maharashtra, India', ...prefix(PUNE, 'birth'),
    residencePlace: 'Pune, Maharashtra, India', ...prefix(PUNE, 'residence'),
    occupation: 'Botanist',
  },
  {
    key: 'nikhil', givenName: 'Nikhil', familyName: 'Rathi', sex: 'MALE',
    birthDate: '1975-05-04', birthPlace: 'Delhi, India', ...prefix(DELHI, 'birth'),
    residencePlace: 'London, United Kingdom', ...prefix(LONDON, 'residence'),
    occupation: 'Chef',
    bio: 'Half-brother to Anil and Deepa. Opened a restaurant in Southall that serves his mother’s recipes.',
  },

  {
    key: 'meera', givenName: 'Meera', familyName: 'Rathi', sex: 'FEMALE',
    birthDate: '1990-09-12', birthPlace: 'Delhi, India', ...prefix(DELHI, 'birth'),
    residencePlace: 'Bengaluru, Karnataka, India', ...prefix(BENGALURU, 'residence'),
    occupation: 'Software engineer',
  },
  {
    key: 'arjun', givenName: 'Arjun', familyName: 'Rathi', sex: 'MALE',
    birthDate: '1994-02-26', birthPlace: 'Delhi, India', ...prefix(DELHI, 'birth'),
    residencePlace: 'Delhi, India', ...prefix(DELHI, 'residence'),
    occupation: 'Documentary editor',
  },
  {
    key: 'kavya', givenName: 'Kavya', familyName: 'Kulkarni', sex: 'FEMALE',
    birthDate: '1996-07-19', birthPlace: 'Pune, Maharashtra, India', ...prefix(PUNE, 'birth'),
    residencePlace: 'Pune, Maharashtra, India', ...prefix(PUNE, 'residence'),
    occupation: 'Veterinarian',
  },
  {
    key: 'rohan', givenName: 'Rohan', familyName: 'Rathi', sex: 'MALE',
    birthDate: '2001-12-01', birthPlace: 'London, United Kingdom', ...prefix(LONDON, 'birth'),
    residencePlace: 'London, United Kingdom', ...prefix(LONDON, 'residence'),
  },

  {
    key: 'ishaan', givenName: 'Ishaan', familyName: 'Rathi', sex: 'MALE',
    birthDate: '2021-04-09', birthPlace: 'Bengaluru, Karnataka, India', ...prefix(BENGALURU, 'birth'),
    residencePlace: 'Bengaluru, Karnataka, India', ...prefix(BENGALURU, 'residence'),
  },
];

function prefix(point: { lat: number; lng: number }, kind: 'birth' | 'death' | 'residence') {
  return { [`${kind}Lat`]: point.lat, [`${kind}Lng`]: point.lng } as Record<string, number>;
}

async function main() {
  const userId = argOf('--user') ?? (await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } }))?.id;

  if (!userId) {
    console.error(
      'No user found. Sign in to the app once so your account exists, then run this again.',
    );
    process.exitCode = 1;
    return;
  }

  const tree = await prisma.tree.create({
    data: {
      name: 'The Rathi Family',
      description:
        'Four generations out of Jaipur — the ones who stayed, the ones who went to Delhi, and the one who ended up in London.',
      createdById: userId,
      members: { create: { userId, role: 'CREATOR' } },
    },
    select: { id: true },
  });

  const ids = new Map<string, string>();
  for (const seed of PEOPLE) {
    const { key, ...fields } = seed;
    const person = await prisma.person.create({
      data: { ...fields, treeId: tree.id, isLiving: fields.isLiving ?? true, createdById: userId },
      select: { id: true },
    });
    ids.set(key, person.id);
  }

  const id = (key: string) => ids.get(key)!;

  const marry = async (
    a: string,
    b: string,
    options: { startDate?: string; place?: string; status?: 'CURRENT' | 'DIVORCED' | 'WIDOWED' } = {},
  ) => {
    const union = await prisma.union.create({
      data: {
        treeId: tree.id,
        kind: 'MARRIAGE',
        status: options.status ?? 'CURRENT',
        startDate: options.startDate,
        place: options.place,
        createdById: userId,
        partners: { create: [{ personId: id(a) }, { personId: id(b) }] },
      },
      select: { id: true },
    });
    return union.id;
  };

  const rameshSunita = await marry('ramesh', 'sunita', {
    startDate: '1958-02-14',
    place: 'Jaipur, Rajasthan, India',
    status: 'WIDOWED',
  });
  const rameshKamala = await marry('ramesh', 'kamala', { startDate: '1973', place: 'Delhi, India' });
  const anilPriya = await marry('anil', 'priya', { startDate: '1987-11-29', place: 'Mumbai, Maharashtra, India' });
  const deepaSuresh = await marry('deepa', 'suresh', { startDate: '1991-05-02', place: 'Pune, Maharashtra, India' });
  const child = async (
    childKey: string,
    parents: [string, string] | [string],
    unionId: string | null,
    kind: 'BIOLOGICAL' | 'ADOPTED' = 'BIOLOGICAL',
  ) => {
    await prisma.parentChild.createMany({
      data: parents.map((parentKey) => ({
        treeId: tree.id,
        parentId: id(parentKey),
        childId: id(childKey),
        unionId,
        kind,
        createdById: userId,
      })),
      skipDuplicates: true,
    });
  };

  await child('anil', ['ramesh', 'sunita'], rameshSunita);
  await child('deepa', ['ramesh', 'sunita'], rameshSunita);
  await child('nikhil', ['ramesh', 'kamala'], rameshKamala);

  await child('meera', ['anil', 'priya'], anilPriya);
  await child('arjun', ['anil', 'priya'], anilPriya, 'ADOPTED');
  await child('kavya', ['deepa', 'suresh'], deepaSuresh);
  await child('rohan', ['nikhil'], null);

  await child('ishaan', ['meera'], null);

  await prisma.treeEvent.create({
    data: {
      treeId: tree.id,
      actorId: userId,
      action: 'tree.created',
      subject: 'The Rathi Family',
    },
  });

  console.log(`Seeded "The Rathi Family" with ${PEOPLE.length} people.`);
  console.log(`Open it at /tree/${tree.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
