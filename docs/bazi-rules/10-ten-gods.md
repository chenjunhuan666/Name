# 10 十神

- **规则定义**：以日干为比较基准，先判断目标天干与日主的同类、生我、我生、克我、我克关系，再以阴阳同性或异性映射比肩至正印十类传统结构。
- **五行关系 ruleId**：`bazi.ten-gods.relation.peer`、`output`、`wealth`、`officer`、`resource`。
- **阴阳映射 ruleId**：`bazi.ten-gods.polarity.same`、`opposite`。每个运行结果同时携带一项关系规则和一项阴阳规则；藏干另带 `bazi.hidden-stems.roles`。
- **主要参考典籍**：《渊海子平》十神论法。
- **其它佐证**：MIT 许可的 `bazi-skill/references/wuxing-tables.md` 五行、阴阳和十神对照表。
- **流派差异**：基础映射相对稳定；格局、强弱、吉凶和现实断语存在流派差异，本项目不实现这些裁决。

## 运行时口径

输出顺序固定为：年干 → 年支藏干 → 月干 → 月支藏干 → 日支藏干 → 时干 → 时支藏干。同一地支的藏干按主气、中气、余气逐项输出，不合并。日干只作比较基准，不额外输出自身比肩；日支藏干仍照常输出。

对应代码：

- `src/core/bazi/tenGods/relation.ts`：五行关系；
- `src/core/bazi/tenGods/resolver.ts`：十神映射和 ruleId；
- `src/core/bazi/tenGods/index.ts`：稳定顺序及藏干展开；
- `src/core/bazi/tenGods/explanation.ts`：结构说明；
- `src/core/bazi/strength/index.ts`：总分析汇总。

## 评分与解释边界

十神只进入 `BaziAnalysis.tenGods` 和分析页的只读结构解释，不进入旺衰证据、`namingTendencies`、姓名候选、分项分或总分。页面不根据正官、七杀、财印等标签输出性格、事业、婚姻、健康、吉凶或命运结论。

完整 10×10 映射、显干/藏干顺序、日干排除、ruleId 解析、确定性与评分不变性由 `src/core/bazi/tenGods/tenGods.test.ts` 固定；Golden Cases 同时保存具体十神序列。
