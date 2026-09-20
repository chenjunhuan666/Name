# 传统文化宝宝起名

基于 React、TypeScript 与本地确定性规则的静态宝宝起名网站。

当前已完成 Name V2 主计划：项目骨架、手动四柱录入、结构化旺衰证据、月令季节基础调候、五档起名倾向、2,160 个启用字的本地起名汉字库、确定性双字名生成、九类风格偏好及排除、音律与谐音规则、八类典籍 A/B/C 分级关联、农历出生信息自动排盘，以及浏览器本地收藏与历史记录。

自动排盘使用 `lunar-typescript@1.8.6` 在浏览器本地完成农历转公历、节气区间和四柱计算，支持 1901～2100 年、闰月、00:00～23:59 与十二时辰。计算默认采用中国标准时间和公历自然日换日，真太阳时关闭；出生地点只作记录。节气交接、23 时换日或真太阳时存在流派差异时，应在结果确认页核对，并可切换到手动四柱修正。

本地记录使用版本化 `localStorage` 保存完整收藏姓名快照、最近 10 次起名会话和最近 12 个浏览姓名。V3.0 的存储 schema 使用 `traditional-chinese-naming:v2`；首次读取会从旧 `traditional-chinese-naming:v1` 逐条迁移、回读核对，自动迁移不会删除或覆盖 V1 原始值。损坏单条会被隔离并写入迁移诊断，整体迁移失败时不会用空状态覆盖旧数据；显式恢复可通过 `restoreNamingDataFromV1()` 重新从保留值生成 V2。新记录保存 storage/data/rule/model 四类版本，旧快照标记为 `legacy-unversioned`，不会伪造历史模型版本或静默重算收藏分数。数据不会上传；清理站点数据、使用无痕窗口或更换设备仍会导致记录不可用，当前不提供账号或云同步。

V1 曾采用表层、藏干和月令固定权重；当前 V2 已改为月令、季节、通根、透干、生扶与克泄耗的结构化证据，并输出偏弱至偏旺五档结果。基础调候按月令另行给出寒暖燥湿方向，只在起名倾向中最多上调一档，不改变旺衰证据分。该工程模型不代表完整命理定论，也不会把“五行缺失”直接等同于“必须补入姓名”。

V3.1 已加入十神运行时：以日干为基准，按五行关系及阴阳同异映射年、月、时干和四柱地支的主气/中气/余气藏干；日干自身不额外输出比肩。十神结果具有独立 `ruleId` 和固定顺序，仅在分析页作为可折叠的传统结构解释，不参与旺衰、起名五行倾向、姓名候选或评分，也不输出性格、事业、婚姻、健康、吉凶等现实命运判断。

汉字数据分为《通用规范汉字表》8105 字标准层和 `ai-chinese-naming` 转换得到的推荐层，并为可定位字头关联康熙索引。初始推荐层采用正向语义、起名适用度不低于 40、生僻等级不高于 2 且核心字段完整的记录；后续扩容必须经过固定证据、明确决策和受控导入。第二来源 `Chinese-Names-Corpus` 只为未命中硬拒绝的中性候选补充观察到的姓名使用证据，不覆盖语义、读音或同音风险；非规范字不进入运行候选。典籍库分包包含《诗经》《楚辞》《论语》《孟子》《周易》《庄子》、基础唐诗和宋词；来源分别登记 MIT、CC0-1.0 或 CC-BY-SA-4.0 许可。历法计算依赖 MIT 许可的 `lunar-typescript`。完整来源与许可见 `THIRD_PARTY_NOTICES.md`。

综合分权重集中在 `src/config/namingScore.ts`：五行方向 25%、字义与组合语义 20%、音律 15%、文化出处 15%、谐音安全 10%、现代审美 10%、字形与生僻度合计 5%。典籍关联分为 A 级原文连续、B 级同一分句按原顺序分别出现，以及只接受人工登记的 C 级同篇意象化用；不跨标点、不调换顺序、不自动编造 C 级出处。分数仅用于候选排序，不代表命运或吉凶。谐音检查覆盖完整姓名、名字两字、姓与首字的精确匹配，部分普通话近音作为软提示降分，常见网络负面词精确命中则进入硬过滤；不等同于方言或全部语境审查。

