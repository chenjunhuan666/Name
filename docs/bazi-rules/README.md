# Name V2 命理规则索引

> 本目录记录“文献事实→项目采用方式→代码→测试”，不把 Name 的工程权重包装成古籍定值。

## 追溯链

1. 运行时输出 `ruleId`。
2. `src/data/bazi/rules.json` 定位规则、文档与代码。
3. `public/data/bazi/rules.json` 和 `references.json` 是静态发布数据。
4. `public/data/bazi/classical/index.json` 登记典籍来源、commit 和 License。
5. [Golden Cases 基准案例集](../bazi-golden-cases.md) 固定结构、关系、旺衰证据、规则与来源的端到端回归。

## 状态约定

- `enabledInV2: false`：资料和设计已登记，但当前运行时尚未执行该规则。
- `enabledInV2: true`：已有代码和测试证明规则进入运行链。

## 文档

| 主题 | 文档 |
|---|---|
| 天干 | [01-tiangan.md](./01-tiangan.md) |
| 地支 | [02-dizhi.md](./02-dizhi.md) |
| 藏干 | [03-hidden-stems.md](./03-hidden-stems.md) |
| 五行 | [04-five-elements.md](./04-five-elements.md) |
| 月令 | [05-month-command.md](./05-month-command.md) |
| 季节旺衰 | [06-seasonal-strength.md](./06-seasonal-strength.md) |
| 通根 | [07-rooting.md](./07-rooting.md) |
| 生扶与克泄耗 | [08-support-control.md](./08-support-control.md) |
| 旺衰裁决 | [09-strength.md](./09-strength.md) |
| 十神 | [10-ten-gods.md](./10-ten-gods.md) |
| 天干关系 | [11-stem-relations.md](./11-stem-relations.md) |
| 地支关系 | [12-branch-relations.md](./12-branch-relations.md) |
| 调候 | [13-tiaohou.md](./13-tiaohou.md) |
| 起名倾向 | [14-naming-tendency.md](./14-naming-tendency.md) |

十神资料已登记，但当前没有 `tenGods.ts`、运行时 `ruleId` 或十神测试；现有五行旺衰证据不可替代十神结构解释。其状态为 `enabledInV2: false`，直到独立能力、规则来源和测试一并落地。
