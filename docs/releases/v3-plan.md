# Name V3 实施计划

> 本文件是 `Name_V3_改造计划.md` 的仓库内执行表。每个 Phase 开始前补齐范围、契约、兼容、验收与回退；未经对应门禁，不切换后续发布行为。

## Phase 0：基线冻结与存储迁移

| 项目 | 必填内容 |
|---|---|
| 新增文件 | `scripts/build-v2-artifact-manifest.mjs`：稳定生成并校验 V2 发布 JSON 清单；`src/config/version.ts`：集中定义四类版本；`docs/releases/v2-baseline.md`：冻结 V2 commit、配置和门禁；`docs/releases/v2-artifact-manifest.json`：记录全部发布 JSON 的 SHA-256；本文件：记录阶段契约与回退。 |
| 修改文件 | `src/core/storage/namingPersistence.ts`：增加 V1 key 到 V2 schema 的受保护迁移、逐条隔离、回读校验和恢复入口；`src/types/naming.ts`、`src/types/index.ts`：为三类本地记录增加版本元数据；收藏、浏览入口改用版本化记录工厂；迁移测试覆盖成功与失败边界；`package.json` 增加 manifest 生成/校验命令；`README.md` 说明新旧 key、保留与恢复策略。 |
| 数据契约 | 输入为 `traditional-chinese-naming:v1` 的 `{ version: 1, favorites, namingHistory, recentViews }`；输出为 `traditional-chinese-naming:v2` 的 `{ storageSchemaVersion: 2, dataVersion, ruleVersion, namingModelVersion, migration?, favorites, namingHistory, recentViews }`。新记录保存四类版本；旧记录标记为 schema 1 和 `legacy-unversioned`，不伪造历史模型版本。 |
| 兼容策略 | 首次读取优先校验 V2；V2 不存在时逐条读取 V1、隔离损坏项、写入 V2 并回读核对。V1 原始 key 永不由自动迁移删除或覆盖；迁移未成功时保存函数拒绝用空状态创建 V2。收藏姓名快照不重算。 |
| 验收 | 修改前冻结 V2 的 test/lint/typecheck/build/notices；修改后执行迁移成功、写入失败、损坏单条、重复执行、数量核对和 V1 恢复测试，再执行 `pnpm run test`、`lint`、`typecheck`、`build`、`notices:check`、manifest 稳定重跑及 `git diff --check`。 |
| 回退 | 发布行为尚未切换到任何 V3 算法。存储回退以保留的 V1 key 为事实源；`restoreNamingDataFromV1()` 可在显式恢复动作中重新生成 V2，失败时恢复原 V2 值。删除 V2 key 后重新加载也可再次触发自动迁移，V1 key 保持不变。 |

### Phase 0 执行结果（2026-09-15）

| 验收项 | 结果 |
|---|---|
| V2 基线门禁 | `9d0b9fc` 上 33 个测试文件、154 项测试通过；lint、typecheck、build、notices:check 通过；工作区无改动。 |
| 完整数据 manifest | 25 个 JSON 工件已生成；连续生成/校验结果一致，覆盖全部 `public/data/**/*.json` 和 `src/data/bazi/rules.json`。 |
| 版本配置 | storage schema 为 `2`；data/rule/naming model 版本均为 `3.0.0`，未切换检索、评分或其他 V3 算法。 |
| 迁移回归 | 覆盖成功、单条损坏隔离、重复执行、写入失败保护、三类数量回读、旧姓名快照保留与显式 V1 恢复。 |
| Phase 0 完整门禁 | 33 个测试文件、158 项测试通过；lint、typecheck、build、notices:check、manifest check、`git diff --check` 均通过。 |

结论：Phase 0 已完成；Phase 1 尚未开始，十神及后续 V3 feature flag 均未启用。

## Phase 1：十神运行时

