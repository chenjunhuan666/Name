import type {
  CharacterGender,
  CharacterPronunciation,
  FiveElement,
  NamingCharacter,
} from '../../types';

export interface CharacterFilters {
  elements?: FiveElement[];
  gender?: CharacterGender;
  styleTags?: string[];
  maxRarity?: number;
  query?: string;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

function matchesElement(
  character: NamingCharacter,
  elements: FiveElement[],
): boolean {
  const characterElements = Array.isArray(character.element)
    ? character.element
    : [character.element];

  return elements.some((element) => characterElements.includes(element));
}

export function filterCharacters(
  characters: NamingCharacter[],
  filters: CharacterFilters,
): NamingCharacter[] {
  const normalizedQuery = filters.query
    ? normalizeSearchText(filters.query)
    : '';

  return characters.filter((character) => {
    if (character.negative) {
      return false;
    }

    if (
      filters.elements?.length &&
      !matchesElement(character, filters.elements)
    ) {
      return false;
    }

    if (
      filters.gender &&
      character.gender !== 'neutral' &&
      character.gender !== filters.gender
    ) {
      return false;
    }

    if (
      filters.styleTags?.length &&
      !filters.styleTags.some((tag) => character.styleTags.includes(tag))
    ) {
      return false;
    }

    if (
      filters.maxRarity !== undefined &&
      character.rarity > filters.maxRarity
    ) {
      return false;
    }

    if (normalizedQuery) {
      const searchableText = normalizeSearchText(
        [character.char, character.pinyin, character.meaning].join(' '),
      );

      if (!searchableText.includes(normalizedQuery)) {
        return false;
      }
    }

    return true;
  });
}

export async function loadCharacterLibrary(): Promise<NamingCharacter[]> {
  const response = await fetch(
    `${import.meta.env.BASE_URL}data/characters/basic.json`,
  );

  if (!response.ok) {
    throw new Error(`汉字库加载失败（HTTP ${response.status}）`);
  }

  const characters: unknown = await response.json();

  if (!Array.isArray(characters)) {
    throw new Error('汉字库格式错误：根节点必须是数组');
  }

  return characters as NamingCharacter[];
}

export async function loadPronunciationLibrary(): Promise<
  CharacterPronunciation[]
> {
  const response = await fetch(
    `${import.meta.env.BASE_URL}data/characters/pronunciations.json`,
  );

  if (!response.ok) {
    throw new Error(`读音索引加载失败（HTTP ${response.status}）`);
  }

  const pronunciations: unknown = await response.json();

  if (!Array.isArray(pronunciations)) {
    throw new Error('读音索引格式错误：根节点必须是数组');
  }

  return pronunciations as CharacterPronunciation[];
}
