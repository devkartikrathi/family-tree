import { describe, expect, it } from 'vitest';
import { parseGedcom, toGedcom } from './gedcom';
import { childOf, person, union } from './test-fixtures';
import type { Tree } from './types';

const tree = { name: 'The Rathi Family' } as Pick<Tree, 'name'>;

function sampleFamily() {
  const grandad = person('Ramesh', {
    familyName: 'Rathi',
    sex: 'MALE',
    birthDate: '1935-04-02',
    birthPlace: 'Jaipur, Rajasthan, India',
    isLiving: false,
    deathDate: '2011',
    deathPlace: 'Delhi, India',
    occupation: 'Schoolteacher',
    bio: 'Kept bees.\nWrote letters every Sunday.',
  });
  const granny = person('Sunita', { familyName: 'Rathi', sex: 'FEMALE', birthDate: '1938-11' });
  const marriage = union(grandad, granny, { startDate: '1958-02-14', place: 'Jaipur' });

  const dad = person('Anil', { familyName: 'Rathi', sex: 'MALE', birthDate: '1960' });
  const aunt = person('Deepa', { familyName: 'Rathi', sex: 'FEMALE', birthDate: '1963' });

  return {
    persons: [grandad, granny, dad, aunt],
    unions: [marriage],
    links: [
      ...childOf(marriage, [grandad, granny], dad),
      ...childOf(marriage, [grandad, granny], aunt),
    ],
  };
}

describe('toGedcom', () => {
  const source = sampleFamily();
  const text = toGedcom({ tree, ...source });

  it('writes a well-formed header and trailer', () => {
    expect(text.startsWith('0 HEAD\n')).toBe(true);
    expect(text.trimEnd().endsWith('0 TRLR')).toBe(true);
    expect(text).toContain('2 VERS 5.5.1');
    expect(text).toContain('1 CHAR UTF-8');
  });

  it('writes names in the slashed surname form', () => {
    expect(text).toContain('1 NAME Ramesh /Rathi/');
    expect(text).toContain('2 GIVN Ramesh');
    expect(text).toContain('2 SURN Rathi');
  });

  it('writes dates at whatever precision we hold', () => {
    expect(text).toContain('2 DATE 2 APR 1935');
    expect(text).toContain('2 DATE NOV 1938');
    expect(text).toContain('2 DATE 2011');
  });

  it('links each child to the family record', () => {
    const familyLines = text.split('\n').filter((line) => line.startsWith('1 CHIL'));
    expect(familyLines).toHaveLength(2);
  });

  it('splits a multi-line note into NOTE and CONT', () => {
    expect(text).toContain('1 NOTE Kept bees.');
    expect(text).toContain('2 CONT Wrote letters every Sunday.');
  });

  it('never emits a line longer than the GEDCOM limit', () => {
    const long = person('X'.repeat(10), { bio: 'y'.repeat(900) });
    const output = toGedcom({ tree, persons: [long], unions: [], links: [] });
    for (const line of output.split('\n')) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(255);
    }
  });
});

describe('parseGedcom', () => {
  it('round-trips a family through export and import', () => {
    const source = sampleFamily();
    const parsed = parseGedcom(toGedcom({ tree, ...source }));

    expect(parsed.persons).toHaveLength(4);
    expect(parsed.warnings).toEqual([]);

    const ramesh = parsed.persons.find((p) => p.givenName === 'Ramesh')!;
    expect(ramesh.familyName).toBe('Rathi');
    expect(ramesh.sex).toBe('MALE');
    expect(ramesh.birthDate).toBe('1935-04-02');
    expect(ramesh.birthPlace).toBe('Jaipur, Rajasthan, India');
    expect(ramesh.isLiving).toBe(false);
    expect(ramesh.deathDate).toBe('2011');
    expect(ramesh.occupation).toBe('Schoolteacher');
    expect(ramesh.bio).toContain('Kept bees.');

    const sunita = parsed.persons.find((p) => p.givenName === 'Sunita')!;
    expect(sunita.birthDate).toBe('1938-11');
    expect(sunita.isLiving).toBe(true);

    expect(parsed.families).toHaveLength(1);
    const [family] = parsed.families;
    expect(family.marriageDate).toBe('1958-02-14');
    expect(family.marriagePlace).toBe('Jaipur');
    expect(family.childRefs).toHaveLength(2);
  });

  it('reads files from other software, quirks and all', () => {
    const foreign = [
      '0 HEAD',
      '1 CHAR UTF-8',
      '0 @I100@ INDI',
      '1 NAME Mary Jane /O\'Brien/',
      '1 SEX F',
      '1 BIRT',
      '2 DATE ABT 1902',
      '2 PLAC Cork, Ireland',
      '1 DEAT',
      '2 DATE 3 SEP 1988',
      '0 @I101@ INDI',
      '1 NAME Patrick /O\'Brien/',
      '1 SEX M',
      '0 @F1@ FAM',
      '1 HUSB @I101@',
      '1 WIFE @I100@',
      '1 MARR',
      '2 DATE 1925',
      '1 DIV',
      '0 TRLR',
    ].join('\r\n');

    const parsed = parseGedcom(foreign);

    const mary = parsed.persons.find((p) => p.givenName === 'Mary Jane')!;
    expect(mary.familyName).toBe("O'Brien");
    expect(mary.birthDate).toBe('1902'); // "ABT 1902" degrades to the year
    expect(mary.deathDate).toBe('1988-09-03');
    expect(mary.isLiving).toBe(false);

    expect(parsed.families[0]).toMatchObject({
      husbandRef: '@I101@',
      wifeRef: '@I100@',
      marriageDate: '1925',
      divorced: true,
    });
  });

  it('reports a nameless record instead of dropping it', () => {
    const parsed = parseGedcom(['0 HEAD', '0 @I1@ INDI', '1 SEX M', '0 TRLR'].join('\n'));
    expect(parsed.persons[0].givenName).toBe('Unknown');
    expect(parsed.warnings[0]).toContain('Unknown');
  });

  it('warns rather than throws on an empty file', () => {
    expect(parseGedcom('0 HEAD\n0 TRLR').warnings[0]).toContain('No individuals');
  });
});