| 项目 | 必填内容 |
|---|---|
| 新增文件 | `src/core/bazi/tenGods/relation.ts`：判断日主与目标干的五行关系；`resolver.ts`：按关系及阴阳同异映射十神和 ruleId；`index.ts`：按固定柱位顺序汇总可见天干与全部藏干；`explanation.ts`：输出无吉凶断语的结构说明；`src/config/featureFlags.ts`：保留十神 UI 回退开关；十神表驱动与集成测试。 |
| 修改文件 | `src/types/bazi.ts`、`src/types/index.ts` 增加 `TenGod`、`TenGodOccurrence` 和 `BaziAnalysis.tenGods`；`strength/index.ts` 只汇总十神，不改旺衰；`src/data/bazi/rules.json` 与发布副本增加正式规则；`docs/bazi-rules/10-ten-gods.md` 固定边界；Golden Cases 增加十神结果；`Analysis/index.tsx` 通过 feature flag 展示。 |
| 数据契约 | 输入为日干、年/月/时干及四柱地支藏干；输出 `TenGodOccurrence[]`，每项包含十神、目标干、柱位、显干/藏干位置、可选藏干角色和至少两个规则 ID。顺序固定为年干→年支藏干→月干→月支藏干→日支藏干→时干→时支藏干；日干自身不输出。 |
| 兼容策略 | 十神只新增只读结构字段和解释，不进入 `analyzeStrength()`、`createNamingTendencies()`、姓名生成器或 scorer。先以 `FEATURES.tenGods = false` 完成门禁，门禁通过后才开启并重跑；关闭时分析页保持 V2 展示。 |
| 验收 | 10×10 日干/目标干完整映射；阴阳同异及五类生克关系 ruleId；藏干主中余气不合并；顺序和确定性；Golden Cases；规则来源可解析；开启/关闭十神时除 `tenGods` 外的分析、起名倾向、候选和分数完全一致；完整 test/lint/typecheck/build/notices 门禁。 |
| 回退 | `FEATURES.tenGods = false` 即可移除页面展示并保持 V2 分析路径；十神字段不参与持久化重算、旺衰或姓名评分，因此回退不要求迁移用户数据。不得删除 V2 旺衰、关系或起名倾向实现。 |

### Phase 1 执行结果（2026-09-15）

| 验收项 | 结果 |
|---|---|
| 映射与顺序 | 10×10 日干/目标干映射通过；输出按年干、年藏干、月干、月藏干、日藏干、时干、时藏干排序，日干自身不输出，主中余气逐项保留。 |
| 规则与解释 | 新增五类生克关系和两类阴阳同异规则，均标记为 V2 禁用、V3 启用并可解析来源；解释明确不作吉凶或现实命运判断。 |
| 兼容门禁 | `FEATURES.tenGods = false` 时，34 个测试文件、163 项测试通过；lint、typecheck、build、notices:check 均通过。开关对比证明除 `tenGods` 外的分析结果相同，起名倾向与候选结果不变。 |
| 启用门禁 | `FEATURES.tenGods = true` 后，34 个测试文件、163 项测试通过；lint、typecheck、build、notices:check 均通过；Analysis 页面以默认折叠的只读区块展示。 |
| V2 冻结复验 | manifest 脚本改为直接读取冻结提交 `9d0b9fc`，当前 V3 数据变化下仍成功校验 25 个 V2 工件，冻结基线未被重算。 |

结论：Phase 1 已完成并启用；十神不参与旺衰、起名倾向、候选排序或姓名评分。Phase 2 的后续执行结果见下节。

## Phase 2：姓名质量基准

