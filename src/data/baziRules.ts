import ruleCatalog from './bazi/rules.json';
import type { BaziRule, RuleReference } from '../types';

interface RawBaziRule extends Omit<BaziRule, 'references'> {
  referenceIds: string[];
}

const references = ruleCatalog.references as RuleReference[];
const referenceById = new Map(references.map((reference) => [reference.id, reference]));

export const BAZI_RULE_REFERENCES: readonly RuleReference[] = references;

export const BAZI_RULES: readonly BaziRule[] = (
  ruleCatalog.rules as RawBaziRule[]
).map(({ referenceIds, ...rule }) => ({
  ...rule,
  references: referenceIds.map((referenceId) => {
    const reference = referenceById.get(referenceId);

    if (!reference) {
      throw new Error(`命理规则 ${rule.id} 引用了不存在的来源 ${referenceId}`);
    }

    return reference;
  }),
}));

export function findBaziRule(ruleId: string): BaziRule | undefined {
  return BAZI_RULES.find((rule) => rule.id === ruleId);
}
