import { findBaziRule } from '../../data/baziRules';
import type {
  BaziAnalysis,
  ExplanationBundle,
  ExplanationItem,
  HiddenStemRole,
  PillarKey,
} from '../../types';
import { explainTenGodOccurrence } from '../bazi/tenGods';

const PILLAR_LABELS: Record<PillarKey, string> = {
  year: '年柱',
  month: '月柱',
  day: '日柱',
  hour: '时柱',
};

const HIDDEN_ROLE_LABELS: Record<HiddenStemRole, string> = {
  main: '主气',
  middle: '中气',
  residual: '余气',
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function referencesFor(ruleIds: readonly string[]): string[] {
  return unique(ruleIds.flatMap((ruleId) =>
    findBaziRule(ruleId)?.references.map(({ work, chapter }) =>
      chapter ? `${work} · ${chapter}` : work) ?? []));
}

function withRuleContext(item: ExplanationItem): ExplanationItem {
  const ruleIds = unique(item.ruleIds ?? []);
  const references = referencesFor(ruleIds);
  return {
    ...item,
    ...(ruleIds.length ? { ruleIds } : {}),
    ...(references.length ? { references } : {}),
  };
}

function hiddenStemDetail(analysis: BaziAnalysis): string {
  return (Object.entries(analysis.pillars) as [PillarKey, BaziAnalysis['pillars'][PillarKey]][])
    .map(([pillar, detail]) =>
      `${PILLAR_LABELS[pillar]}：${detail.hiddenStems.map(({ stem, element, role }) =>
        `${stem}${element}（${HIDDEN_ROLE_LABELS[role]}）`).join('、')}`)
    .join('；');
}

export function createBaziExplanationBundle(
  analysis: BaziAnalysis,
): ExplanationBundle {
  const tendencies = analysis.namingTendencies ?? [];
  const topTendencies = tendencies.slice(0, 2);
  const strengthRuleIds = unique([
    ...(analysis.strengthRuleIds ?? []),
    ...(analysis.strengthBreakdown?.evidence.flatMap(({ ruleIds }) => ruleIds) ?? []),
  ]);
  const tendencyRuleIds = unique(tendencies.flatMap(({ ruleIds = [] }) => ruleIds));
  const ordinary: ExplanationItem[] = [
    withRuleContext({
      id: 'bazi-structure-overview',
      title: '结构概览',
      summary: analysis.strength
        ? `日主为${analysis.dayMaster.stem}${analysis.dayMaster.element}，月令为${analysis.monthCommand}，当前工程证据模型判为${analysis.strength}。`
        : `日主为${analysis.dayMaster.stem}${analysis.dayMaster.element}，月令为${analysis.monthCommand}。`,
      detail: analysis.strengthReason,
      ruleIds: strengthRuleIds,
      level: 'info',
    }),
    withRuleContext({
      id: 'bazi-climate-overview',
      title: '基础调候',
      summary: analysis.tiaohou
        ? `${analysis.tiaohou.climate}；${analysis.tiaohou.favoredElements.length
          ? `可关注${analysis.tiaohou.favoredElements.join('、')}方向`
          : '当前不增加额外五行调节'}。`
        : '当前没有基础调候结果。',
      detail: analysis.tiaohou?.reason,
      ruleIds: analysis.tiaohou?.ruleIds,
      level: 'info',
    }),
    withRuleContext({
      id: 'bazi-element-direction',
      title: '五行调节方向',
      summary: topTendencies.length
        ? `起名可优先关注${topTendencies.map(({ element, level }) => `${element}${level}级`).join('、')}，其余元素仍按完整证据排序。`
        : '尚未生成起名五行方向。',
      detail: topTendencies.map(({ reason }) => reason).join('；') || undefined,
      ruleIds: tendencyRuleIds,
      level: 'positive',
    }),
    {
      id: 'bazi-explanation-boundary',
      title: '解释边界',
      summary: '这些内容只解释四柱结构和项目采用的工程规则，不输出性格、人生事件或现实命运判断。',
      detail: '五行方向用于候选筛选，不等同于唯一喜用神，也不会把五行缺失直接判为必须补入姓名。',
      level: 'warning',
    },
  ];

  const professional: ExplanationItem[] = [
    {
      id: 'bazi-day-master',
      title: '日主',
      summary: `${analysis.dayMaster.stem}${analysis.dayMaster.element}（${analysis.dayMaster.yinYang}）。`,
      detail: '日主是本项目描述五行关系、十神和旺衰证据时使用的结构基准。',
      level: 'info',
    },
    withRuleContext({
      id: 'bazi-month-command',
      title: '月令',
      summary: `${analysis.monthCommand}，月支五行为${analysis.pillars.month.branchElement}。`,
      detail: '月令具有高优先级，但仍与季节、通根、透干、生扶和克泄耗合看。',
      ruleIds: ['bazi.month-command.priority'],
      level: 'info',
    }),
    withRuleContext({
      id: 'bazi-hidden-stems',
      title: '藏干',
      summary: '四柱地支按主气、中气、余气逐项保留，不合并为单一标签。',
      detail: hiddenStemDetail(analysis),
      ruleIds: ['bazi.hidden-stems.roles'],
      level: 'info',
    }),
    withRuleContext({
      id: 'bazi-strength-evidence',
      title: '旺衰证据',
      summary: analysis.strengthBreakdown
        ? `支持证据 ${analysis.strengthBreakdown.supportScore}，制约证据 ${analysis.strengthBreakdown.weakenScore}，净值 ${analysis.strengthBreakdown.netScore}。`
        : '当前没有完整旺衰证据。',
      detail: analysis.strengthBreakdown?.evidence.map(({ reason }) => reason).join('；'),
      ruleIds: strengthRuleIds,
      level: 'info',
    }),
    withRuleContext({
      id: 'bazi-tiaohou',
      title: '基础调候',
      summary: analysis.tiaohou
        ? `${analysis.tiaohou.climate}，对起名倾向最多修正 ${analysis.tiaohou.adjustment} 档。`
        : '当前没有基础调候结果。',
      detail: analysis.tiaohou?.reason,
      ruleIds: analysis.tiaohou?.ruleIds,
      level: 'info',
    }),
  ];

  if (analysis.tenGods?.length) {
    professional.push(withRuleContext({
      id: 'bazi-ten-gods',
      title: '十神结构',
      summary: `共识别 ${analysis.tenGods.length} 项显干或藏干关系，只作传统结构说明。`,
      detail: analysis.tenGods.map(explainTenGodOccurrence).join('；'),
      ruleIds: analysis.tenGods.flatMap(({ ruleIds }) => ruleIds),
      level: 'info',
    }));
  }
  if (analysis.relations?.length) {
    professional.push(withRuleContext({
      id: 'bazi-relations',
      title: '干支关系',
      summary: `共记录 ${analysis.relations.length} 项可见干支结构，不裁决合化、优先级或吉凶。`,
      detail: analysis.relations.map(({ explanation }) => explanation).join('；'),
      ruleIds: analysis.relations.map(({ ruleId }) => ruleId),
      level: 'info',
    }));
  }
  professional.push(withRuleContext({
    id: 'bazi-naming-tendencies',
    title: '五行调节方向',
    summary: tendencies.map(({ element, level, relation }) =>
      `${element}${level}级（${relation}）`).join('；') || '尚未生成起名五行方向。',
    detail: tendencies.map(({ reason }) => reason).join('；') || undefined,
    ruleIds: tendencyRuleIds,
    level: 'positive',
  }));

  return { ordinary, professional };
}
