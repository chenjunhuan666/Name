# 03 藏干主中余气

- **规则 ID**：`bazi.hidden-stems.roles`。
- **规则定义**：藏干分为 `main`/`middle`/`residual`，保留地支内部层次。
- **主要参考典籍**：《三命通会》相关干支资料。
- **其它佐证**：`bazi-skill/references/wuxing-tables.md` 地支藏干表。
- **流派差异**：顺序与力量比例存在差异。
- **Name 采用方式**：只将角色结构化；后续权重是项目配置，不冒充古籍定值。
- **是否参与 V2**：V2.1 已接入运行时。
- **对应代码**：`src/types/bazi.ts`、`src/data/earthlyBranches.ts`、`src/core/bazi/strength/hiddenStemPower.ts`。
- **测试案例**：寅为甲主气、丙中气、戊余气；子只有癸主气。