## 本地运行

```bash
pnpm install
pnpm run dev
```

## 验证

```bash
pnpm run test
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run notices:check
pnpm run data:manifest:v2:check
```

V2 冻结结果见 [`docs/releases/v2-baseline.md`](docs/releases/v2-baseline.md)，完整发布 JSON 清单由 `pnpm run data:manifest:v2` 稳定生成到 [`docs/releases/v2-artifact-manifest.json`](docs/releases/v2-artifact-manifest.json)。

## 重建汉字库与读音索引

先获取 `cicbyte/ai-chinese-naming` 仓库，再执行：

```bash
node scripts/build-character-library.mjs /path/to/ai-chinese-naming/src-tauri/data/dict.json
```

命令会同时生成 `public/data/characters/basic.json` 和 `public/data/characters/pronunciations.json`。

重建与批准导入共用[字音事实纠错](docs/character-pronunciation-corrections.md)：当前已将“茸”的来源 `rōng / 1` 纠正为运行时 `róng / 2`。固定审校证据保留原值；纠错不等于批准该字，来源出现未登记新值时会停止并要求复核。

V2 标准层与推荐层还需要两份独立的 8105 字转录、原始字典和康熙索引：

```bash
node scripts/build-character-libraries-v2.mjs /path/to/indexed-8105.txt /path/to/independent-8105.txt /path/to/ai-chinese-naming/src-tauri/data/dict.json
```

脚本会校验三级数量为 3500/3000/1605、两份转录逐字完全一致，并生成 `standard.json` 与 `recommended-v2.json`。

生成推荐字扩容审校队列执行：

```bash
node scripts/build-character-review-queue.mjs /path/to/ai-chinese-naming/src-tauri/data/dict.json
```

该命令只生成 `docs/recommended-character-review.json`。其中所有记录默认都是 `pending`，不会进入运行时推荐字库；需逐字核对含义、读音和实际起名适用性后显式批准，禁止为了达到数量目标批量启用。

首次建立“正向但低于生产阈值”的 83 字审校批次执行：

```bash
node scripts/init-character-review-batch.mjs
```

该初始化命令使用独占创建，不会覆盖已有审校结果。审校文件中的 `approved` 记录必须同时填写理由、人工确认的运行时释义 `approvedMeaning`、审校人和 UTC ISO-8601 时间；所有 `pending` 和 `rejected` 记录继续保持隔离。

