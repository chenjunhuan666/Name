import type {
  EarthlyBranch,
  FiveElement,
  HeavenlyStem,
  YinYang,
} from '../types';

export interface EarthlyBranchInfo {
  element: FiveElement;
  yinYang: YinYang;
  hiddenStems: readonly HeavenlyStem[];
}

export const EARTHLY_BRANCHES: Record<EarthlyBranch, EarthlyBranchInfo> = {
  子: { element: '水', yinYang: '阳', hiddenStems: ['癸'] },
  丑: { element: '土', yinYang: '阴', hiddenStems: ['己', '癸', '辛'] },
  寅: { element: '木', yinYang: '阳', hiddenStems: ['甲', '丙', '戊'] },
  卯: { element: '木', yinYang: '阴', hiddenStems: ['乙'] },
  辰: { element: '土', yinYang: '阳', hiddenStems: ['戊', '乙', '癸'] },
  巳: { element: '火', yinYang: '阴', hiddenStems: ['丙', '戊', '庚'] },
  午: { element: '火', yinYang: '阳', hiddenStems: ['丁', '己'] },
  未: { element: '土', yinYang: '阴', hiddenStems: ['己', '丁', '乙'] },
  申: { element: '金', yinYang: '阳', hiddenStems: ['庚', '壬', '戊'] },
  酉: { element: '金', yinYang: '阴', hiddenStems: ['辛'] },
  戌: { element: '土', yinYang: '阳', hiddenStems: ['戊', '辛', '丁'] },
  亥: { element: '水', yinYang: '阴', hiddenStems: ['壬', '甲'] },
};
