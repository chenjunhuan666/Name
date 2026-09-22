import {
  NAMING_RETRIEVAL,
  type NamingRetrievalQuota,
} from '../../../config/namingRetrieval';
import type {
  ElementTendency,
  NamingCharacter,
  NamingPreference,
} from '../../../types';
import { filterCharacterPool } from '../filters/characterFilter';
import { rankNamingCharacters } from './buckets';

const QUOTA_ORDER: NamingRetrievalQuota[] = [
  'element',
  'style',
  'gender',
  'classic',
  'exploration',
];

export interface RetrievalSelectionOptions {
  characters: readonly NamingCharacter[];
  tendencies?: ElementTendency[];
  preference?: NamingPreference;
  classicCharacters: ReadonlySet<string>;
  targetCount?: number;
  legacyFloorCount?: number;
}

export interface RetrievalQuotaUsage {
  target: number;
  selected: number;
}

export interface RetrievalSelectionResult {
  candidates: NamingCharacter[];
  constraintSatisfied: boolean;
  missingIncludedCharacters: string[];
  assignments: Record<string, string[]>;
  quotaUsage: Record<NamingRetrievalQuota, RetrievalQuotaUsage>;
}

function matchesGender(
  character: NamingCharacter,
  preference?: NamingPreference,
): boolean {
  return (
    !preference ||
    preference.genderExpression === 'neutral' ||
    character.gender === 'neutral' ||
    (preference.genderExpression === 'masculine' &&
      character.gender === 'male') ||
    (preference.genderExpression === 'feminine' &&
      character.gender === 'female')
  );
}

function buildBuckets(
  ranked: readonly NamingCharacter[],
  tendencies: ElementTendency[] | undefined,
  preference: NamingPreference | undefined,
  classicCharacters: ReadonlySet<string>,
): Record<NamingRetrievalQuota, NamingCharacter[]> {
  const preferredElements = new Set(
    (tendencies ?? [])
      .filter(({ level }) => level >= 4)
      .map(({ element }) => element),
  );
  const preferredStyles = new Set<string>(preference?.styles ?? []);

  return {
    element: ranked.filter((character) => {
      const elements = Array.isArray(character.element)
        ? character.element
        : [character.element];
      return elements.some((element) => preferredElements.has(element));
    }),
    style: ranked.filter((character) =>
      character.styleTags.some((style) => preferredStyles.has(style)),
    ),
    gender: ranked.filter((character) => matchesGender(character, preference)),
    classic: ranked.filter((character) =>
      classicCharacters.has(character.char),
    ),
    exploration: [...ranked].sort(
      (left, right) =>
        right.rarity - left.rarity ||
        left.char.localeCompare(right.char, 'zh-CN'),
    ),
  };
}

function emptyQuotaUsage(targetCount: number) {
  return Object.fromEntries(
    QUOTA_ORDER.map((quota) => [
      quota,
      {
        target: Math.floor(
          targetCount * NAMING_RETRIEVAL.quotaRatios[quota],
        ),
        selected: 0,
      },
    ]),
  ) as Record<NamingRetrievalQuota, RetrievalQuotaUsage>;
}

export function selectRetrievalCandidates({
  characters,
  tendencies,
  preference,
  classicCharacters,
  targetCount = NAMING_RETRIEVAL.targetCharacterCount,
  legacyFloorCount = NAMING_RETRIEVAL.legacyFloorCount,
}: RetrievalSelectionOptions): RetrievalSelectionResult {
  const safeTarget = Math.max(0, Math.floor(targetCount));
  const quotaUsage = emptyQuotaUsage(safeTarget);
  const eligible = filterCharacterPool(characters, preference);
  const eligibleByCharacter = new Map(
    eligible.map((character) => [character.char, character]),
  );
  const included = [...new Set(preference?.includeCharacters ?? [])].sort(
    (left, right) => left.localeCompare(right, 'zh-CN'),
  );
  const missingIncludedCharacters = included.filter(
    (character) => !eligibleByCharacter.has(character),
  );

  if (missingIncludedCharacters.length > 0 || safeTarget === 0) {
    return {
      candidates: [],
      constraintSatisfied: missingIncludedCharacters.length === 0,
      missingIncludedCharacters,
      assignments: {},
      quotaUsage,
    };
  }

  const ranked = rankNamingCharacters(eligible, tendencies, preference);
  const buckets = buildBuckets(
    ranked,
    tendencies,
    preference,
    classicCharacters,
  );
  const selected = new Map<string, NamingCharacter>();
  const assignments: Record<string, string[]> = {};

  function recordAssignment(character: NamingCharacter, assignment: string) {
    assignments[character.char] ??= [];
    if (!assignments[character.char].includes(assignment)) {
      assignments[character.char].push(assignment);
    }
  }

  function add(character: NamingCharacter, assignment: string): boolean {
    if (selected.has(character.char)) {
      recordAssignment(character, assignment);
      return false;
    }
    if (selected.size >= safeTarget) {
      return false;
    }
    selected.set(character.char, character);
    recordAssignment(character, assignment);
    return true;
  }

  included.forEach((character) => {
    const candidate = eligibleByCharacter.get(character);
    if (candidate) {
      add(candidate, 'included');
    }
  });

  ranked
    .slice(0, Math.min(legacyFloorCount, safeTarget))
    .forEach((character) => add(character, 'legacy-floor'));

  QUOTA_ORDER.forEach((quota) => {
    const usage = quotaUsage[quota];
    for (const character of buckets[quota]) {
      if (usage.selected >= usage.target) {
        break;
      }
      if (selected.has(character.char)) {
        recordAssignment(character, quota);
        usage.selected += 1;
      }
    }
    for (const character of buckets[quota]) {
      if (usage.selected >= usage.target || selected.size >= safeTarget) {
        break;
      }
      if (add(character, quota)) {
        usage.selected += 1;
      }
    }
  });

  for (const character of ranked) {
    if (selected.size >= safeTarget) {
      break;
    }
    add(character, 'deterministic-fill');
  }

  selected.forEach((character) => {
    const commonnessTag = character.rarity <= 0.25 ? 'common' : 'distinctive';
    recordAssignment(character, commonnessTag);
  });

  return {
    candidates: [...selected.values()],
    constraintSatisfied: true,
    missingIncludedCharacters,
    assignments,
    quotaUsage,
  };
}