| 项目 | 必填内容 |
|---|---|
| 新增文件 | `src/types/benchmark.ts`：冻结场景、审查来源、运行结果与指标契约；`src/core/naming/benchmark.ts`：数据门禁、跨集合泄漏检查和指标计算；`src/core/naming/benchmark.test.ts`：指标与失败边界测试；`src/config/namingBenchmark.ts`：集中保存版本、规模和 Top-K 常量；`docs/naming-benchmark/`：规则、AI 审查来源、三个冻结数据切分及机器可读报告；三个脚本分别生成原始候选、冻结 AI-only 数据和运行 V2 质量基线。 |
| 修改文件 | `src/types/index.ts` 导出 Benchmark 类型；`src/core/naming/nameGenerator.ts` 导出既有确定性字符排序供基线脚本复用，不改变生产调用；`package.json` 增加生成、冻结与校验命令；`README.md` 说明数据边界；本文件记录 Phase 2 的真实完成状态。Phase 2 不切换生成器、scorer、hard filter 或生产页面。 |
| 数据契约 | 固定场景使用 `benchmarkVersion / surname / fixedTendencies / preference / resultLimit / dataVersion / ruleVersion / candidates`；冻结候选包含五档标签、理由、标签、hard-filter 期望、两个独立 AI 来源、最终 AI 裁决和事实缺口。来源 ID 使用 `ai-*`，禁止冒充人工身份。 |
| 兼容策略 | `FEATURES.benchmarkModel` 保持 `false`；V2 生成、检索、评分和页面行为不变。train 只用于后续调参，validation 只用于选型，holdout 在冻结前不可验收、冻结后不可用于循环调参。 |
| 验收 | 自动验证 schema、两份独立 AI 来源、最终裁决、五档覆盖、300 条、180/60/60 划分、来源摘要、姓名及语义组跨集合泄漏；输出 Top-20 Precision/Recall、NDCG@20、Reject Recall/Precision、Pairwise Accuracy、Diversity Score 和稳定 hash。V2 holdout 生成相对门槛，后续模型所有指标不得退化且至少一个核心指标严格改善。 |
| 回退 | 删除未被运行时引用的 Benchmark 工具与文档即可；生产路径未切换，无用户数据迁移。冻结数据和报告可由来源建议确定性重建；`FEATURES.benchmarkModel` 仍保持关闭。 |

### Phase 2 执行进度（2026-09-22）

| 验收项 | 结果 |
|---|---|
| Schema 与指标 | 已实现五档 judgement、固定场景、三类数据集和机器运行类型；Top-20 Precision/Recall、NDCG@20、Reject Recall/Precision、场景内 Pairwise Accuracy、Diversity Score 与稳定 SHA-256 输出均有测试。 |
| 数据门禁 | 已实现 300 条、两份独立 AI 来源、最终 AI 裁决、标签理由、180/60/60 数量、来源 SHA-256、完整姓名及 `leakageGroupId` 跨集合泄漏检查；跨场景绝对分数不会互相比较。 |
| AI-only 审查与冻结 | A、B 各完成 300 条独立建议，第三个 AI 上下文复核全部候选并裁决 66 条分类分歧；TypeSafe 实际辅助 36 条。59 条外部事实缺口按“无明确硬风险则暂不拦截”处理并保留 `factGap`。五个场景各按 36/12/12 分入 train/validation/holdout，总量 180/60/60。 |
| 自动化门禁 | 35 个测试文件、172 项测试通过；Benchmark 专项 9 项测试通过。lint、typecheck、build、notices:check、V2 manifest 25 工件、V2 生成 hash、来源队列、冻结切分、质量 baseline 和正式门槛的确定性检查均通过。 |
| V2 生成基线 | 五个固定场景连续三次输出一致，确定性 hash 为 `5522be82495cb33be2e1cc093410ce50507e146cb307d0f7c30a0c83c0fdca5b`；每个场景当前只返回 6/20 个结果，作为 Phase 3 前的真实 V2 基线保留，不解释为质量达标。 |
| V2 质量 baseline | 已在冻结候选上复用 V2 生产过滤、字符排序和 scorer 计算 train/validation/holdout 指标；holdout `outputHash` 为 `d16cf2c1f6ec24bc22516138de46440bba4bc9a2dc9003c7dfa231ea2cb984fc`。 |
| 正式门槛 | 已绑定 V2 holdout：七项指标不得低于 V2；六项核心指标中至少一项严格改善 `0.0001`。基线为 0 不代表质量达标。 |

结论：Phase 2 已按用户确认的 AI-only 口径完成并冻结。该结论只表示项目内部代理 Benchmark、V2 质量 baseline 与相对门槛可重复；不表示人工审美共识、现实姓名安全或登记适用性已经验证。`benchmarkModel` 仍关闭，生产路径没有切换；可进入 Phase 3 候选检索实施。

## Phase 3：候选检索

