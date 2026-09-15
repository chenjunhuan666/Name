# 06 季节旺衰

- **规则 ID**：`bazi.seasonal-strength.phase`。
- **规则定义**：根据月支所属季节，将五行标记为旺、相、休、囚、死的时令状态。
- **主要参考典籍**：《三命通会》季节五行资料。
- **其它佐证**：`bazi-skill/references/wuxing-tables.md`。
- **流派差异**：辰戌丑未四季月的分界与余气处理存在差异。
- **Name 采用方式**：时令状态作为一类证据，不是最终分数。
- **是否参与 V2**：V2.1 已实现。
- **对应代码**：`src/core/bazi/strength/seasonalStrength.ts`。
- **测试案例**：寅卯月木得时，申酉月金得时；四季月单独覆盖。
