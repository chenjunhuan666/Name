import { describe, expect, it } from 'vitest';
import { BAZI_RULE_REFERENCES, BAZI_RULES, findBaziRule } from './baziRules';

describe('baziRules', () => {
  it('为每条规则保留唯一 id、来源和追溯路径', () => {
    expect(new Set(BAZI_RULES.map(({ id }) => id)).size).toBe(BAZI_RULES.length);
    expect(new Set(BAZI_RULE_REFERENCES.map(({ id }) => id)).size).toBe(
      BAZI_RULE_REFERENCES.length,
    );

    BAZI_RULES.forEach((rule) => {
      expect(rule.references.length).toBeGreaterThan(0);
      expect(rule.documentationPath).toMatch(/^docs\/bazi-rules\/.+\.md$/);
      expect(rule.codePaths.length).toBeGreaterThan(0);
    });
  });

  it('可以通过 ruleId 定位完整规则和文献', () => {
    const rule = findBaziRule('bazi.month-command.priority');

    expect(rule?.name).toBe('月令优先但不单断');
    expect(rule?.references.map(({ id }) => id)).toContain(
      'classic-ziping-month-command',
    );
  });
});
