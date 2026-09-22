# Name Quality Benchmark

本目录保存姓名质量 Benchmark 的固定契约、AI-only 审查来源、冻结切分和机器可读报告。它只评价姓名生成质量，固定五行倾向以隔离历法与八字算法。

## 当前状态

- `benchmark-v1.review-queue.json`、`review-a.json`、`review-b.json`：确定性候选与两个相互隔离的原始 AI 审查输入包。
- `reports/review-a.ai-advisory.json`、`review-b.ai-advisory.json`：两份独立建议；`review-final.ai-advisory.json`：第三个 AI 上下文对 300 条候选的复核与分歧裁决。
- `benchmark-v1.train.json`、`validation.json`、`holdout.json`：按 180/60/60 冻结，使用 `ai-only-v1` 协议并绑定最终建议的 SHA-256。
- `reports/baseline-v2.ai.json`：V2 生产过滤与评分在冻结候选集上的质量基线；`thresholds-v1.ai.json`：后续模型的相对准入门槛。
- `reports/phase2-readiness.json`：Phase 2 机器可读完成状态。
- `reports/retrieval-v3.development.ai.json`：V3 检索在 train/validation 上的质量、耗时、内存、Beam、max-score regret 与确定性影子对比。
- `reports/retrieval-v3.holdout.ai.json`：唯一一次正式 holdout 准入结论；所有指标无退化，但没有核心指标严格改善。
- `reports/phase3-readiness.json`：Phase 3 实现完成但默认准入被拒绝的机器可读状态。
- `reports/ranking-v4.development.ai.json`：Phase 4 只读 train/validation 的语义角色与排名校准报告。
- `benchmark-v2.holdout.review-queue.json`、`review-a.json`、`review-b.json`：与 V1 三个切分零完整姓名/语义组重叠的新留出来源及两份隔离输入包。
- `reports/review-v2-holdout-a.ai-advisory.json`、`review-v2-holdout-b.ai-advisory.json`、`review-v2-holdout-final.ai-advisory.json`：两份独立 AI 建议和第三份全量 AI 终审；均未读取模型分数。
- `benchmark-v2.holdout.json`：60 条 `ai-only-v2` 独立冻结留出集，五个场景各 12 条。
- `reports/ranking-v4.holdout.ai.json`：Phase 4 唯一一次正式独立 holdout 结论；Recall 和性能改善，但 NDCG@20、Pairwise Accuracy 退化，默认准入被拒绝。
- `reports/phase4-readiness.json`：Phase 4 实施与验收完成、生产切换被拒绝的机器可读状态。
- `FEATURES.benchmarkModel` 仍为 `false`；Phase 2 不切换生产生成、评分或页面路径。
- `FEATURES.dynamicRetrieval` 仍为 `false`；V3 检索保留为影子路径，生产继续使用 V2。
- `FEATURES.benchmarkModel` 仍为 `false`；V3.4 语义角色排序未进入生产路径。

## 命令

```bash
pnpm run data:build:naming-review-queue
pnpm run data:check:naming-review-queue
pnpm run data:freeze:naming-benchmark
pnpm run data:check:naming-benchmark
pnpm run benchmark:naming
pnpm run benchmark:generation
pnpm run benchmark:generation:report
pnpm run benchmark:v2:quality
pnpm run benchmark:v2:quality:check
pnpm run benchmark:v3:retrieval
pnpm run benchmark:v3:retrieval:check
pnpm run benchmark:v4:ranking:check
pnpm run data:check:naming-holdout-v2
pnpm run data:check:naming-holdout-v2-frozen
pnpm run benchmark:v4:ranking:holdout:check
```

冻结流程见 [benchmark-review.md](benchmark-review.md)，指标定义见 [benchmark-rules.md](benchmark-rules.md)。59 条姓名仍有字音、识读或地域读法等外部事实缺口；冻结数据保留这些 `factGap`，并依据“没有明确硬风险证据则暂不硬拦截”的测试规则生成 `shouldPassHardFilter`。这不是事实核验或现实使用保证。

`benchmark:generation` 记录五个固定场景的生成耗时、确定性与输出 hash；`benchmark:v2:quality` 才计算冻结标签上的质量基线。当前 V2 五个场景的生产输出仍只有 6/20，属于后续候选检索阶段要改善的问题，不影响 Phase 2 建立可重复基准。

`benchmark:v3:retrieval` 只读取 train/validation，可安全重跑；它将候选空间 Recall 与 Beam 截断分开统计。`benchmark:v3:retrieval:holdout` 已执行一次并生成冻结结论，不得再用 holdout 循环调参。正式结果满足无退化、性能和确定性门禁，但没有满足“六项核心指标至少一项严格改善 `0.0001`”，所以默认开关保持关闭。

`benchmark:v4:ranking` 只读取 train/validation，可安全重跑；`benchmark:v4:ranking:holdout` 已对新冻结 holdout 执行且只执行一次。后续 `benchmark:v4:ranking:holdout:check` 仅校验报告、留出集和评分实现摘要，不会重新计算 holdout。正式门禁因 NDCG@20 和 Pairwise Accuracy 退化而拒绝，不得依据该结果继续调整 V3.4；若未来再次申请默认准入，必须建立新版本协议和新的独立 holdout。
