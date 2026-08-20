import type { ParentLink, Person, Sex, Tree, Union } from './types';
import { parsePartialDate } from './dates';

/**
 * GEDCOM 5.5.1 — the lingua franca of genealogy software. Being able to walk
 * out with your family in a format Ancestry, MyHeritage and Gramps all read is
 * the difference between a product you trust with four generations of history
 * and one you don't.
 */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function toGedcomDate(value?: string | null): string | null {
  const date = parsePartialDate(value);
  if (!date) return null;
  if (date.day && date.month) return `${date.day} ${MONTHS[date.month - 1]} ${date.year}`;
  if (date.month) return `${MONTHS[date.month - 1]} ${date.year}`;
  return String(date.year);
}

function fromGedcomDate(value?: string | null): string | null {
  if (!value) return null;
  const cleaned = value.replace(/^(ABT|EST|CAL|BEF|AFT|FROM|TO)\s+/i, '').trim();

  const dayMonthYear = cleaned.match(/^(\d{1,2})\s+([A-Z]{3})[A-Z]*\s+(\d{4})$/i);
  if (dayMonthYear) {
    const month = MONTHS.indexOf(dayMonthYear[2].toUpperCase().slice(0, 3)) + 1;
    if (month > 0) {
      return `${dayMonthYear[3]}-${String(month).padStart(2, '0')}-${dayMonthYear[1].padStart(2, '0')}`;
    }
  }

  const monthYear = cleaned.match(/^([A-Z]{3})[A-Z]*\s+(\d{4})$/i);
  if (monthYear) {
    const month = MONTHS.indexOf(monthYear[1].toUpperCase().slice(0, 3)) + 1;
    if (month > 0) return `${monthYear[2]}-${String(month).padStart(2, '0')}`;
  }

  const year = cleaned.match(/(\d{4})/);
  return year ? year[1] : null;
}

const SEX_OUT: Record<Sex, string> = { MALE: 'M', FEMALE: 'F', OTHER: 'X', UNKNOWN: 'U' };
const SEX_IN: Record<string, Sex> = { M: 'MALE', F: 'FEMALE', X: 'OTHER', U: 'UNKNOWN' };

/** GEDCOM lines cap at 255 bytes; long notes continue with CONT/CONC. */
function noteLines(level: number, text: string): string[] {
  const lines: string[] = [];
  const paragraphs = text.split(/\r?\n/);
  paragraphs.forEach((paragraph, index) => {
    const tag = index === 0 ? `${level} NOTE` : `${level + 1} CONT`;
    let remaining = paragraph;
    if (remaining === '') {
      lines.push(tag);
      return;
    }
    let first = true;
    while (remaining.length > 0) {
      const chunk = remaining.slice(0, 200);
      remaining = remaining.slice(200);
      lines.push(first ? `${tag} ${chunk}` : `${level + 1} CONC ${chunk}`);
      first = false;
    }
  });
  return lines;
}

export interface GedcomSource {
  tree: Pick<Tree, 'name'>;
  persons: Person[];
  unions: Union[];
  links: ParentLink[];
}

/**
 * A GEDCOM FAM is "a set of parents and their children". Our unions cover the
 * couples; children whose parents were never recorded as a couple still need a
 * family record, so parent-sets are derived from the links as well.
 */
function buildFamilies(source: GedcomSource) {
  const families: { key: string; parentIds: string[]; childIds: string[]; union?: Union }[] = [];
  const byKey = new Map<string, (typeof families)[number]>();

  const keyOf = (ids: string[]) => ids.slice().sort().join('|');

  for (const union of source.unions) {
    const key = keyOf(union.partnerIds);
    const family = { key, parentIds: union.partnerIds.slice(), childIds: [], union };
    families.push(family);
    byKey.set(key, family);
  }

  const parentsOfChild = new Map<string, string[]>();
  for (const link of source.links) {
    const list = parentsOfChild.get(link.childId);
    if (list) list.push(link.parentId);
    else parentsOfChild.set(link.childId, [link.parentId]);
  }

  for (const [childId, parentIds] of parentsOfChild) {
    const key = keyOf(parentIds);
    let family = byKey.get(key);
    if (!family) {
      family = { key, parentIds, childIds: [] };
      families.push(family);
      byKey.set(key, family);
    }
    family.childIds.push(childId);
  }

  return families;
}

