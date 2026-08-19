import type { FiveElement } from '../types';

export const FIVE_ELEMENTS: readonly FiveElement[] = [
  '木',
  '火',
  '土',
  '金',
  '水',
];

export const GENERATING_CYCLE: Record<FiveElement, FiveElement> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
};

export const CONTROLLING_CYCLE: Record<FiveElement, FiveElement> = {
  木: '土',
  火: '金',
  土: '水',
  金: '木',
  水: '火',
};
