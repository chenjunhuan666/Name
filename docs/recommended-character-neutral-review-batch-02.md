# 推荐字中性候选审校批次 02

> 本文说明全量中性候选的审校边界。批次初始化不是人工批准、拒绝或运行时导入；推荐层不因本文件或 JSON 批次而变化。

## 批次事实

| 项目 | 值 |
|---|---|
| 批次 ID | `neutral-candidates-02` |
| 逐字记录 | 988 |
| 当前状态 | `pending: 0`、`approved: 170`、`rejected: 818` |
| 含义风险标记 | 15 条，保留在原始证据中，不会自动消失 |
| 审校数据 | [recommended-character-review-batch-02-neutral.json](recommended-character-review-batch-02-neutral.json) |
| 固定来源 | `cicbyte/ai-chinese-naming@57302376e92bdb7e60f344d2e4a179ba57ca2c7e`，MIT |
| 来源字典 SHA-256 | `2a3150ac04c1641388424684364145e0d01781baf8db3e8018e1ca22b39bce69` |
| 审校队列 SHA-256 | `64d93b706de5cda4fe979fc32bdd9d5c661b0a929e25b536043b25cadd072846` |

## 固定范围与不变量

- 范围为固定审校队列中全部 `sentiment: neutral` 的候选；要求 `namingUsage >= 30`、`rarityLevel <= 2`。
- 每条记录保留来源释义、拼音、声调、五行、部首、笔画、规范字索引和风险标记；批次与队列 SHA-256 绑定。
- 初始器使用独占创建，已有批次文件不会被覆盖。
- 导入器只处理 `approved`，并继续校验固定来源、逐字证据、人工确认释义、审校人和 UTC 时间。`pending` 与 `rejected` 永不进入 `recommended-v2.json`。
- “中性”、适用度或未命中机器风险规则都不等于适名性；15 个风险标记项尤其不能因初始化而放宽。

## 已确认决定

2026-09-09，用户明确确认首组提案：拒绝 `渺、畹`，并使 `镇、淮、详、琥` 继续保持 `pending`。拒绝理由及词典核对见 [中性候选审校提案 02A](recommended-character-neutral-decision-proposal-batch-02a.md)；本次没有批准条目，因此不会导入运行时推荐字库。

## 后续决策方式

当前全部中性候选已完成最终审校：[平衡型批量审校](recommended-character-neutral-balanced-audit-2026-09-10.md) 以读音、历史姓名覆盖、来源使用度、生僻度、语义类别与现有组合风险的可重跑规则重建 971 条决定。170 条批准已由导入器写入运行时推荐字库；818 条拒绝不纳入默认推荐池。
