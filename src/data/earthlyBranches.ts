import type {
  EarthlyBranch,
  FiveElement,
  HiddenStem,
  YinYang,
} from '../types';

export interface EarthlyBranchInfo {
  element: FiveElement;
  yinYang: YinYang;
  hiddenStems: readonly HiddenStem[];
}

export const EARTHLY_BRANCHES: Record<EarthlyBranch, EarthlyBranchInfo> = {
  子: { element: '水', yinYang: '阳', hiddenStems: [{ stem: '癸', role: 'main' }] },
  丑: {
    element: '土',
    yinYang: '阴',
    hiddenStems: [
      { stem: '己', role: 'main' },
      { stem: '癸', role: 'middle' },
      { stem: '辛', role: 'residual' },
    ],
  },
  寅: {
    element: '木',
    yinYang: '阳',
    hiddenStems: [
      { stem: '甲', role: 'main' },
      { stem: '丙', role: 'middle' },
      { stem: '戊', role: 'residual' },
    ],
  },
  卯: { element: '木', yinYang: '阴', hiddenStems: [{ stem: '乙', role: 'main' }] },
  辰: {
    element: '土',
    yinYang: '阳',
    hiddenStems: [
      { stem: '戊', role: 'main' },
      { stem: '乙', role: 'middle' },
      { stem: '癸', role: 'residual' },
    ],
  },
  巳: {
    element: '火',
    yinYang: '阴',
    hiddenStems: [
      { stem: '丙', role: 'main' },
      { stem: '戊', role: 'middle' },
      { stem: '庚', role: 'residual' },
    ],
  },
  午: {
    element: '火',
    yinYang: '阳',
    hiddenStems: [
      { stem: '丁', role: 'main' },
      { stem: '己', role: 'middle' },
    ],
  },
  未: {
    element: '土',
    yinYang: '阴',
    hiddenStems: [
      { stem: '己', role: 'main' },
      { stem: '丁', role: 'middle' },
      { stem: '乙', role: 'residual' },
    ],
  },
  申: {
    element: '金',
    yinYang: '阳',
    hiddenStems: [
      { stem: '庚', role: 'main' },
      { stem: '壬', role: 'middle' },
      { stem: '戊', role: 'residual' },
    ],
  },
  酉: { element: '金', yinYang: '阴', hiddenStems: [{ stem: '辛', role: 'main' }] },
  戌: {
    element: '土',
    yinYang: '阳',
    hiddenStems: [
      { stem: '戊', role: 'main' },
      { stem: '辛', role: 'middle' },
      { stem: '丁', role: 'residual' },
    ],
  },
  亥: {
    element: '水',
    yinYang: '阴',
    hiddenStems: [
      { stem: '壬', role: 'main' },
      { stem: '甲', role: 'middle' },
    ],
  },
};
