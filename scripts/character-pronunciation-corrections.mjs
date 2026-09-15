// Factual corrections only. This registry never changes naming suitability or
// review decisions. See docs/character-pronunciation-corrections.md for evidence.
export const pronunciationCorrections = [{
  id: 'pronunciation-correction:rong-2026-09-05',
  char: '茸',
  original: { pinyin: 'rōng', tone: 1 },
  corrected: { pinyin: 'róng', tone: 2 },
}];

export function applyPronunciationCorrection(record) {
  const correction = pronunciationCorrections.find(({ char }) => char === record.char);
  if (!correction) return record;
  const matches = (reading) => record.pinyin === reading.pinyin && record.tone === reading.tone;
  if (!matches(correction.original) && !matches(correction.corrected)) {
    throw new Error(`字符“${record.char}”读音不符合纠错记录，需重新核验：${record.pinyin}/${record.tone}`);
  }
  return {
    ...record,
    ...correction.corrected,
    ...(record.sources ? { sources: { ...record.sources,
      project: [...new Set([...(record.sources.project ?? []), correction.id])] } } : {}),
  };
}
