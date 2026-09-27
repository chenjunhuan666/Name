export type ExplanationLevel = 'info' | 'positive' | 'warning';

export interface ExplanationItem {
  id: string;
  title: string;
  summary: string;
  detail?: string;
  ruleIds?: string[];
  references?: string[];
  level?: ExplanationLevel;
}

export interface ExplanationBundle {
  ordinary: ExplanationItem[];
  professional: ExplanationItem[];
}
