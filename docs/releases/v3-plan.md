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