| 项目 | 必填内容 |
|---|---|
| 新增文件 | `src/config/namingRetrieval.ts`：固定 320 字候选、V2 Top-240 下限、每第一字 Top-30 Beam 与多标签配额；`src/core/naming/retrieval/`：字符排名、多标签候选选择、确定性补位、组合预估、Beam 和完整评分；`scripts/run-naming-retrieval-v3.mjs`：V2/V3 影子质量与性能门禁；两份 V3 报告和 Phase 3 状态文件。 |
| 修改文件 | `nameGenerator.ts` 明确保留 `generateNamesV2()`，公开入口仅在 `FEATURES.dynamicRetrieval` 开启时调用 V3；`package.json` 增加开发与 holdout 基准命令；README 与 Benchmark 文档记录边界。scorer、权重和持久化版本不变。 |
| 数据契约 | 字符先经过 negative、exclude character/style、rarity 等 hard filter；include 字不可用时整体拒绝。候选标签覆盖五行、风格、性别倾向、常用度、典籍、用户包含字和探索；归属、去重、补位及中文 tie-break 固定。Recall 使用与 V2 baseline 一致的完整评分前候选空间；Beam 截断另以完整评分数、Top20 overlap 与 max-score regret 评价。 |
| 兼容策略 | V2 Top-240 是 V3 320 字候选池的下限；V2 生成器不删除。`dynamicRetrieval=false` 时页面、API 与持久化仍走原 V2。影子脚本同时执行两条路径，不把 V3 报告写入用户记录。 |
| 验收 | train/validation 七项指标不得退化；正式 holdout 七项不得退化且六项核心指标至少一项改善 `0.0001`；V3 总耗时不高于 V2；同输入重复输出和诊断 hash 一致；max-score regret、内存、候选规模可机读；完整 test/lint/typecheck/build/notices/data/baseline 门禁通过。 |
| 回退 | 保持 `FEATURES.dynamicRetrieval=false` 即使用 V2。删除 V3 影子模块和报告即可完全回退，不涉及用户数据迁移；在正式质量门槛通过前禁止删除 V2。 |

### Phase 3 执行结果（2026-09-22）

| 验收项 | 结果 |
|---|---|
| 检索实现 | 已完成 hard filter → 强约束 → 多标签候选与去重 → 确定性补位 → 低成本组合预估 → 每第一字 Top-30 Beam → 完整评分 → 固定 tie-break → 多样性重排。默认 320 字候选包含 V2 Top-240 下限；合成测试验证输入逆序仍得相同结果。 |
| V2/V3 双轨 | `generateNamesV2()` 保留；公开 `generateNames()` 由 `FEATURES.dynamicRetrieval` 控制。当前开关保持 `false`，V2 baseline 复验仍为 train 180 / validation 60 / holdout 60。 |
| 开发门禁 | train 与 validation 七项指标均未退化，validation `diversityScore` 从 `0` 提升到 `0.2`；五场景总中位耗时 V2 `4715.80ms`、V3 `2906.73ms`；max-score regret `0`；重复输出和诊断 hash 一致。进程内峰值 heap delta 观测中，V2 最大 `146360616` bytes，V3 最大 `92059816` bytes；该数值仅代表当前 Node 进程，不是浏览器内存保证。 |
| 正式 holdout | 只在开发门禁通过后执行最终评估。七项指标与 V2 完全相同，无退化；五场景总中位耗时 V2 `5330.01ms`、V3 `3099.31ms`；max-score regret `0`；确定性通过。但六项核心指标均未改善 `0.0001`，正式质量门禁失败。 |
| 工程门禁 | 36 个测试文件、175 项测试通过；lint、typecheck、生产 build、notices、V2 manifest 25 工件、冻结 Benchmark 180/60/60 与 V2 质量 baseline 复验通过。 |

结论：Phase 3 的代码、影子对比和一次性正式准入评估均已执行完毕，但默认切换被正式门槛拒绝。`FEATURES.dynamicRetrieval` 必须继续为 `false`，V2 不得删除。后续 Phase 4 只能使用 train 调整评分、用 validation 选型，不能根据已查看的本次 holdout 逐项反向调参；新的默认准入必须按新版本协议重新冻结独立 holdout。

## Phase 4：排名质量