2026-09-08 已按用户确认导入最后一字箐，首批 83 字收口：批准 20、拒绝 63、待审 0；当时推荐层 1,454 条、启用 1,453 字。该轮结果见[箐执行结果](docs/recommended-character-qing-review-2026-09-08.md#执行结果)，历史报告中的计数不代表当前状态。

2026-09-12 完成中性候选第二来源扩容：固定 `wainshine/Chinese-Names-Corpus` 的 commit、Apache-2.0 许可及三个输入哈希，按复姓优先规则解析 1,144,226 个全名。只重审原先唯一阻塞为“证据分不足”的候选，要求名字用字至少出现 5 次、补证后总分至少 70，批准并导入 204 字；280 个硬拒绝/明确拒绝与 334 个证据仍不足项均保持拒绝。该轮结束时推荐层 1,828 条、启用 1,827 字、重复 0；详见[第二来源审计](docs/recommended-character-second-source-audit-2026-09-12.md)。

同日完成第三来源完整审计：固定 `shunshi-ai/kangxi-mcp@fad0bdf7c34b0ec555edbb2af91db737825a4beb`（MIT）的现代释义、拼音、部首、笔画和五行数据，以 Unicode Unihan 17.0.0 核对单一普通话读音，并把姓名语料的现代 120 万全名与经过“前 200 高频姓氏 + 2～3 字全名”过滤的历史语料作为使用证据。846 个候选全部闭合为批准 175、拒绝 671、待审 0；既有硬拒绝不覆盖。当前推荐层 2,003 条、启用 2,002 字、重复 0。原计划“约 2,500～4,000”是逐步扩充目标，本轮固定来源穷尽后差 498 字，不以配额放宽语义和读音门禁；详见[第三来源审计](docs/recommended-character-third-source-audit-2026-09-12.md)及[总计划清单](docs/name-v2-remaining-plan-2026-09-08.md)。

第三来源落库后共 28 个测试文件、132 项测试，lint、typecheck、生产构建全部通过；审计报告与推荐库连续重跑哈希不变，批次重跑新增 0，`dist` 与源推荐库哈希一致。生产浏览器中第三来源批准字“旻”可生成 6 个候选，第三来源拒绝字“某”生成 0 个候选，控制台为 0 errors / 0 warnings。

2026-09-13 对第三来源中唯一拒绝理由为“未进入固定语义白名单”的 426 字完成一次性闭合审校；任何既有硬拒绝、读音或元数据问题均不覆盖。逐字决定为批准并导入 158 字、拒绝 268 字、待审 0；推荐层现为 2,161 条、启用 2,160 字、禁用 1 字、重复 0，距 2,500 字仍差 340 字。完整逐字释义、规则 ID、使用次数和拒绝理由见[第三来源补充语义审校](docs/recommended-character-third-source-supplement-2026-09-13.md)。

补充批次完成后共 32 个测试文件、148 项测试，lint、typecheck、生产构建和 `git diff --check HEAD` 均通过；批次稳定重跑新增 0、已导入 158，`dist` 与源推荐库 SHA-256 一致。测试还确认新增字“晞”可进入确定性姓名生成链路。

干支关系模块已于 2026-09-08 接入 `analyzeBazi().relations`，覆盖天干五合/有向生克与地支合冲会刑害破，保留柱位、解释及 ruleId；不参与旺衰评分或合化裁决。该段测试数量是当时快照，后续历法与 Golden Cases 回归均已完成。规则口径见[天干关系](docs/bazi-rules/11-stem-relations.md)及[地支关系](docs/bazi-rules/12-branch-relations.md)。

历法边界回归已新增 16 项测试，覆盖计划年份、春节/立春/惊蛰、换日、闰月及 CST 边界；该段测试数量是当时快照。预期属于固定依赖版本回归基线，不冒充独立历书验证；完整 Golden Cases 已在其后完成并纳入总验收，详见[历法测试说明](docs/calendar-boundary-regression.md)与[V2 总验收](docs/v2-acceptance-2026-09-09.md)。

为当前批次中仍为 `pending` 的记录生成完整词典事实表：

```bash
pnpm run data:build-pending-evidence-v2 /path/to/Unicode-17.0.0/Unihan_Readings.txt /path/to/CC-CEDICT/cedict_ts.u8
```

输出为[剩余候选词典证据](docs/recommended-character-pending-evidence-batch-01.md)及同名 JSON。脚本校验固定词典哈希、原始队列与批次证据，保留缺项、异读和声调差异，排除已批准/拒绝项。已保存报告是批准前 81 字快照，均有词典条目；“茸”的来源 `rōng` 与两份词典的 `róng / rong2` 不一致，运行时读音已纠正，后续审批拒绝其进入推荐层，不改原始证据。另外 80 字未触发读音或缺项提示，不代表适名性已通过。脚本不改变批准状态或运行时字库。

运行 `pnpm run data:build-pending-pairs-v2` 可生成[剩余候选组合检查](docs/recommended-character-pending-pairs-batch-01.md)及同名 JSON。已保存的是批准前 81 字与 1,435 个启用字的快照，两个位置共检查 232,470 个组合，语义/given 谐音规则合计淘汰 60 个；不是扩容后全量检查。报告保留完整命中、计数与每位置至多 3 个阅读样例；未命中规则不是人工自然度或适名性合格。审批改变后不能直接以旧词典报告运行该命令，脚本会因批次哈希不符而拒绝；若需重新生成，应先保留历史快照，再按新批次生成词典证据及组合报告。报告不执行批准，也不包含姓氏、偏好、综合评分或最终生成排序。

原剩余 81 字的[逐字审批提案](docs/recommended-character-decision-proposal-batch-01.md)已执行：批准 11 字及提案释义、默认排除 60 字、暂缓 10 字。暂缓名单为矜、髦、箐、銮、踔、鎏、苞、蹁、嬴、濂；未获新决定前保持隔离。

2026-09-08 的[剩余 10 字核查提案](docs/recommended-character-remaining-review-2026-09-08.md)已按用户确认执行六批准/三拒绝/一待审；完整验证状态见上文。另保存批准前 1,446 字推荐层的[28,920 个组合检查](docs/recommended-character-remaining-pairs-2026-09-08.json)，仅鎏芒命中淘汰；该旧扫描不覆盖新批准字符之间的新增组合或新释义导入，不等于全名安全。历史报告未覆盖重写。

首批最后一字见[箐的补充证据与审批提案](docs/recommended-character-qing-review-2026-09-08.md)：已批准 qìng/四声及“山间竹林”。批准前 2,904 组合检查保留为历史证据，不当作全名安全保证。

生成不改变最终决定的首批审校建议清单：

```bash
node scripts/build-character-review-guidance.mjs
```

该命令生成 JSON 与 Markdown 两份建议清单，将 83 字分为“建议保留进入独立复核”“建议拒绝”“需进一步核验”。建议仅依据固定来源中的简短释义、适用度、生僻度和风险标记，不能替代独立规范词典、真实姓名语料与人工判断，也不会修改审校批次。

对 19 个“建议保留进入独立复核”字符建立非绑定独立证据档案：

```bash
node scripts/build-character-independent-review.mjs /path/to/Unicode-17.0.0/Unihan_Readings.txt /path/to/ChineseNames/data-csv/givenname.csv
```

该命令固定核对 Unicode Unihan 17.0.0 的 `kDefinition`、`kMandarin`，以及 ChineseNames commit `dd948e738da42d22f5158877d359df359b190589` 的历史姓名字符覆盖，生成 `docs/recommended-character-independent-review-batch-01.json` 及 Markdown 版本。ChineseNames 仅限非商业研究使用，因此这里只保存逐字 present/absent 结论，不复制频次或评分，也不进入运行时和发布数据。“支持”只表示核心字义、读音和历史姓名语料三类证据一致，仍不等于人工批准。

对其中 9 个“独立证据支持”字符生成签署前适名性复核：

```bash
node scripts/build-character-suitability-review.mjs /path/to/CC-CEDICT/cedict_ts.u8
```

该命令固定校验 MDBG 2026-09-03 发布的 CC-CEDICT 解压文本 SHA-256，补齐多义项、异读和单字同音风险，再把每个候选字与当前 1,433 个启用推荐字按两个位置组成 2,866 个双字组合，执行项目现有 given-name 谐音规则检查。输出 `docs/recommended-character-suitability-review-batch-01.json` 及 Markdown 签署表；机器检查不覆盖姓氏、方言和人工自然度判断，也不会自动写入最终决定。

签署前扫描命中的 15 个具体危险组合已通过规则 `naming.homophone.review-batch-01` 固化到 `src/data/namingConstraints.ts`：13 个 `huì + 颀` 组合对应“晦气”，`莎弼`、`纱弼`对应高风险词。该字符级硬拦截与拼音谐音器并行生效，用于防止未来读音字段缺失或变化时重新放出已确认的危险组合；证据仍回指上述签署前复核 JSON。

人工逐字审校并同步更新批次计数后，执行批准记录导入门禁：

```bash
node scripts/import-approved-character-reviews.mjs /path/to/ai-chinese-naming/src-tauri/data/dict.json
```

导入器会重新核对队列 SHA-256、固定来源字典 SHA-256、逐字证据、决策计数和批准元数据，只把符合全部条件的 `approved` 记录转换并追加到 `recommended-v2.json`。运行时 `meanings.modern` 只使用审校人填写的 `approvedMeaning`，不会把固定来源的简短释义未经确认直接带入生产数据。没有批准记录时命令只完成校验，不写入推荐字库；同一批次重复执行保持幂等。

第二来源扩容使用固定的姓名性别语料、姓氏工作簿和许可文件：

```bash
pnpm run data:audit-second-source-v2 /path/to/Chinese_Names_Corpus_Gender（120W）.txt /path/to/Chinese_Family_Name（1k）.xlsx /path/to/Chinese-Names-Corpus/LICENSE
node scripts/import-approved-character-reviews.mjs /path/to/ai-chinese-naming/src-tauri/data/dict.json docs/recommended-character-review-batch-03-second-source.json
```

审计脚本先校验来源 commit 对应的三个 SHA-256，再按固定姓氏口径只累计名字部分，生成批次和聚合审计报告；仓库不保存原始全名。导入器把第二来源 commit 标记写入每个新增运行时记录，并保持重复执行幂等。该轮结束时合规来源支持启用 1,827 字，剩余缺口交由后续独立来源补证，不批量翻转拒绝项。

第三来源审计和受控导入使用固定 Kangxi、姓名语料与 Unihan 快照：

```bash
pnpm run data:audit-third-source-v2 /path/to/kangxi-mcp/packages/kangxi-core/data/chars.json.gz /path/to/kangxi-mcp/packages/kangxi-core/data/defs.json.gz /path/to/kangxi-mcp/LICENSE /path/to/Chinese_Names_Corpus_Gender（120W）.txt /path/to/Ancient_Names_Corpus（25W）.txt /path/to/Chinese_Family_Name（1k）.xlsx /path/to/Chinese-Names-Corpus/LICENSE /path/to/Unihan_Readings.txt --apply
```

脚本校验八个输入哈希；历史语料只接收姓氏工作簿前 200 行中的姓氏和 2～3 字全名，以排除长音译名。准入还要求规范字一二级、至少一份姓名语料出现 5 次、完整字典元数据、Unihan 单一读音一致及固定正向/中性运行时释义。审计决策为 175 批准、671 拒绝、0 待审；重复执行会重建同一批生成记录，不会累加或翻转既有硬拒绝。

## 重建基础典籍库

候选“颀、铖”的姓氏相关规则可离线复核：`pnpm run data:build-prefix-review-v2`。
输出为 `docs/recommended-character-prefix-review-batch-01.json/.md`，直接调用生产谐音算法，按运行时读音表的单字前缀分组扫描两个名字位置，并记录输入 SHA-256。
读音表不是姓氏专用字典；复姓、姓氏特殊读音、方言和自然度不在该扫描覆盖内。
泛用字库人工审批与具体全名检查分别进行，指定具体姓氏不是泛用字库审批的前置条件。


先获取 `chinese-poetry/chinese-poetry` 仓库，再执行：

```bash
node scripts/build-classic-library.mjs /path/to/chinese-poetry
```

命令会读取《诗经》《楚辞》、水墨唐诗和宋词三百首四个来源文件，校验各类篇数后生成 `public/data/classics/basic.json`。

V2 分包数据执行：

```bash
node scripts/build-classic-library-v2.mjs /path/to/chinese-poetry /path/to/chinese-classical-corpus/output/wujing/zhouyi.json /path/to/KR5c0126
```

运行时先读取 `public/data/classics/index.json`，再按索引加载可用分包。《周易》导入时固定校验 64 卦与 5 篇易传，并清除来源补录造成的重复屯卦；《庄子》固定校验 33 篇并移除数字化页码与来源标记。
