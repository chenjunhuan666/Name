import type { PhoneticAssessment } from '../../types';

const INITIALS = [
  'zh',
  'ch',
  'sh',
  'b',
  'p',
  'm',
  'f',
  'd',
  't',
  'n',
  'l',
  'g',
  'k',
  'h',
  'j',
  'q',
  'x',
  'r',
  'z',
  'c',
  's',
  'y',
  'w',
] as const;

export interface PhoneticSyllable {
  pinyin: string;
  tone: number;
}

export function normalizePinyin(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-züv]/gi, '')
    .replace(/ü/g, 'v')
    .toLowerCase();
}

export function splitPinyin(pinyin: string): {
  plain: string;
  initial: string;
  final: string;
} {
  const plain = normalizePinyin(pinyin);
  const initial = INITIALS.find((item) => plain.startsWith(item)) ?? '';

  return {
    plain,
    initial,
    final: plain.slice(initial.length),
  };
}

function countAdjacentMatches<T>(values: T[]): number {
  return values.slice(1).reduce(
    (count, value, index) => count + Number(value === values[index]),
    0,
  );
}

export function assessPhonetics(
  syllables: PhoneticSyllable[],
): PhoneticAssessment {
  const parts = syllables.map(({ pinyin }) => splitPinyin(pinyin));
  const tones = syllables.map(({ tone }) => tone);
  const initials = parts.map(({ initial }) => initial);
  const finals = parts.map(({ final }) => final);
  const plains = parts.map(({ plain }) => plain);
  const notes: string[] = [];
  let score = 100;

  if (tones.length >= 3 && new Set(tones).size === 1) {
    score -= 24;
    notes.push('姓名连续三个字为同声调，节奏变化较少。');
  } else {
    const repeatedTones = countAdjacentMatches(tones);
    if (repeatedTones) {
      score -= repeatedTones * 8;
      notes.push(`有 ${repeatedTones} 处相邻同声调，已适度降分。`);
    }
  }

  const repeatedInitials = initials.slice(1).reduce(
    (count, initial, index) =>
      count + Number(Boolean(initial) && initial === initials[index]),
    0,
  );
  if (repeatedInitials) {
    score -= repeatedInitials * 6;
    notes.push(`有 ${repeatedInitials} 处相邻声母重复。`);
  }

  const repeatedFinals = countAdjacentMatches(finals);
  if (repeatedFinals) {
    score -= repeatedFinals * 10;
    notes.push(`有 ${repeatedFinals} 处相邻韵母重复。`);
  }

  const repeatedSyllables = countAdjacentMatches(plains);
  if (repeatedSyllables) {
    score -= repeatedSyllables * 12;
    notes.push('存在相邻同音节，连读辨识度较低。');
  }

  if (!notes.length) {
    notes.push('声调有变化，声母与韵母未触发相邻重复扣分。');
  }

  return {
    score: Math.max(40, score),
    initials,
    finals,
    notes,
  };
}
