# 姓名质量 Benchmark V1 AI-only 审查与冻结流程

## 审查原则

1. A、B 两个独立 AI 审查上下文分别处理同一批候选；任一上下文不得查看另一份结果，也不得查看 V2/V3 分数或排名。
2. 第三个 AI 审查上下文复核全部 300 条，并逐项裁决 A/B 的类别分歧；所有来源用 `ai-*` 标识，禁止冒充人工身份。
3. 难以判断的语义边界可调用 TypeSafe 辅助，但必须保存模型、概率/置信信息与语言局限；模型概率不是字典、方言、登记适用性或真实读者样本。
4. hard-filter 只有发现明确硬风险时标为不通过。缺少外部事实且没有明确硬风险的姓名按 `conservative-no-clear-risk` 暂不拦截，同时保留 `factGap`，这是一项 Benchmark 测试约定，不是事实安全证明。
5. 冻结前检查来源、理由、标签、裁决状态和泄漏分组；冻结后不得因 V2/V3 指标结果回改标签或切分。

原始输入为 `benchmark-v1.review-a.json` 和 `benchmark-v1.review-b.json`；独立建议保存在 `reports/review-a.ai-advisory.json`、`review-b.ai-advisory.json`，最终复核保存在 `review-final.ai-advisory.json`。正式冻结数据只由 `scripts/freeze-naming-benchmark.mjs` 从这些可追溯来源确定性生成。

## 五档分类

| 分类 | 判定口径 |
|---|---|
| excellent | 自然顺口、语义完整、辨识度良好，且无明显硬风险。 |
| good | 整体自然可靠，存在轻微普通或风格偏弱但不妨碍使用。 |
| acceptable | 可以使用，但组合、音律或审美表现较普通。 |
| poor | 组合明显偏弱、不自然或存在显著软风险，但未达到硬拒绝。 |
| reject | 明确负面谐音、严重不自然或其他应由 hard filter 拦截的风险。 |

## 冻结结果

| 项目 | 数量/状态 |
|---|---|
| 候选姓名 | 300 |
| 独立 AI 审查 | A、B 各 300 条 |
| 最终 AI 复核与裁决 | 300 条 |
| TypeSafe 辅助 | 36 条，3 次请求 |
| 保留事实缺口 | 59 条，采用“无明确硬风险则暂不拦截”的测试约定 |
| train / validation / holdout | frozen：180 / 60 / 60 |
| V2 AI-only 质量 baseline | 已生成 |
| 正式比较门槛 | 已冻结；全部指标不低于 V2，且至少一个核心指标严格改善 |

这套数据适用于项目内部的确定性回归和 V2/V3 相对比较，不等价于人工审美共识、姓名登记建议或现实安全保证。
