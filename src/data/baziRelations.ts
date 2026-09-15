import type { EarthlyBranch, HeavenlyStem } from '../types/bazi';
import type { BaziRelationKind } from '../types/relations';

export const STEM_COMBINATIONS: readonly (readonly [HeavenlyStem, HeavenlyStem])[] = [
  ['甲', '己'], ['乙', '庚'], ['丙', '辛'], ['丁', '壬'], ['戊', '癸'],
];

// Fixed structural tables; no transformation element or numerical strength implied.
export const BRANCH_RELATION_TABLES: readonly {
  kind: BaziRelationKind;
  label: string;
  groups: readonly (readonly EarthlyBranch[])[];
}[] = [
  { kind: 'branch-combination', label: '六合', groups: [['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未']] },
  { kind: 'branch-clash', label: '六冲', groups: [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']] },
  { kind: 'branch-triple-combination', label: '三合三字齐见', groups: [['申', '子', '辰'], ['亥', '卯', '未'], ['寅', '午', '戌'], ['巳', '酉', '丑']] },
  { kind: 'branch-seasonal-meeting', label: '三会三字齐见', groups: [['寅', '卯', '辰'], ['巳', '午', '未'], ['申', '酉', '戌'], ['亥', '子', '丑']] },
  { kind: 'branch-punishment', label: '相刑结构（完整组）', groups: [['寅', '巳', '申'], ['丑', '戌', '未'], ['子', '卯']] },
  { kind: 'branch-self-punishment', label: '自刑结构', groups: [['辰', '辰'], ['午', '午'], ['酉', '酉'], ['亥', '亥']] },
  { kind: 'branch-harm', label: '六害', groups: [['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌']] },
  { kind: 'branch-break', label: '六破', groups: [['子', '酉'], ['丑', '辰'], ['寅', '亥'], ['卯', '午'], ['巳', '申'], ['未', '戌']] },
];
