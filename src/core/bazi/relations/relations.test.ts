import { describe, expect, it } from 'vitest';
import { analyzeBaziRelations } from './index';
import { analyzeBazi, analyzeStrength } from '../strength';
import { analyzeBasicBazi } from '../basicAnalysis';
import { findBaziRule } from '../../../data/baziRules';
import type { Bazi, EarthlyBranch, HeavenlyStem } from '../../../types';
import type { BaziRelationKind } from '../../../types/relations';

function chart(branches: string, stems = '甲甲甲甲'): Bazi {
  return Object.fromEntries(['year', 'month', 'day', 'hour'].map((key, i) => [key, {
    stem: stems[i] as HeavenlyStem, branch: branches[i] as EarthlyBranch,
  }])) as unknown as Bazi;
}
function has(branches: string, kind: BaziRelationKind) {
  return analyzeBaziRelations(chart(branches)).some((item) => item.kind === kind);
}

describe('干支关系结构分析', () => {
  it.each(['甲己', '乙庚', '丙辛', '丁壬', '戊癸'])('五合 %s 正反向均保留柱位', (pair) => {
    for (const stems of [pair + '甲甲', [...pair].reverse().join('') + '甲甲']) {
      const matches = analyzeBaziRelations(chart('子丑寅卯', stems));
      expect(matches.some((r) => r.id === 'stem-combination:year-month')).toBe(true);
    }
  });

  it('生克方向按施受方而非柱序，同五行不误报生克', () => {
    const matches = analyzeBaziRelations(chart('子丑寅卯', '丙甲戊乙'));
    expect(matches.find((r) => r.id === 'stem-generation:month-year')?.members.map((m) => m.value)).toEqual(['甲', '丙']);
    expect(matches.find((r) => r.id === 'stem-control:month-day')?.members.map((m) => m.value)).toEqual(['甲', '戊']);
    expect(matches.some((r) => r.id === 'stem-generation:year-month')).toBe(false);
    expect(matches.some((r) => ['stem-generation', 'stem-control'].includes(r.kind)
      && r.members.map((m) => m.pillar).sort().join() === ['month', 'hour'].sort().join())).toBe(false);
  });

  const fixtures: Array<[BaziRelationKind, string[]]> = [
    ['branch-combination', ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未']],
    ['branch-clash', ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥']],
    ['branch-harm', ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌']],
    ['branch-break', ['子酉', '丑辰', '寅亥', '卯午', '巳申', '未戌']],
    ['branch-triple-combination', ['申子辰', '亥卯未', '寅午戌', '巳酉丑']],
    ['branch-seasonal-meeting', ['寅卯辰', '巳午未', '申酉戌', '亥子丑']],
    ['branch-punishment', ['寅巳申', '丑戌未', '子卯']],
    ['branch-self-punishment', ['辰辰', '午午', '酉酉', '亥亥']],
  ];
  it.each(fixtures)('%s 全表匹配且不依赖柱序', (kind, groups) => {
    for (const group of groups) {
      for (const ordered of [group, [...group].reverse().join('')]) {
        expect(has(ordered.padEnd(4, '子'), kind), ordered).toBe(true);
      }
    }
  });

  it('缺一支不能组成三合三会或完整三刑，单支不触发自刑', () => {
    expect(has('申子子子', 'branch-triple-combination')).toBe(false);
    expect(has('寅卯卯卯', 'branch-seasonal-meeting')).toBe(false);
    expect(has('寅巳巳巳', 'branch-punishment')).toBe(false);
    expect(has('辰子丑寅', 'branch-self-punishment')).toBe(false);
    expect(has('子子子子', 'branch-self-punishment')).toBe(false);
  });

  it('重复柱保留独立组合，不重复生成反向记录；合与破并存', () => {
    const self = analyzeBaziRelations(chart('辰辰辰辰')).filter((r) => r.kind === 'branch-self-punishment');
    expect(self).toHaveLength(6);
    const all = analyzeBaziRelations(chart('寅亥子丑', '甲己丙辛'));
    expect(new Set(all.map((r) => r.id)).size).toBe(all.length);
    expect(all.some((r) => r.id === 'branch-combination:year-month')).toBe(true);
    expect(all.some((r) => r.id === 'branch-break:year-month')).toBe(true);
  });

  it('总分析接入结果、来源可追溯，输入和旺衰评分保持不变', () => {
    const bazi = chart('申子辰辰', '甲己丙辛');
    const original = JSON.stringify(bazi);
    const strength = analyzeStrength(bazi, analyzeBasicBazi(bazi));
    const analysis = analyzeBazi(bazi);
    expect(analysis.relations).toEqual(analyzeBaziRelations(bazi));
    expect(analysis).toMatchObject(strength);
    expect(JSON.stringify(bazi)).toBe(original);
    expect(analyzeBazi(bazi)).toEqual(analysis);
    for (const relation of analysis.relations ?? []) {
      expect(findBaziRule(relation.ruleId)?.references.length).toBeGreaterThan(0);
      expect(relation.interpretation).toBe('structural-only');
      expect(relation.explanation).toContain('不判合化');
    }
  });
});
