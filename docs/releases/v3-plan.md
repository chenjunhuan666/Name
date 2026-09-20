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

结论：Phase 1 已完成并启用；Phase 2 尚未开始，十神不参与旺衰、起名倾向、候选排序或姓名评分。
