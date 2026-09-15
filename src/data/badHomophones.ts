export interface BadHomophone {
  label: string;
  pinyin: string;
  scope: 'given' | 'full' | 'surname-first';
  category?: 'negative' | 'internet';
  approximate?: boolean;
}

export const BAD_HOMOPHONES: readonly BadHomophone[] = [
  { label: '白痴', pinyin: 'baichi', scope: 'given', approximate: true },
  { label: '傻逼', pinyin: 'shabi', scope: 'given' },
  { label: '没用', pinyin: 'meiyong', scope: 'given' },
  { label: '无能', pinyin: 'wuneng', scope: 'full' },
  { label: '坏蛋', pinyin: 'huaidan', scope: 'given' },
  { label: '笨蛋', pinyin: 'bendan', scope: 'given' },
  { label: '废物', pinyin: 'feiwu', scope: 'given' },
  { label: '流氓', pinyin: 'liumang', scope: 'given' },
  { label: '恶心', pinyin: 'exin', scope: 'given' },
  { label: '去死', pinyin: 'qusi', scope: 'given' },
  { label: '找死', pinyin: 'zhaosi', scope: 'given' },
  { label: '短命', pinyin: 'duanming', scope: 'given' },
  { label: '倒霉', pinyin: 'daomei', scope: 'given' },
  { label: '赔钱', pinyin: 'peiqian', scope: 'given' },
  { label: '破财', pinyin: 'pocai', scope: 'given' },
  { label: '招灾', pinyin: 'zhaozai', scope: 'given' },
  { label: '灾星', pinyin: 'zaixing', scope: 'given' },
  { label: '丧气', pinyin: 'sangqi', scope: 'given' },
  { label: '晦气', pinyin: 'huiqi', scope: 'given' },
  { label: '蠢货', pinyin: 'chunhuo', scope: 'given' },
  { label: '屎真香', pinyin: 'shizhenxiang', scope: 'full' },
  { label: '肚子疼', pinyin: 'duziteng', scope: 'full' },
  { label: '饭桶', pinyin: 'fantong', scope: 'full' },
  { label: '禽兽', pinyin: 'qinshou', scope: 'full' },
  { label: '阳痿', pinyin: 'yangwei', scope: 'full' },
  { label: '肚子', pinyin: 'duzi', scope: 'surname-first' },
  { label: '屎真', pinyin: 'shizhen', scope: 'surname-first' },
  {
    label: '摆烂',
    pinyin: 'bailan',
    scope: 'given',
    category: 'internet',
    approximate: true,
  },
  {
    label: '社死',
    pinyin: 'shesi',
    scope: 'given',
    category: 'internet',
    approximate: true,
  },
  {
    label: '冤种',
    pinyin: 'yuanzhong',
    scope: 'given',
    category: 'internet',
  },
  {
    label: '内卷',
    pinyin: 'neijuan',
    scope: 'given',
    category: 'internet',
  },
  {
    label: '显眼包',
    pinyin: 'xianyanbao',
    scope: 'full',
    category: 'internet',
  },
] as const;