| 项目 | 必填内容 |
|---|---|
| 新增文件 | `src/data/semanticRoles.ts`：从显式字表、字义和风格推断语义角色并判断协调、重复、残句和冲突；`scripts/run-naming-ranking-v4.mjs`：只读 train/validation 的校准与选择；`scripts/build-naming-holdout-v2.mjs`、`freeze-naming-holdout-v2.mjs`：构造、双盲审、终审并冻结独立留出集；`scripts/run-naming-ranking-v4-holdout.mjs`：唯一一次正式准入评估和只读完整性检查；Phase 4 开发、holdout、审查和状态报告。 |
| 修改文件 | `semanticPair.ts`、`scorer.ts` 新增 V3.4 软信号路径并完整保留 V2 函数；`retrieval/pairSearch.ts`、`index.ts` 支持影子排名模型；`namingScore.ts` 固定 role scale 与 V3 多样性上限；类型、测试、README、命令和本执行表同步更新。 |
| 数据契约 | 语义角色只从项目内显式规则与已有字义推断；`fragment/conflicting` 仅软降分，不新增未经事实验证的硬过滤。train 只调 `roleScale`，validation 选择方案。新 `ai-only-v2` holdout 为 60 条、五场景各 12 条，并排除 V1 train/validation/holdout 的完整姓名和无序 `leakageGroupId`。 |
| 兼容策略 | `scoreName()`、`assessSemanticPair()`、V2 生成器和 V2 多样性参数保持不变；只有 `benchmarkModel=true` 才使用 V3.4 排名，只有 `dynamicRetrieval=true` 才进入动态检索。正式门禁失败时两个开关均不得开启。 |
| 验收 | train 的 Reject Recall/Precision 不退化；validation 七项不退化且至少一项核心指标提升；新 holdout 七项相对 V2 不退化且至少一项核心指标提升；五场景均返回 20 条、重复运行 hash 一致、V4 总耗时不高于 V2；完整 test/lint/typecheck/build/notices/data/baseline 门禁。 |
| 回退 | 当前生产未切换，保持两个开关为 `false` 即继续使用 V2。V3.4 影子模块和报告可独立移除，不迁移或重算用户数据；不得删除 V2 scorer、检索器和多样性实现。 |

### Phase 4 执行结果（2026-09-22）

| 验收项 | 结果 |
|---|---|
| 语义与排名实现 | 新增 nature、virtue、aspiration、time、space、light、water、plant、jade、action 等语义角色及协调/重复/残句/冲突关系；角色只影响组合语义与现代审美软分。V2 评分权重、函数和硬过滤边界保持不变。 |
| train / validation | 在 train 比较 `0.25/0.5/0.75/1` 四个固定尺度，以 validation 选择 `roleScale=1`。validation 七项无退化，NDCG@20 `+0.0071`、Pairwise Accuracy `+0.0397`；train 的 Reject Recall/Precision 无退化。五个场景均返回 20/20，首尾字各有 13～18 个唯一值，重复签名一致。 |
| 独立 AI-only holdout | A、B 两个隔离子代理各审查 60 条，第三个子代理全量终审；最终为 excellent 3、good 12、acceptable 17、poor 26、reject 2，另有 14 条 `factGap`。TypeSafe 未调用，因为现有证据足以完成语义裁决，且外部字典/方言/登记事实不能由模型补造。冻结集与 V1 全部切分零完整姓名和语义组重叠。 |
| 唯一一次正式 holdout | V4 相对 V2：Top-20 Recall `+0.0666`；Top-20 Precision、Reject Recall/Precision、Diversity 不变；NDCG@20 `-0.0066`、Pairwise Accuracy `-0.0231`。因此七项无退化门槛失败。 |
| 性能与确定性 | 当前机器五场景总中位耗时 V2 `4090.01ms`、V4 `2847.81ms`；每场景均返回 20 条，重复输出 hash 与诊断签名一致。该耗时只代表本地 Node 进程。 |
| 默认切换 | 正式质量门禁拒绝；`FEATURES.benchmarkModel=false`、`FEATURES.dynamicRetrieval=false`，`NAMING_MODEL_VERSION` 不变，生产继续使用 V2。holdout 报告检查命令只验证 SHA-256 和结论，不会重新执行评估。 |

结论：Phase 4 的 Step 26～31 已全部执行，代码、独立审查、冻结与唯一一次正式验收均已完成；但默认切换未获准。不得依据已查看的 `benchmark-v2.holdout.json` 和 `ranking-v4.holdout.ai.json` 回调参数。未来如需继续争取准入，应进入新的开发轮次并按新版本协议建立新的独立 holdout。

## Phase 5：专业解释

