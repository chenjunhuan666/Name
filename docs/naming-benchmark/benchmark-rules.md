# 姓名质量 Benchmark V1 指标规则

## 评价边界

- `excellent`、`good` 视为 relevant；`acceptable`、`poor`、`reject` 不计入 relevant。
- 固定候选集用于 Precision、NDCG 和 Pairwise Accuracy；完整生产检索空间用于 Recall；独立 hard-filter 期望用于 Reject Precision/Recall。
- train 只允许用于调参，validation 只允许用于选型；锁定 holdout 不得用于循环调参或回改标签。
- 标签来自 `ai-only-v1`：两份独立 AI 建议加一次全量 AI 复核。TypeSafe 只辅助边界判断，不替代字典、方言或真实读者证据。
- 59 条外部事实缺口保留在冻结候选中，并按“无明确硬风险证据则暂不硬拦截”的测试约定处理；因此指标是项目内部代理指标，不是现实安全保证。

## 固定公式

| 指标 | V1 口径 |
|---|---|
| Top-20 Precision | 每个固定场景按 V2/V3 分数排序后的前 20 名中，`excellent/good` 占比；不足 20 条时以实际条数为分母。 |
| Top-20 Recall | 完整生产检索空间成功覆盖的 `excellent/good` 数量 ÷ 全部冻结 `excellent/good` 数量。 |
| NDCG@20 | 五档 gain 固定为 `4/3/2/1/0`，使用 `(2^gain-1)/log2(rank+1)`，实际 DCG 除以理想 DCG。 |
| Reject Recall | 被生产 hard filter 拦截的 `reject` 数量 ÷ 全部 `reject` 数量。 |
| Reject Precision | 被生产 hard filter 拦截且确为 `reject` 的数量 ÷ 全部被拦截数量。 |
| Pairwise Accuracy | 只比较同一场景内标签等级不同的冻结姓名对；排序正确计 1，分数相同计 0.5，错误计 0。 |
| Diversity Score | 排名前 20 且已检索、通过 hard filter 的姓名中，首字唯一率与次字唯一率的平均值；空结果为 0。 |

所有指标保留四位小数。运行输入按场景 ID 和姓名稳定排序，并对版本、场景、标签、结果和指标生成 SHA-256 `outputHash`。

## 冻结门禁

- 总候选恰为 300 条，按每场景 36/12/12 分入 train/validation/holdout，总量为 180/60/60。
- 每条候选必须绑定原始候选 ID、两份独立 AI 来源、最终 AI 裁决、分类、标签、理由和 hard-filter 期望。
- AI 来源 ID 必须以 `ai-` 开头，禁止用虚构人名冒充人工审查。
- `conservative-no-clear-risk` 必须同时保存非空 `factGap`。
- 相同完整姓名及相同 `leakageGroupId` 不得跨切分；五个分类均须覆盖。
- holdout 一经冻结不得因指标结果修改。

## 正式相对门槛

`reports/thresholds-v1.ai.json` 绑定 V2 holdout 的 `outputHash`。后续候选路径必须满足：七项指标均不低于 V2 holdout；并且 Top-20 Precision/Recall、NDCG@20、Reject Recall/Precision、Pairwise Accuracy 中至少一项严格改善 `0.0001`。V2 为 0 的指标只表示比较下限为 0，不表示该指标质量合格。
