# Name V2 冻结基线

> 本文冻结 Phase 0 开始前的 Name V2 事实。V3 后续变更必须以该 commit、配置、数据哈希与质量门禁为对照；本文不是 V3 功能完成声明。

## 1. 源码与依赖锁定

| 项目 | 冻结值 |
|---|---|
| V2 commit | `9d0b9fc30758f537e1aa16869daeb2427b27ea09` |
| commit 时间 | `2026-09-15T16:21:38+08:00` |
| commit 主题 | `:sparkles: feat(naming): 完成 Name V2 改造与审计收口` |
| `pnpm-lock.yaml` SHA-256 | `d4f28afbdb2c533ef3e6bcad5dfa883ecb9bf590a0d9635c2a530fd980f12d06` |
| manifest schema | `1` |
| manifest 条目 | `25`（24 个 `public/data/**/*.json` + `src/data/bazi/rules.json`） |

完整机器可读清单见 [`v2-artifact-manifest.json`](./v2-artifact-manifest.json)，由 `scripts/build-v2-artifact-manifest.mjs` 从冻结 commit `9d0b9fc30758f537e1aa16869daeb2427b27ea09` 读取并生成；清单不含生成时间，因此后续工作树进入 V3 后仍可稳定复核 V2 工件。

## 2. 发布数据 SHA-256

| 文件 | 字节 | SHA-256 |
|---|---:|---|
| `public/data/bazi/classical/di-tian-sui.json` | 11,093 | `2b0f3d97fcaa18ae7dcc56510a994afcd59be343c17ab868ab30f6f4d7880516` |
| `public/data/bazi/classical/index.json` | 1,490 | `d34cbced70ff1f6fbc8b06b6d2d10b491d69a0d196527b0b6f4867342a4430b2` |
| `public/data/bazi/classical/qiongtong-baojian.json` | 45,232 | `39cb025bb3bdf5bd1074bea6c118ca67d173c2bcb0cc0707326e80c54e16aeac` |
| `public/data/bazi/classical/sanming-tonghui.json` | 9,841 | `cb457f862be68f9ba85c8de056139a9fb24c556c6de13e52e39463905b20a89d` |
| `public/data/bazi/classical/yuanhai-ziping.json` | 308,355 | `6a9e20d25bfd851e4d362f77679a6b73b158f7b707781560d358264824ca4f88` |
| `public/data/bazi/classical/ziping-zhenquan.json` | 11,653 | `4d56640fffc80b1e324bfd331a3199122e236ecd358f97a5ba15a4086a40c0c3` |
| `public/data/bazi/references.json` | 3,259 | `742836ecaaad70e1c3db99addf7236b90f197d2871b37e6710a221c7b1ec9941` |
| `public/data/bazi/rules.json` | 7,825 | `4a5a1b818b47fc2dd30de9959f5da3e4d8c13c643070597faec5873b5a273710` |
| `public/data/characters/basic.json` | 567,802 | `bd961a177645660c88cdf627766ad15c8f2fc5cb99cc003fb3eced8f5ab2c278` |
| `public/data/characters/kangxi-index.json` | 1,098,142 | `300a3b20adc3093e39ee5b097414d8b77c39c0a9229c037ba5be0d3b8f1c8fa4` |
| `public/data/characters/pronunciations.json` | 557,528 | `e8cd5ba7d943f00c0d5053c8a6bf4ec6153b3f6ca9ac59354da9229a4d31c216` |
| `public/data/characters/recommended-v2.json` | 1,822,114 | `e9a89e3821f04ca7686066f501696237b9d07bccad89035a4bc0dfb104d2fc90` |
| `public/data/characters/standard.json` | 583,682 | `7e4e38e385e4e14d3904753994746a2b8a8727f92483c60e126045d447b1e8e1` |
| `public/data/classics/basic.json` | 559,212 | `943926e40c9abe35773ca68cf72f723c0cfa93f9bba017d58ff4ecff8eca9cbc` |
| `public/data/classics/core/chuci.json` | 130,943 | `0f041872965acda1d91dec0401901bacf1ad0eb3420361123a5acbf9d927c30d` |
| `public/data/classics/core/lunyu.json` | 73,427 | `46b8b04c61c1a86d9b7a5891902a49054ee32304141f27568f6c11e8ed22cd39` |
| `public/data/classics/core/mengzi.json` | 144,280 | `6a9d5bd8b868bc3262a8ad9a38702d5fab98fcbc867431699a45e592b615eb18` |
| `public/data/classics/core/shijing.json` | 198,468 | `f87988fb5933f6a53363b563e3f53bb904114fb327fdcb7029e130070513d6b4` |
| `public/data/classics/core/zhouyi.json` | 136,135 | `e9ed11a7ccaf152a28236e52b9c62a2ab8165be62893ac3ad4a61ec951c369c6` |
| `public/data/classics/core/zhuangzi.json` | 294,163 | `842bc29e8256c12019943d5354cf688debd782d24da2223cd1c0cc0b443c3d23` |
| `public/data/classics/index.json` | 2,167 | `c22217aad639089d0e168a17f43c1da3f0b6c928d0165ed15765bbb19e250db4` |
| `public/data/classics/manual-imagery.json` | 735 | `ad08dae9aef23236bfe620b5cb00e291a63b2e1f80fdcb931c1871f961797f49` |
| `public/data/classics/song/songci.json` | 169,361 | `84db423b4378a25bb22b1969109454428ef59a22bac3b4103bd1b001db349743` |
| `public/data/classics/tang/tang.json` | 60,449 | `cb69493da9465f81224d1741871ae74ef69606b9af7931e663be05d2abe801ed` |
| `src/data/bazi/rules.json` | 10,571 | `264475c75d9490f76216b60f758f901f580b00b6a6cb9dc626348d56e4fc292e` |

