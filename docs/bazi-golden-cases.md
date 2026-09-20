# 八字 Golden Cases 基准案例集

> 本文件与 `src/core/bazi/goldenCases.ts`、`goldenCases.test.ts` 共同构成 V2 的固定回归基线。它固定的是 Name 当前确定性实现的输入、结构、关系、证据、规则与来源链；不是对任何真实出生时间的排盘背书，也不是唯一或最终的命理结论。

## 校验范围与边界

- 每例直接录入年、月、日、时四柱，不经过历法换算；历法边界由 `calendarBoundaries.test.ts` 独立覆盖。
- 基础结构固定日主、月令、表层五行、藏干五行和每柱藏干角色。
- 干支关系固定全部命中项的 `id`、类别和 `ruleId`，但均为 `structural-only`：不判合化、吉凶、优先级或固定增减分数。
- 十神固定年/月/时干及四柱藏干的逐项输出、顺序和 `ruleId`；日干只作基准，不额外输出自身比肩，十神不进入旺衰或姓名评分。
- 旺衰固定总支持/制约/净分、五档输出和关键证据签名。证据等级、阈值和五档是 Name 项目模型，不被表述为古籍统一数值。
- 每个运行时 `ruleId` 必须可解析为规则目录及 `RuleReference`；其他项目的结论最多用于人工对照，不能替代该基准。

## 案例概览

| ID | 四柱（年 / 月 / 日 / 时） | 覆盖目的 | 当前工程输出 |
|---|---|---|---|
| `metal-in-metal-season` | 甲辰 / 壬申 / 辛酉 / 丙申 | 时令得势、三处金根、显性制约；五合及辰酉六合 | 偏旺；支持 28、制约 11、净值 17 |
| `metal-in-wood-season` | 甲寅 / 乙卯 / 庚申 / 丙午 | 时令失势、申根、木火制约；乙庚合、寅申冲、卯午破 | 偏弱；支持 9、制约 20、净值 -11 |
| `wood-support-and-constraint` | 戊辰 / 丙寅 / 甲子 / 庚申 | 生扶与克泄耗同时存在；寅申冲、申子辰三合 | 偏旺；支持 23、制约 14、净值 9 |

## 固定字段

每个 `BAZI_GOLDEN_CASES` 项都记录并由测试断言：

1. 原始八字与日主、月令、表层/藏干五行、四柱藏干主中余角色。
2. 全部命中的干支关系（关系 ID、种类、规则 ID）。
3. 十神序列，包含柱位、显干/藏干位置、藏干角色、目标干和十神标签。
4. 旺衰档位、支持/制约/净分，以及月令、季节、通根、生扶或克泄耗等关键证据的类型、五行、方向、等级、规则 ID。
5. 从运行输出收集的全部规则 ID，及其展开后的全部参考来源 ID。

这使任何规则、来源或算法改动都会在同一次测试中暴露其对基础结构、关系、证据或可追溯链的影响。

## 规则与参考来源

| 规则范围 | 规则 ID | 参考来源 ID |
|---|---|---|
| 藏干角色 | `bazi.hidden-stems.roles` | `oss-bazi-wuxing-tables`、`classic-sanming-tonghui` |
| 月令与季节 | `bazi.month-command.priority`、`bazi.seasonal-strength.phase` | `classic-ziping-month-command`、`classic-ditian-sui-strength`、`classic-sanming-tonghui`、`oss-bazi-wuxing-tables` |
| 通根与生扶/克泄耗 | `bazi.rooting.evidence`、`bazi.support-control.balance` | `classic-ditian-sui-strength`、`classic-yuanhai-ziping`、`oss-bazi-wuxing-tables` |
| 旺衰与起名倾向 | `bazi.strength.five-levels`、`bazi.naming-tendency.fuyi` | `classic-ditian-sui-strength`、`classic-qiongtong-season`、`project-v2-strength-model` |
| 天干、地支结构 | `bazi.relations.stems`、`bazi.relations.branches` | `oss-bazi-wuxing-tables` |
| 六破（仅第二例） | `bazi.relations.breaks` | `modern-six-breaks` |
| 十神五行关系 | `bazi.ten-gods.relation.peer/output/wealth/officer/resource` | `classic-yuanhai-ziping`、`oss-bazi-wuxing-tables` |
| 十神阴阳映射 | `bazi.ten-gods.polarity.same/opposite` | `classic-yuanhai-ziping`、`oss-bazi-wuxing-tables` |

来源的题名、作品、章节、URL、许可说明及项目建模边界在 `src/data/bazi/rules.json` 中维护，并经 `findBaziRule()` 在测试中实际解析；不在本文件复制原典正文。

## 维护规则

变更八字规则、关系表、藏干、证据算法或来源登记时，必须有意识地更新受影响的 Golden Case，并说明是资料事实修正、项目模型调整，还是测试基线错误。不得仅因外部排盘站点给出不同结论而改写预期；如需引入新的流派口径，应先登记独立规则和来源。
