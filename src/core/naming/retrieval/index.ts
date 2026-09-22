import { NAMING_RETRIEVAL } from '../../../config/namingRetrieval';
import { GENERATOR_LIMITS } from '../../../config/namingScore';
import type { ClassicWork } from '../../../types';
import type { GenerateNamesOptions } from '../nameGenerator';
import { selectRetrievalCandidates } from './candidateSelector';
import { searchNamePairs } from './pairSearch';

export interface NamingRetrievalConfig {
  targetCharacterCount?: number;
  legacyFloorCount?: number;
  beamWidthPerFirst?: number;
}

export interface NamingRetrievalDiagnostics {
  constraintSatisfied: boolean;
  missingIncludedCharacters: string[];
  sourceCharacterCount: number;
  selectedCharacterCount: number;
  consideredPairCount: number;
  beamCandidateCount: number;
  fullScoreCandidateCount: number;
  resultSignature: string;
}

export interface GenerateNamesV3Result {
  names: ReturnType<typeof searchNamePairs>['names'];
  diagnostics: NamingRetrievalDiagnostics;
}

function collectClassicCharacters(classicWorks: readonly ClassicWork[]) {
  const characters = new Set<string>();
  classicWorks.forEach((work) => {
    work.lines.forEach((line) => {
      [...line].forEach((character) => characters.add(character));
    });
    work.imageryNames?.forEach(({ givenName }) => {
      [...givenName].forEach((character) => characters.add(character));
    });
  });
  return characters;
}

function resultSignature(values: readonly string[]): string {
  const seeds = [
    0xcbf29ce484222325n,
    0x84222325cbf29ce4n,
    0x9e3779b185ebca87n,
    0x100000001b3n,
  ];
  const mask = 0xffffffffffffffffn;
  return seeds
    .map((seed, seedIndex) => {
      let hash = seed;
      const input = `${seedIndex}:${values.join('|')}`;
      for (const character of input) {
        hash ^= BigInt(character.codePointAt(0) ?? 0);
        hash = (hash * 0x100000001b3n) & mask;
      }
      return hash.toString(16).padStart(16, '0');
    })
    .join('');
}

export function generateNamesV3WithDiagnostics(
  options: GenerateNamesOptions,
  config: NamingRetrievalConfig = {},
): GenerateNamesV3Result {
  const normalizedSurname = options.surname.trim();
  const limit = options.limit ?? GENERATOR_LIMITS.defaultResultLimit;
  if (
    !normalizedSurname ||
    options.characters.length < GENERATOR_LIMITS.minimumCharacterPool ||
    limit <= 0
  ) {
    return {
      names: [],
      diagnostics: {
        constraintSatisfied: true,
        missingIncludedCharacters: [],
        sourceCharacterCount: options.characters.length,
        selectedCharacterCount: 0,
        consideredPairCount: 0,
        beamCandidateCount: 0,
        fullScoreCandidateCount: 0,
        resultSignature: resultSignature([]),
      },
    };
  }

  const selection = selectRetrievalCandidates({
    characters: options.characters,
    tendencies: options.tendencies,
    preference: options.preference,
    classicCharacters: collectClassicCharacters(options.classicWorks ?? []),
    targetCount:
      config.targetCharacterCount ?? NAMING_RETRIEVAL.targetCharacterCount,
    legacyFloorCount:
      config.legacyFloorCount ?? NAMING_RETRIEVAL.legacyFloorCount,
  });
  if (!selection.constraintSatisfied) {
    return {
      names: [],
      diagnostics: {
        constraintSatisfied: false,
        missingIncludedCharacters: selection.missingIncludedCharacters,
        sourceCharacterCount: options.characters.length,
        selectedCharacterCount: 0,
        consideredPairCount: 0,
        beamCandidateCount: 0,
        fullScoreCandidateCount: 0,
        resultSignature: resultSignature([]),
      },
    };
  }

  const pairResult = searchNamePairs({
    surname: normalizedSurname,
    characters: selection.candidates,
    tendencies: options.tendencies,
    pronunciations: options.pronunciations,
    classicWorks: options.classicWorks,
    preference: options.preference,
    limit,
    beamWidthPerFirst:
      config.beamWidthPerFirst ?? NAMING_RETRIEVAL.beamWidthPerFirst,
  });

  return {
    names: pairResult.names,
    diagnostics: {
      constraintSatisfied: true,
      missingIncludedCharacters: [],
      sourceCharacterCount: options.characters.length,
      selectedCharacterCount: selection.candidates.length,
      consideredPairCount: pairResult.consideredPairCount,
      beamCandidateCount: pairResult.beamCandidateCount,
      fullScoreCandidateCount: pairResult.fullScoreCandidateCount,
      resultSignature: resultSignature(
        pairResult.names.map(
          ({ fullName, score }) => `${fullName}:${score.toFixed(1)}`,
        ),
      ),
    },
  };
}

export function generateNamesV3(options: GenerateNamesOptions) {
  return generateNamesV3WithDiagnostics(options).names;
}