| 项目 | 必填内容 |
|---|---|
| 新增文件 | `src/types/explanation.ts`：统一 `ExplanationItem` 与普通/专业解释集合；`src/core/explanation/`：规则来源归并、八字解释和姓名解释的纯函数；`src/components/ExplanationPanel.tsx`：只负责模式切换和结构化展示；解释契约与边界测试。 |
| 修改文件 | `BaziAnalysis`、`GeneratedName` 增加可选解释集合；`analyzeBazi()` 在 `advancedExplanation` 开启时由 core 生成八字解释；公开姓名生成入口在开关开启时由 core 附加姓名解释；Analysis 与 NameDetail 页面用统一组件展示，关闭开关时保留原页面；样式、README 与本执行表同步更新。 |
| 数据契约 | `ExplanationItem` 固定包含 `id/title/summary`，可选 `detail/ruleIds/references/level`；普通模式只给用户可读推荐依据和注意点，专业模式覆盖日主、月令、藏干、旺衰证据、调候、十神、干支关系、五行方向，以及姓名八项评分、组合语义、音律、谐音和真实典籍关联。 |
| 兼容策略 | `explanations` 为可选字段，不提升 storage schema，不要求迁移旧收藏；旧记录缺少解释时由 core 按保存快照即时生成展示数据，不重算分数。`advancedExplanation=false` 时页面与生成输出保持 Phase 4/V2 兼容路径；旧页面 JSX 保留为回退路径。 |
| 验收 | core 输出确定、ID 唯一、ruleId 均能解析来源；普通模式无术语堆叠，专业模式覆盖计划字段；解释不得输出性格、事业、婚姻、健康、吉凶或现实命运判断；开关关闭时分析与姓名排序/分数不变；开启后完整 test/lint/typecheck/build/notices、V2 baseline 与 Phase 4 报告完整性门禁通过。 |
| 回退 | 将 `FEATURES.advancedExplanation` 设为 `false` 即恢复原 Analysis/NameDetail 展示；解释字段为附加只读数据，不参与旺衰、起名倾向、候选、评分、排序或持久化迁移，回退无需修改用户数据。 |

### Phase 5 执行结果（2026-09-22）

| 验收项 | 结果 |
|---|---|
| 统一解释契约 | 新增 `ExplanationItem` 与 `ExplanationBundle`，八字和姓名共用 `id/title/summary/detail/ruleIds/references/level` 结构；解释字段保持可选，不提升 storage schema。 |
| 八字解释 | core 同时生成普通与专业解释。普通模式覆盖结构、调候、五行方向和使用边界；专业模式覆盖日主、月令、藏干、旺衰证据、调候、十神、干支关系、五行方向，并从正式规则表归并可解析的 ruleId 与参考来源。 |
| 姓名解释 | 普通模式解释五行、组合意义、音律、普通话谐音、真实典籍关联和现实核验边界；专业模式逐项展示八项评分及组合语义。解释只读取已有姓名快照，不重新计算分数或排序。 |
| 页面与回退 | Analysis 和 NameDetail 共用纯展示 `ExplanationPanel`，默认普通解释，可切换专业解释。`advancedExplanation=false` 时原十神、倾向、证据、音韵、谐音、评分和典籍页面仍可完整显示；旧收藏缺少解释时由 core 基于保存快照即时补齐展示数据。 |
| 自动化门禁 | 开关关闭时 37 个测试文件、182 项测试通过；开启后 37 个测试文件、183 项测试通过。lint、typecheck、生产 build、notices、V2 manifest 25 工件、V2 生成确定性 hash、180/60/60 质量 baseline、Phase 4 开发报告和一次性 holdout 完整性检查均通过。 |
| 运行时验收 | 在本地 Chromium 中完成手动四柱 → 八字普通/专业解释切换 → 姓名生成 → 姓名详情普通/专业解释切换；页面展示和模式状态正常，旧评分保持 `99.6` 示例值不变。 |
| 默认状态 | `FEATURES.advancedExplanation=true`；`benchmarkModel=false`、`dynamicRetrieval=false`，生产仍使用 V2 检索与评分。Phase 4 的默认准入拒绝结论未被 Phase 5 绕过。 |

结论：Phase 5 的 Step 32～36 已全部执行并通过门禁，专业解释已启用。解释层是只读投影，不构成新的命理判断，也不改变 Phase 4 被拒绝的排名模型准入结论；回退只需关闭 `advancedExplanation`，无需迁移或重算用户数据。