export function toGedcom(source: GedcomSource): string {
  const personIds = new Map(source.persons.map((person, index) => [person.id, `@I${index + 1}@`]));
  const families = buildFamilies(source);
  const familyIds = new Map(families.map((family, index) => [family.key, `@F${index + 1}@`]));

  const childOf = new Map<string, string[]>();
  const spouseOf = new Map<string, string[]>();
  for (const family of families) {
    const xref = familyIds.get(family.key)!;
    for (const parentId of family.parentIds) {
      const list = spouseOf.get(parentId);
      if (list) list.push(xref);
      else spouseOf.set(parentId, [xref]);
    }
    for (const childId of family.childIds) {
      const list = childOf.get(childId);
      if (list) list.push(xref);
      else childOf.set(childId, [xref]);
    }
  }

  const now = new Date();
  const lines: string[] = [
    '0 HEAD',
    '1 SOUR Legacy',
    '2 NAME Legacy — collaborative family archive',
    '1 GEDC',
    '2 VERS 5.5.1',
    '2 FORM LINEAGE-LINKED',
    '1 CHAR UTF-8',
    `1 DATE ${now.getUTCDate()} ${MONTHS[now.getUTCMonth()]} ${now.getUTCFullYear()}`,
    `1 FILE ${source.tree.name}`,
  ];

  for (const person of source.persons) {
    const xref = personIds.get(person.id)!;
    lines.push(`0 ${xref} INDI`);

    const given = person.givenName ?? '';
    const surname = person.familyName ?? '';
    lines.push(`1 NAME ${given} /${surname}/`);
    if (given) lines.push(`2 GIVN ${given}`);
    if (surname) lines.push(`2 SURN ${surname}`);
    if (person.nickname) lines.push(`2 NICK ${person.nickname}`);
    if (person.maidenName) lines.push(`1 NAME ${given} /${person.maidenName}/`, '2 TYPE birth');

    lines.push(`1 SEX ${SEX_OUT[person.sex] ?? 'U'}`);

    const birthDate = toGedcomDate(person.birthDate);
    if (birthDate || person.birthPlace) {
      lines.push('1 BIRT');
      if (birthDate) lines.push(`2 DATE ${birthDate}`);
      if (person.birthPlace) lines.push(`2 PLAC ${person.birthPlace}`);
      if (person.birthLat != null && person.birthLng != null) {
        lines.push('3 MAP', `4 LATI ${person.birthLat}`, `4 LONG ${person.birthLng}`);
      }
    }

    const deathDate = toGedcomDate(person.deathDate);
    if (!person.isLiving || deathDate || person.deathPlace) {
      lines.push('1 DEAT');
      if (deathDate) lines.push(`2 DATE ${deathDate}`);
      if (person.deathPlace) lines.push(`2 PLAC ${person.deathPlace}`);
    }

    if (person.residencePlace) {
      lines.push('1 RESI', `2 PLAC ${person.residencePlace}`);
    }
    if (person.occupation) lines.push(`1 OCCU ${person.occupation}`);
    if (person.bio) lines.push(...noteLines(1, person.bio));
    if (person.photoUrl) lines.push('1 OBJE', `2 FILE ${person.photoUrl}`, '2 FORM jpg');

    for (const xrefFam of childOf.get(person.id) ?? []) lines.push(`1 FAMC ${xrefFam}`);
    for (const xrefFam of spouseOf.get(person.id) ?? []) lines.push(`1 FAMS ${xrefFam}`);
  }

  for (const family of families) {
    const xref = familyIds.get(family.key)!;
    lines.push(`0 ${xref} FAM`);

    const parents = family.parentIds.map((id) => source.persons.find((p) => p.id === id));
    const husband = parents.find((p) => p?.sex === 'MALE') ?? parents[0];
    const wife = parents.find((p) => p && p !== husband);

    if (husband) lines.push(`1 HUSB ${personIds.get(husband.id)}`);
    if (wife) lines.push(`1 WIFE ${personIds.get(wife.id)}`);

    if (family.union) {
      const marriageDate = toGedcomDate(family.union.startDate);
      if (marriageDate || family.union.place || family.union.kind === 'MARRIAGE') {
        lines.push('1 MARR');
        if (marriageDate) lines.push(`2 DATE ${marriageDate}`);
        if (family.union.place) lines.push(`2 PLAC ${family.union.place}`);
      }
      if (family.union.status === 'DIVORCED') {
        lines.push('1 DIV');
        const endDate = toGedcomDate(family.union.endDate);
        if (endDate) lines.push(`2 DATE ${endDate}`);
      }
      if (family.union.note) lines.push(...noteLines(1, family.union.note));
    }

    for (const childId of family.childIds) lines.push(`1 CHIL ${personIds.get(childId)}`);
  }

  lines.push('0 TRLR');
  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export interface ImportedPerson {
  ref: string;
  givenName: string;
  familyName: string | null;
  nickname: string | null;
  sex: Sex;
  birthDate: string | null;
  birthPlace: string | null;
  isLiving: boolean;
  deathDate: string | null;
  deathPlace: string | null;
  residencePlace: string | null;
  occupation: string | null;
  bio: string | null;
}

export interface ImportedFamily {
  ref: string;
  husbandRef: string | null;
  wifeRef: string | null;
  childRefs: string[];
  marriageDate: string | null;
  marriagePlace: string | null;
  divorced: boolean;
}

export interface ImportResult {
  persons: ImportedPerson[];
  families: ImportedFamily[];
  warnings: string[];
}

interface GedLine {
  level: number;
  xref: string | null;
  tag: string;
  value: string;
}

function tokenize(text: string): GedLine[] {
  const lines: GedLine[] = [];
  for (const raw of text.split(/\r\n|\r|\n/)) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const match = line.match(/^\s*(\d+)\s+(?:(@[^@]+@)\s+)?(\S+)(?:\s(.*))?$/);
    if (!match) continue;
    lines.push({
      level: Number(match[1]),
      xref: match[2] ?? null,
      tag: match[3].toUpperCase(),
      value: match[4] ?? '',
    });
  }
  return lines;
}

