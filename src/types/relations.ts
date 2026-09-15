import type { EarthlyBranch, HeavenlyStem, PillarKey } from './bazi';

export type BaziRelationKind = 'stem-combination' | 'stem-generation' | 'stem-control'
  | 'branch-combination' | 'branch-clash' | 'branch-triple-combination'
  | 'branch-seasonal-meeting' | 'branch-punishment' | 'branch-self-punishment'
  | 'branch-harm' | 'branch-break';

export interface BaziRelation {
  id: string;
  kind: BaziRelationKind;
  layer: 'stem' | 'branch';
  members: Array<{ pillar: PillarKey; value: HeavenlyStem | EarthlyBranch }>;
  ruleId: string;
  explanation: string;
  interpretation: 'structural-only';
}
