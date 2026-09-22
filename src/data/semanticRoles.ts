import type {
  NamingCharacter,
  SemanticRole,
  SemanticRoleRelation,
} from '../types';

const ROLE_CHARACTERS: Partial<Record<SemanticRole, string>> = {
  nature: '山岳峰岑川原野云月星秋春风雨雪霁潮波帆',
  virtue: '仁义礼智信德善惠恕敬睦靖宁谨诚哲贤贞',
  aspiration: '志望远达显硕卓越承襄',
  time: '时昼夕晨昕晗旭秋春岁',
  space: '垣域宇宙庭堂圩州甬',
  light: '明昭旭昕晗昀煜焕晖曜景',
  water: '水江河海湖泉溪汀泓淇泊溯潮波',
  plant: '木林森枫楠松柏柳樱梅兰竹菊荻苇蕙菁茗麦稼萌荣',
  jade: '玉瑶琪瑜瑾璟琬珩琦',
  action: '立献踏筑召驭报示育治贺归望思知承溯鸣依',
  number: '一二三四五六七八九十百千万亿兆',
  geography: '州郡省县市京粤浙沪甬圩',
  title: '皇帝侯王公后妃相卿',
  body: '肱肢首目耳口心',
  animal: '犀虎龙凤鸾鹤鸿鹿麟麒',
  fire: '燎炽烈焚焰炎',
  art: '画墨琴棋书诗词歌舞徽',
  sound: '鸣音韵歌语言',
  agriculture: '麦稼禾田谷穗',
};

const ROLE_MEANING_KEYWORDS: Partial<Record<SemanticRole, string[]>> = {
  nature: ['自然', '山', '水岸', '天空', '季节', '风', '雨', '雪'],
  virtue: ['品德', '诚信', '和睦', '谨慎', '恭敬', '善良', '贤'],
  aspiration: ['志向', '理想', '显达', '成就', '远大'],
  time: ['时间', '时序', '白昼', '晨', '早晨', '岁月'],
  space: ['空间', '区域', '城垣', '屋宇', '平地'],
  light: ['光明', '明亮', '照耀', '日光', '朝阳', '初晴'],
  water: ['水', '江', '河', '海', '湖', '泉', '溪', '润泽'],
  plant: ['植物', '草本', '草木', '树', '花', '竹', '麦', '庄稼'],
  jade: ['美玉', '玉石'],
  action: ['动作', '站立', '建立', '表示', '建造', '召唤', '驾驭', '回归'],
  number: ['数量', '一千', '一百', '一万', '一亿'],
  geography: ['地名', '行政区', '地域简称'],
  title: ['爵位', '帝号', '称谓'],
  body: ['身体部位', '手臂'],
  animal: ['动物', '鸟', '兽'],
  fire: ['猛烈燃烧', '火势', '炽烈'],
  art: ['绘画', '书写', '琴', '诗歌', '艺术'],
  sound: ['声音', '鸣声', '言语'],
  agriculture: ['农事', '庄稼', '麦穗'],
};

const COHERENT_ROLE_PAIRS: ReadonlyArray<readonly [SemanticRole, SemanticRole]> = [
  ['plant', 'water'],
  ['plant', 'light'],
  ['water', 'light'],
  ['water', 'nature'],
  ['plant', 'nature'],
  ['art', 'abstract'],
  ['art', 'sound'],
  ['virtue', 'virtue'],
  ['virtue', 'aspiration'],
  ['time', 'light'],
  ['action', 'plant'],
  ['action', 'time'],
  ['sound', 'virtue'],
];

const CONFLICTING_ROLE_PAIRS: ReadonlyArray<readonly [SemanticRole, SemanticRole]> = [
  ['fire', 'plant'],
  ['fire', 'virtue'],
  ['fire', 'animal'],
  ['animal', 'geography'],
];

const roleCache = new WeakMap<NamingCharacter, SemanticRole[]>();

function hasRolePair(
  first: readonly SemanticRole[],
  second: readonly SemanticRole[],
  pairs: ReadonlyArray<readonly [SemanticRole, SemanticRole]>,
): boolean {
  return pairs.some(
    ([left, right]) =>
      (first.includes(left) && second.includes(right)) ||
      (first.includes(right) && second.includes(left)),
  );
}

export function inferSemanticRoles(character: NamingCharacter): SemanticRole[] {
  const cached = roleCache.get(character);
  if (cached) {
    return cached;
  }
  const roles = new Set<SemanticRole>();
  const meaning = character.meaning.replace(/\s+/g, '');

  for (const [role, characters] of Object.entries(ROLE_CHARACTERS) as [
    SemanticRole,
    string,
  ][]) {
    if (characters.includes(character.char)) {
      roles.add(role);
    }
  }
  for (const [role, keywords] of Object.entries(ROLE_MEANING_KEYWORDS) as [
    SemanticRole,
    string[],
  ][]) {
    if (keywords.some((keyword) => meaning.includes(keyword))) {
      roles.add(role);
    }
  }
  if (character.styleTags.includes('自然')) {
    roles.add('nature');
  }
  if (character.styleTags.some((style) => ['儒雅', '温润'].includes(style))) {
    roles.add('virtue');
  }
  if (roles.size === 0) {
    roles.add('abstract');
  }
  const result = [...roles].sort();
  roleCache.set(character, result);
  return result;
}

export function assessSemanticRoleRelation(
  first: readonly SemanticRole[],
  second: readonly SemanticRole[],
): SemanticRoleRelation {
  if (hasRolePair(first, second, CONFLICTING_ROLE_PAIRS)) {
    return 'conflicting';
  }
  if (
    first.includes('number') ||
    second.includes('number') ||
    first.includes('title') ||
    second.includes('title') ||
    first.includes('body') ||
    second.includes('body') ||
    (first.includes('action') && second.includes('action')) ||
    hasRolePair(first, second, [
      ['action', 'geography'],
      ['action', 'space'],
    ])
  ) {
    return 'fragment';
  }
  if (hasRolePair(first, second, COHERENT_ROLE_PAIRS)) {
    return 'coherent';
  }
  const shared = first.filter(
    (role) => role !== 'abstract' && second.includes(role),
  );
  return shared.length > 0 ? 'repetitive' : 'neutral';
}