/** Parses the subset of GEDCOM that carries a family: names, dates, places, links. */
export function parseGedcom(text: string): ImportResult {
  const lines = tokenize(text);
  const persons: ImportedPerson[] = [];
  const families: ImportedFamily[] = [];
  const warnings: string[] = [];

  let person: ImportedPerson | null = null;
  let family: ImportedFamily | null = null;
  /** Which level-1 event we are currently inside (BIRT, DEAT, MARR…). */
  let section: string | null = null;
  let noteTarget: 'person' | null = null;

  const flush = () => {
    if (person) persons.push(person);
    if (family) families.push(family);
    person = null;
    family = null;
    section = null;
    noteTarget = null;
  };

  for (const line of lines) {
    if (line.level === 0) {
      flush();
      if (line.tag === 'INDI' && line.xref) {
        person = {
          ref: line.xref,
          givenName: '',
          familyName: null,
          nickname: null,
          sex: 'UNKNOWN',
          birthDate: null,
          birthPlace: null,
          isLiving: true,
          deathDate: null,
          deathPlace: null,
          residencePlace: null,
          occupation: null,
          bio: null,
        };
      } else if (line.tag === 'FAM' && line.xref) {
        family = {
          ref: line.xref,
          husbandRef: null,
          wifeRef: null,
          childRefs: [],
          marriageDate: null,
          marriagePlace: null,
          divorced: false,
        };
      }
      continue;
    }

    if (person) {
      if (line.level === 1) {
        section = line.tag;
        noteTarget = null;

        switch (line.tag) {
          case 'NAME': {
            if (!person.givenName && !person.familyName) {
              const match = line.value.match(/^([^/]*)\/([^/]*)\/?/);
              person.givenName = (match ? match[1] : line.value).trim();
              person.familyName = match?.[2].trim() || null;
            }
            break;
          }
          case 'SEX':
            person.sex = SEX_IN[line.value.trim().toUpperCase()] ?? 'UNKNOWN';
            break;
          case 'DEAT':
            person.isLiving = false;
            break;
          case 'OCCU':
            person.occupation = line.value || null;
            break;
          case 'NOTE':
            person.bio = line.value || null;
            noteTarget = 'person';
            break;
        }
        continue;
      }

      if (line.level >= 2) {
        if (line.tag === 'GIVN' && line.value) person.givenName = line.value.trim();
        else if (line.tag === 'SURN' && line.value) person.familyName = line.value.trim();
        else if (line.tag === 'NICK' && line.value) person.nickname = line.value.trim();
        else if (line.tag === 'DATE') {
          if (section === 'BIRT') person.birthDate = fromGedcomDate(line.value);
          else if (section === 'DEAT') person.deathDate = fromGedcomDate(line.value);
        } else if (line.tag === 'PLAC') {
          if (section === 'BIRT') person.birthPlace = line.value || null;
          else if (section === 'DEAT') person.deathPlace = line.value || null;
          else if (section === 'RESI') person.residencePlace = line.value || null;
        } else if ((line.tag === 'CONT' || line.tag === 'CONC') && noteTarget === 'person') {
          const separator = line.tag === 'CONT' ? '\n' : '';
          person.bio = `${person.bio ?? ''}${separator}${line.value}`;
        }
      }
      continue;
    }

    if (family && line.level === 1) {
      section = line.tag;
      switch (line.tag) {
        case 'HUSB':
          family.husbandRef = line.value.trim() || null;
          break;
        case 'WIFE':
          family.wifeRef = line.value.trim() || null;
          break;
        case 'CHIL':
          if (line.value.trim()) family.childRefs.push(line.value.trim());
          break;
        case 'DIV':
          family.divorced = true;
          break;
      }
      continue;
    }

    if (family && line.level >= 2 && section === 'MARR') {
      if (line.tag === 'DATE') family.marriageDate = fromGedcomDate(line.value);
      else if (line.tag === 'PLAC') family.marriagePlace = line.value || null;
    }
  }

  flush();

  for (const imported of persons) {
    if (!imported.givenName) {
      imported.givenName = 'Unknown';
      warnings.push(`A record (${imported.ref}) had no readable name and was imported as "Unknown".`);
    }
  }

  if (persons.length === 0) warnings.push('No individuals were found in that file.');

  return { persons, families, warnings };
}
