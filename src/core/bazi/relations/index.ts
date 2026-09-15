import { BRANCH_RELATION_TABLES, STEM_COMBINATIONS } from '../../../data/baziRelations';
import { GENERATING_CYCLE, CONTROLLING_CYCLE } from '../../../data/fiveElements';
import { HEAVENLY_STEMS } from '../../../data/heavenlyStems';
import type { Bazi, PillarKey } from '../../../types/bazi';
import type { BaziRelation, BaziRelationKind } from '../../../types/relations';

const PILLARS: readonly PillarKey[] = ['year', 'month', 'day', 'hour'];
const LABELS: Record<PillarKey, string> = { year: '年柱', month: '月柱', day: '日柱', hour: '时柱' };

/** Describes visible four-pillar structure, independently of scoring and transformation. */
export function analyzeBaziRelations(bazi: Bazi): BaziRelation[] {
  const result: BaziRelation[] = [];
  function add(kind: BaziRelationKind, layer: 'stem' | 'branch', pillars: PillarKey[], label: string) {
    const members = pillars.map((pillar) => ({ pillar, value: bazi[pillar][layer] }));
    const ruleId = layer === 'stem' ? 'bazi.relations.stems'
      : kind === 'branch-break' ? 'bazi.relations.breaks' : 'bazi.relations.branches';
    result.push({ id: `${kind}:${pillars.join('-')}`, kind, layer, members, ruleId,
      explanation: `${members.map(({ pillar, value }) => `${LABELS[pillar]}${value}`).join('、')}：${label}。仅记录结构，不判合化、吉凶或增减分数。`,
      interpretation: 'structural-only' });
  }

  for (let i = 0; i < PILLARS.length; i += 1) {
    for (let j = i + 1; j < PILLARS.length; j += 1) {
      const first = PILLARS[i];
      const second = PILLARS[j];
      const a = bazi[first].stem;
      const b = bazi[second].stem;
      if (STEM_COMBINATIONS.some(([x, y]) => (a === x && b === y) || (a === y && b === x))) {
        add('stem-combination', 'stem', [first, second], '天干五合配对');
      }
      for (const [from, to] of [[first, second], [second, first]]) {
        const source = HEAVENLY_STEMS[bazi[from].stem].element;
        const target = HEAVENLY_STEMS[bazi[to].stem].element;
        if (GENERATING_CYCLE[source] === target) add('stem-generation', 'stem', [from, to], '前者生后者');
        if (CONTROLLING_CYCLE[source] === target) add('stem-control', 'stem', [from, to], '前者克后者');
      }
    }
  }

  // Enumerate distinct pillar subsets. Multiset matching prevents a single 辰 from self-punishing,
  // and preserves separate occurrences when the same branch appears in multiple pillars.
  for (const { kind, label, groups } of BRANCH_RELATION_TABLES) {
    for (let mask = 1; mask < 1 << PILLARS.length; mask += 1) {
      const pillars = PILLARS.filter((_, index) => mask & (1 << index));
      const values = pillars.map((pillar) => bazi[pillar].branch).sort().join('');
      if (groups.some((group) => group.length === pillars.length && [...group].sort().join('') === values)) {
        add(kind, 'branch', pillars, label);
      }
    }
  }
  return result;
}
