const BASE_FORBIDDEN_GIVEN_NAMES = [
  '死亡',
  '夭折',
  '破财',
  '招灾',
  '晦气',
  '丧气',
] as const;

export const REVIEW_HOMOPHONE_BLOCKLIST_SOURCE = {
  ruleId: 'naming.homophone.review-batch-01',
  evidence:
    'docs/recommended-character-suitability-review-batch-01.json',
} as const;

export const REVIEW_HOMOPHONE_BLOCKLIST = [
  { givenName: '辉颀', homophone: '晦气' },
  { givenName: '慧颀', homophone: '晦气' },
  { givenName: '惠颀', homophone: '晦气' },
  { givenName: '晖颀', homophone: '晦气' },
  { givenName: '恢颀', homophone: '晦气' },
  { givenName: '汇颀', homophone: '晦气' },
  { givenName: '绘颀', homophone: '晦气' },
  { givenName: '蕙颀', homophone: '晦气' },
  { givenName: '会颀', homophone: '晦气' },
  { givenName: '徽颀', homophone: '晦气' },
  { givenName: '卉颀', homophone: '晦气' },
  { givenName: '荟颀', homophone: '晦气' },
  { givenName: '诲颀', homophone: '晦气' },
  { givenName: '莎弼', homophone: '傻逼' },
  { givenName: '纱弼', homophone: '傻逼' },
] as const;

export const FORBIDDEN_GIVEN_NAMES = new Set<string>([
  ...BASE_FORBIDDEN_GIVEN_NAMES,
  ...REVIEW_HOMOPHONE_BLOCKLIST.map(({ givenName }) => givenName),
]);

export const SEMANTIC_CONFLICT_PAIRS: readonly (readonly [string, string])[] = [
  ['生', '亡'],
  ['明', '晦'],
  ['安', '乱'],
  ['善', '恶'],
];

export const HIGH_FREQUENCY_NAMING_CHARACTERS = new Set([
  '梓',
  '沐',
  '泽',
  '宇',
  '辰',
  '轩',
  '睿',
  '浩',
]);

/** 仅用于确定性的软降分，不把单个字直接判为不可用。 */
export const WEB_NOVEL_STYLE_CHARACTERS = new Set([
  '墨',
  '宸',
  '凌',
  '霄',
  '夜',
  '玄',
  '渊',
  '尘',
  '殇',
  '璃',
]);

export const WEB_NOVEL_STYLE_GIVEN_NAMES = new Set([
  '墨宸',
  '墨渊',
  '凌霄',
  '凌夜',
  '夜辰',
  '逸尘',
]);