## 3. V2 算法配置

### 评分权重

| 维度 | 权重 |
|---|---:|
| 五行方向 | 25% |
| 字义与组合语义 | 20% |
| 音律 | 15% |
| 文化出处 | 15% |
| 谐音安全 | 10% |
| 现代审美 | 10% |
| 字形 | 2.5% |
| 生僻度 | 2.5% |

### 候选池与结果参数

| 参数 | V2 值 |
|---|---:|
| `firstCharacterTopK` | 240 |
| `secondCharacterTopK` | 240 |
| `defaultResultLimit` | 60 |
| `retainedBufferFactor` | 30 |
| `compactionTriggerFactor` | 2 |
| `minimumCharacterPool` | 2 |

## 4. V2 Golden Cases

| ID | 四柱 | 冻结结论 |
|---|---|---|
| `metal-in-metal-season` | 甲辰 / 壬申 / 辛酉 / 丙申 | 偏旺；支持 28、制约 11、净值 17 |
| `metal-in-wood-season` | 甲寅 / 乙卯 / 庚申 / 丙午 | 偏弱；支持 9、制约 20、净值 -11 |
| `wood-support-and-constraint` | 戊辰 / 丙寅 / 甲子 / 庚申 | 偏旺；支持 23、制约 14、净值 9 |

详细结构、关系、证据、ruleId 与来源链以 [`docs/bazi-golden-cases.md`](../bazi-golden-cases.md) 和 `src/core/bazi/goldenCases.ts` 为准。

## 5. V2 完整质量门禁

执行对象为无本地改动的 `9d0b9fc30758f537e1aa16869daeb2427b27ea09`，执行日期为 `2026-09-15`。

| 命令 | 冻结结果 |
|---|---|
| `pnpm run test` | 通过；33 个测试文件、154 项测试 |
| `pnpm run lint` | 通过；0 error |
| `pnpm run typecheck` | 通过；0 error |
| `pnpm run build` | 通过；Vite 8.2.1，83 modules transformed |
| `pnpm run notices:check` | 通过；发布 notices 与来源同步 |

门禁完成后 `git status --short` 无输出，说明构建与 notices 检查未改变 V2 基线工作区。

## 6. Phase 0 回退边界

- 本基线只冻结 V2，不授权十神、检索、评分或 UI 行为切换。
- V3 能力在对应阶段门禁通过前不得替换 V2 主路径。
- 本地存储迁移始终保留 `traditional-chinese-naming:v1`；自动迁移失败不得覆盖 V1，也不得把空状态写入 V2。
- 如需恢复，以保留的 V1 原始值重新生成 V2；旧收藏中的姓名、分数与解释作为保存时快照保留，不由新模型静默重算。
