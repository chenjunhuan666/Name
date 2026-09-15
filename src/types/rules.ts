export type RuleSourceType =
  | 'classical'
  | 'modern-standard'
  | 'modern-commentary'
  | 'open-source'
  | 'project-model';

export interface RuleReference {
  id: string;
  title: string;
  work: string;
  chapter?: string;
  sourceType: RuleSourceType;
  sourceUrl?: string;
  note?: string;
}

export interface BaziRule {
  id: string;
  name: string;
  description: string;
  references: RuleReference[];
  schoolDifference?: string;
  implementationNote: string;
  documentationPath: string;
  codePaths: string[];
  enabledInV2: boolean;
}
