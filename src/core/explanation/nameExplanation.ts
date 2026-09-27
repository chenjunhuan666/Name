import { NAMING_SCORE_DIMENSIONS } from '../../config/namingScore';
import type {
  ExplanationBundle,
  ExplanationItem,
  GeneratedName,
} from '../../types';

function scoreLevel(score: number): ExplanationItem['level'] {
  return score >= 80 ? 'positive' : score < 60 ? 'warning' : 'info';
}

export function createNameExplanationBundle(
  name: GeneratedName,
): ExplanationBundle {
  const semantic = name.semanticAssessment;
  const ordinary: ExplanationItem[] = [
    {
      id: 'name-element-fit',
      title: '五行方向',
      summary: `名字两字按当前起名倾向得到 ${name.scoreBreakdown.element} 分。`,
      detail: name.scoreExplanations.element,
      level: scoreLevel(name.scoreBreakdown.element),
    },
    {
      id: 'name-meaning',
      title: '组合意义',
      summary: semantic?.natural
        ? '两字未命中项目内明确负面或冲突组合。'
        : '两字组合存在需要留意的语义或风格问题。',
      detail: name.scoreExplanations.meaning,
      level: semantic?.natural ? 'positive' : 'warning',
    },
    {
      id: 'name-phonetic',
      title: '声调与音韵',
      summary: `音律维度为 ${name.scoreBreakdown.phonetic} 分，声调序列为 ${name.tones.join(' - ')}。`,
      detail: name.scoreExplanations.phonetic,
      level: scoreLevel(name.scoreBreakdown.phonetic),
    },
    {
      id: 'name-homophone',
      title: '普通话谐音',
      summary: name.homophoneAssessment.matches.length
        ? `发现 ${name.homophoneAssessment.matches.length} 项近音提示，需要结合实际读法判断。`
        : '项目内普通话负面谐音分层检查未发现命中。',
      detail: `${name.scoreExplanations.homophone}当前检查不覆盖方言或全部现实联想。`,
      level: name.homophoneAssessment.matches.length ? 'warning' : 'positive',
    },
    name.classic
      ? {
          id: 'name-classic',
          title: '典籍关联',
          summary: `${name.classic.level ?? 'A'} 级关联：${name.classic.display}。`,
          detail: name.scoreExplanations.classic,
          references: [name.classic.display],
          level: 'positive',
        }
      : {
          id: 'name-classic',
          title: '典籍关联',
          summary: '当前典籍语料未发现可核对的整名关联，因此不附会出处。',
          detail: name.scoreExplanations.classic,
          level: 'info',
        },
    {
      id: 'name-usage-boundary',
      title: '使用前注意',
      summary: '分数只用于当前候选排序，不能代替现实读音、方言、重名率或登记适用性核验。',
      level: 'warning',
    },
  ];

  const professional = NAMING_SCORE_DIMENSIONS.map<ExplanationItem>((dimension) => {
    const score = name.scoreBreakdown[dimension.key] ??
      (dimension.key === 'modern' ? 80 : 0);
    return {
      id: `name-score-${dimension.key}`,
      title: dimension.label,
      summary: `${score} 分，占综合分权重 ${dimension.weight}%。`,
      detail: name.scoreExplanations[dimension.key] ??
        '旧版收藏记录未包含该维度，展示兼容性中性说明。',
      ...(dimension.key === 'classic' && name.classic
        ? { references: [name.classic.display] }
        : {}),
      level: scoreLevel(score),
    };
  });

  if (semantic) {
    professional.push({
      id: 'name-semantic-combination',
      title: '组合语义结构',
      summary: semantic.roleRelation
        ? `语义角色关系：${semantic.roleRelation}；组合分 ${semantic.score}。`
        : `组合语义分 ${semantic.score}。`,
      detail: semantic.notes.join('；'),
      level: semantic.natural ? 'info' : 'warning',
    });
  }

  return { ordinary, professional };
}

export function attachNameExplanations(
  names: GeneratedName[],
  enabled: boolean,
): GeneratedName[] {
  return enabled
    ? names.map((name) => ({
        ...name,
        explanations: createNameExplanationBundle(name),
      }))
    : names;
}
