# 第三方数据声明

本文件是 Name V2 发布包的统一第三方声明，构建时会原样同步到 `/THIRD_PARTY_NOTICES.md`；完整许可文本位于 `/licenses/`。

## 统一来源清单

下表是发布审计入口。“不适用”表示该来源未被导入运行时或发布包；许可未确认的研究来源必须继续保持此边界，不是本次发布的授权依赖。

| 项目 | URL | 使用文件/字段 | 固定版本 | License | 导入脚本 | 生成目标 | 商业使用 |
|---|---|---|---|---|---|---|---|
| 《通用规范汉字表》 | https://www.moe.gov.cn/jyb_sjzl/ziliao/A19/201306/t20130601_186002.html | 8105 字及分级顺序 | 2013；两份社区转录 commit 见下文 | 转录为 Apache-2.0/MIT；官方页仅作事实核对 | `build-character-libraries-v2.mjs` | `standard.json` | 发布包仅使用两份开源社区转录，依各自许可发布 |
| FOR-BAZI | https://github.com/gaaiyun/FOR-BAZI | 五本结构化古籍 JSON | `31c1d28…` | MIT | `import-bazi-classics.mjs` | `public/data/bazi/classical/` | 允许，须保留声明 |
| bazi-skill | https://github.com/jinchenma94/bazi-skill | 五行表、古籍索引 | `112a5d8…` | MIT | `build-bazi-rules.mjs` | `rules.json`、`references.json` | 允许，须保留声明 |
| skills-baby-name | https://github.com/amliuyong/skills-baby-name | 康熙索引与别名字表 | `d10427c…` | MIT（README 声明） | `build-kangxi-index.mjs` | `kangxi-index.json` | 允许，来源与上游声明已随发布包保留 |
| HeiGe-SuanMing | https://github.com/HeiGeAi/HeiGe-SuanMing | 五份命理研究文档 | `c069776…` | PolyForm Noncommercial 1.0.0 | 不适用 | 不适用 | 不允许进入商业发布包 |
| lunar-typescript | https://github.com/6tail/lunar-typescript | npm 包 `1.8.6` | `f086189…` | MIT | npm 安装 | 应用代码 | 允许，须保留声明 |
| ai-chinese-naming | https://github.com/cicbyte/ai-chinese-naming | `dict.json` | `5730237…` + 固定 SHA-256 | MIT | `build-character-libraries-v2.mjs` | `recommended-v2.json` 等 | 允许，须保留声明 |
| Unicode Unihan | https://www.unicode.org/versions/Unicode17.0.0/ | `kDefinition`、`kMandarin` | 17.0.0 + 固定 SHA-256 | Unicode Terms of Use | 审校脚本，见下文 | 非运行时审校文件 | 依 Unicode 条款；未复制完整数据库 |
| ChineseNames | https://github.com/psychbruce/ChineseNames | `givenname.csv` 覆盖结论 | `dd948e7…` + 固定 SHA-256 | GPL-3 + CC BY-NC-SA | 不适用 | 非运行时研究文档 | 仅非商业研究 |
| Chinese-Names-Corpus | https://github.com/wainshine/Chinese-Names-Corpus | 现代/历史姓名聚合计数、姓氏表 | `47d4af8…` + 固定 SHA-256 | Apache-2.0 | `audit-second-source-name-corpus.mjs`、`audit-third-source-character-expansion.mjs` | 审校报告与受控推荐层 | 允许，须保留声明 |
| CC-CEDICT | https://www.mdbg.net/chinese/dictionary?page=cc-cedict | 候选字义项与读音 | `2026-09-03 08:26:05 GMT` + 固定 SHA-256 | CC BY-SA 4.0 | 审校证据脚本，见下文 | 非运行时审校文件 | 允许，派生材料须署名及相同方式共享 |
| 教育部词典网站 | https://dict.revised.moe.edu.tw/ | 10 字事实摘要与链接 | 2026-09-08 核查 | 未确认开放数据许可 | 不适用 | 非运行时研究文档 | 未进入发布包，不作为发布授权依赖 |
| kangxi-mcp | https://github.com/shunshi-ai/kangxi-mcp | `chars.json.gz`、`defs.json.gz` | `fad0bdf…` + 固定 SHA-256 | MIT | `audit-third-source-character-expansion.mjs` | 第三来源审计与推荐层 | 允许，须保留声明 |
| chinese-poetry | https://github.com/chinese-poetry/chinese-poetry | 诗经、楚辞、论语、孟子、唐诗、宋词 | `b8594f8…` | MIT | `build-classic-library-v2.mjs` | `public/data/classics/` | 允许，须保留声明 |
| chinese-classical-corpus | https://github.com/gujilab/chinese-classical-corpus | `output/wujing/zhouyi.json` | `09a6873…` | CC0-1.0 | `build-classic-library-v2.mjs` | `core/zhouyi.json` | 允许 |
| 玄霖易學六破页面 | https://xuanlinyi.com/article_detail?id=301988 | 六组配对事实 | 2026-09-08 核查 | 未确认开放许可 | 不适用 | 只保留六组关系事实与来源链接 | 未复制文章、图像或断语，不作为发布授权依赖 |
| 汉典/《箐字考释》 | https://zdic.net/hant/%E7%AE%90；https://www.hanspub.org/journal/PaperInformation?paperID=92509 | 箐字必要事实摘要 | 2026-09-08 核查 | 各原站权利保留 | 不适用 | 非运行时审校提案 | 未进入发布包，不作为发布授权依赖 |
| Kanripo KR5c0126 | https://github.com/kanripo/KR5c0126 | 33 篇《庄子》文本 | `abb9cd3…` | CC-BY-SA-4.0 | `build-classic-library-v2.mjs` | `core/zhuangzi.json` | 允许，须署名及相同方式共享 |

以下分项保留完整 commit、哈希、字段边界和许可文本；统一清单不替代这些细节。

## 《通用规范汉字表》标准层

| 项目 | 登记值 |
|---|---|
| 名称 | 《通用规范汉字表》（2013） |
| 发布机构 | 中华人民共和国教育部、国家语言文字工作委员会 |
| 官方页面 | https://www.moe.gov.cn/jyb_sjzl/ziliao/A19/201306/t20130601_186002.html |
| 官方扫描附件 | https://www.moe.gov.cn/publicfiles/business/htmlfiles/moe/cmsmedia/other/2013/7/other98742.zip |
| 逐字转录 | `lqfeng/ChineseCharacters`，commit `6f6538e0ecc780c3e73d1c12ca3c7ba91fee82e1`，Apache-2.0 |
| 独立核验 | `jaywcjlove/table-of-general-standard-chinese-characters`，commit `ea539bfb164946a7aa71048954ac2bd4833098e7`，MIT |
| 导入脚本 | `scripts/build-character-libraries-v2.mjs` |
| 生成目标 | `public/data/characters/standard.json` |

教育部附件是 137 页扫描 PDF，无法作为构建时的机器可读输入；项目使用两份独立社区转录，生成前校验二者 8105 个字符及顺序完全一致，并校验一级 3500、二级 3000、三级 1605。该交叉核验降低转录错误风险，但不把社区转录表述为官方电子数据接口。

## FOR-BAZI 命理古籍结构化资料

| 项目 | 登记值 |
|---|---|
| 项目名 | `gaaiyun/FOR-BAZI` |
| 仓库 | https://github.com/gaaiyun/FOR-BAZI |
| 固定 commit | `31c1d28ca9f226d3d3ae0344dc66d0a4e5580e97` |
| License | MIT |
| 使用文件 | `data/classical_texts/index.json` 及核心五本 JSON |
| 导入脚本 | `scripts/import-bazi-classics.mjs` |
| 生成目标 | `public/data/bazi/classical/` |
| 商业使用 | MIT 许可范围内允许，需保留许可和版权声明 |

导入脚本将来源对象转为 Name 的稳定 schema，并在索引中保留来源 commit。该数据是开源项目的结构化转录，不因进入 Name 而变成经校勘的唯一古籍版本。

## bazi-skill 命理参考表

| 项目 | 登记值 |
|---|---|
| 项目名 | `jinchenma94/bazi-skill` |
| 仓库 | https://github.com/jinchenma94/bazi-skill |
| 固定 commit | `112a5d84cd1a001a0038cafca3be68d93e4c0cc9` |
| License | MIT |
| 使用文件 | `references/wuxing-tables.md`、`references/classical-texts.md` |
| 导入脚本 | `scripts/build-bazi-rules.mjs` 生成项目自有规则目录 |
| 生成目标 | `public/data/bazi/rules.json`、`references.json` |
| 商业使用 | MIT 许可范围内允许，需保留许可和版权声明 |

该来源只作为基础对照表和现代汇总佐证，不代替具体古籍条目。

## skills-baby-name 康熙字典索引

| 项目 | 登记值 |
|---|---|
| 项目名 | `amliuyong/skills-baby-name` |
| 仓库 | https://github.com/amliuyong/skills-baby-name |
| 固定 commit | `d10427c34ff756143fdacf96960d5c40cee73ceb` |
| License | MIT（仓库 `README.md` 声明；该 commit 根目录无独立 `LICENSE` 文件） |
| 使用文件 | `references/kangxi/index.tsv`、`aliases.tsv` |
| 导入脚本 | `scripts/build-kangxi-index.mjs` |
| 生成目标 | `public/data/characters/kangxi-index.json` |
| 商业使用 | 仓库声明 MIT；本来源记录已收录于发布声明和 `MIT-NOTICES.txt` |

只转换字头、部首、页位、分卷定位和异体映射，康熙全文未进入网站发布包。

## HeiGe-SuanMing 交叉核验资料

| 项目 | 登记值 |
|---|---|
| 项目名 | `HeiGeAi/HeiGe-SuanMing` |
| 仓库 | https://github.com/HeiGeAi/HeiGe-SuanMing |
| 固定 commit | `c06977620508417f14f4cdc85032f46ad3df9819` |
| License | PolyForm Noncommercial 1.0.0 |
| 使用文件 | `references/09_shenfeng_tongkao.md`、`10_mingli_yueyan.md`、`11_sanming_tonghui.md`、`13_ditian_sui.md`、`14_ziping_zhenquan.md` |
| 导入脚本 | 无；禁止导入发布数据 |
| 生成目标 | 无；仅本地研究与交叉核验 |
| 商业使用 | 不允许按当前许可直接进入商业发布包 |

Name 的 `public/`、`src/data/` 和构建产物不得包含该仓库 Markdown 的直接拷贝或改写版。

## lunar-typescript 历法计算

本项目使用 [6tail/lunar-typescript](https://github.com/6tail/lunar-typescript)
`1.8.6`（核对提交 `f086189a0b159cd5d71d1b23090ccf034444fa04`）在浏览器本地完成农历、公历、节气和四柱换算。

```text
MIT License

Copyright (c) 2020 6tail

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## ai-chinese-naming 汉字字典

`public/data/characters/basic.json`、`recommended-v2.json` 与非运行时审校文件
`docs/recommended-character-review.json` 是根据
[cicbyte/ai-chinese-naming](https://github.com/cicbyte/ai-chinese-naming)
的 `src-tauri/data/dict.json` 筛选并转换得到的静态数据子集。

审校队列固定使用 commit `57302376e92bdb7e60f344d2e4a179ba57ca2c7e`，并在生成时校验原始字典 SHA-256 为 `2a3150ac04c1641388424684364145e0d01781baf8db3e8018e1ca22b39bce69`。

本项目仅保留五行与声调完整、正向语义、起名适用度不低于 40、且生僻等级不高于 2 的字符。五行字段沿用来源字典分类，在本项目中按 `0.7` 中等置信度处理，不代表唯一传统文化判断。

V2 初始推荐层保留 1,434 条来源记录，其中“飚”不在《通用规范汉字表》8,105 字内，已标记 `naming.suitable=false`，初始运行时启用 1,433 条。首批审校新增 20 条，中性候选首轮新增 170 条，第二来源补证新增 204 条，第三来源审计新增 175 条；2026-09-13 又将第三来源中唯一拒绝理由为语义未批准的 426 字一次性闭合为批准并导入 158 字、拒绝 268 字、待审 0。当前 `recommended-v2.json` 共 2,161 条，其中启用 2,160 条、“飚”仍禁用、重复 0。每批扩展均保留固定队列、逐字决定、规则 ID 和来源标记，不以数量目标覆盖硬拒绝规则。

扩容原始候选快照曾保留 1,071 个 `pending`（83 个正向低分、988 个中性语义），用于保证历史审计可复现；它不是当前运行时决定表。后续首批、中性批次、第二来源、第三来源及补充语义批次均已闭合为 `pending=0`，批准项才会经门禁导入，拒绝项不进入运行时。`docs/recommended-character-review-guidance-batch-01.json` 及其 Markdown 版本只是非绑定初步建议；19 字独立复核文件也仅保存 Unihan、ChineseNames 等证据。导入脚本会复核固定队列或上游审计哈希、逐字证据、决策计数和审校元数据，只有通过全部门禁的 `approved` 记录才可导入推荐层。

来源项目声明其基础字典由 `pypinyin`、`cnchar` 与
`cnchar-radical/info` 等 MIT 许可数据生成，并使用 MIT License 发布。

```text
MIT License

Copyright (c) 2026 cicbyte

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 推荐字独立核验来源

### Unicode Unihan 17.0.0

| 项目 | 登记值 |
|---|---|
| 发布页 | https://www.unicode.org/versions/Unicode17.0.0/ |
| 下载文件 | https://www.unicode.org/Public/17.0.0/ucd/Unihan.zip |
| 使用子文件 | `Unihan_Readings.txt` |
| 子文件 SHA-256 | `575e69c9ad85a4737a889a4f94cbd987042a90a1a6cc16dd3f4ed995c715b17c` |
| 使用字段 | `kDefinition`、`kMandarin` |
| 条款 | https://www.unicode.org/terms_of_use.html |
| 数据边界 | 只作为独立字义与常用普通话读音证据，不作为人名适用性标准 |

### psychbruce/ChineseNames

| 项目 | 登记值 |
|---|---|
| 仓库 | https://github.com/psychbruce/ChineseNames |
| 固定 commit | `dd948e738da42d22f5158877d359df359b190589` |
| 使用文件 | `data-csv/givenname.csv` |
| 文件 SHA-256 | `d85e2cd23cd1dffaa4b64fe22c2220fe31ceec4daaa70d66ce4d5e99c32ee58e` |
| 数据范围 | 1930—2008 出生、2008 年仍在世的汉族人口姓名字符统计 |
| License | 数据集按来源说明同时遵循 GPL-3 与 CC BY-NC-SA，仅限非商业使用 |
| 数据边界 | 只把 19 字的 present/absent 覆盖结论写入非运行时研究文档；不复制原始频次、比例或主观评分，不进入 `public/` 和发布包 |

字符在该数据集中出现，只能证明它曾进入所覆盖年代的姓名；不能自动证明现代适名性。未出现也不能证明从未用于姓名，因为来源明确说明极罕见字符未收录。

### wainshine/Chinese-Names-Corpus 第二来源

| 项目 | 登记值 |
|---|---|
| 仓库 | https://github.com/wainshine/Chinese-Names-Corpus |
| 固定 commit | `47d4af8d816f6212787ddfc49173cac3b994b58d` |
| 使用文件 | `Chinese_Names_Corpus_Gender（120W）.txt`、`Chinese_Family_Name（1k）.xlsx` |
| 文件 SHA-256 | 姓名语料 `30d83f3e682d355ac1d3f18482c14ff5e2bdd0ebe704bff1ef196eabdf93939b`；姓氏工作簿 `c0ec61ece459e1527f692bff9d1bb8d184f49d48966659b1eb3822769e8f28b6` |
| License | Apache-2.0；固定 `LICENSE` SHA-256 `e03ba41d7fab20700769fe4118bab50d800cb74f990353a05d2f5fff1c228363` |
| 导入范围 | 只保存逐字聚合次数、性别计数、来源 commit 与审校结论；不保存原始全名 |
| 生成文件 | `docs/recommended-character-second-source-audit-2026-09-12.json/.md`、`docs/recommended-character-review-batch-03-second-source.json` |

脚本按 56 个固定复姓优先、其余单姓一字的口径拆分 1,144,226 个全名，得到 2,238 种名字用字。项目只对原审计中唯一规则为 `neutral.score.below-approve-threshold` 的候选补充 20 分语料证据，并要求至少观察到 5 次、总分至少 70；语义、读音、同音风险和用户明确拒绝均不可被该来源覆盖。最终 204 字通过受控导入，每条运行时记录带来源 commit。该语料库自身说明仍含少量 bad case，因此“出现”仅表示观察到姓名使用，不是对任何具体全名的适名背书。

### CC-CEDICT 适名性复核

| 项目 | 登记值 |
|---|---|
| 项目 | CC-CEDICT，由 MDBG 发布 |
| 发布页 | https://www.mdbg.net/chinese/dictionary?page=cc-cedict |
| 固定发布时刻 | `2026-09-03 08:26:05 GMT` |
| 下载文件 | `cedict_1_0_ts_utf-8_mdbg.txt.gz` |
| 压缩文件 SHA-256 | `2ecb528d2f45e4ee7f2b6a736d338878901c65cc099d02eec550c7b15309aa1e` |
| 解压文本 SHA-256 | `c211a1138cdc1194b492532c4ac3eb3a7bb786cbba2165ba885f91d34f266c88` |
| License | CC BY-SA 4.0 |
| 使用范围 | 只抽取 9 个候选字的词典义项、异读和人工选定同音风险字，写入非运行时签署前复核文件 |

2026-09-05 增加 `docs/recommended-character-pending-evidence-batch-01.json/.md`，为首批剩余 81 个待审字提取同一固定快照的词典义项和词条读音，并与上述 Unihan 17.0.0 固定文本对照。该报告中的 CC-CEDICT 摘录与结构化转换同样按 CC BY-SA 4.0 提供，保留 MDBG、来源链接及固定哈希；转换包括按待审字筛选、拆分词条和汇总读音。报告仅作为审校资料，不进入运行时或生产包；该批扩展未读取或复制 ChineseNames 数据。

`docs/recommended-character-suitability-review-batch-01.json` 及其 Markdown 版本包含上述 CC-CEDICT 释义摘录，该部分按 CC BY-SA 4.0 提供，并保留项目名、发布者、来源链接、许可和固定文件哈希。项目对释义只做结构化拆分和候选字范围筛选；非绑定适名性建议、项目谐音规则检查和双字样例属于 Name 项目的独立分析，不表示 MDBG 或 CC-CEDICT 对人名作出背书。

2026-09-05 增加 `docs/recommended-character-decision-proposal-batch-01.md`：依据上述固定 81 字证据制作中文释义概括和分组建议，CC-CEDICT 派生释义部分继续按 CC BY-SA 4.0 提供。未增加外部词典抓取或姓名频次数据；适名取舍为项目独立分析，未获人工签署，不进入运行时。

### 教育部词典网页研究引用（2026-09-08）

`docs/recommended-character-remaining-review-2026-09-08.md` 对剩余 10 字记录《重編國語辭典修訂本》（页面标识 2021）及《異體字字典》（页面标识 2024）的必要词义/读音事实摘要、核查日和逐字原站链接，未批量下载数据库、复制完整词条或字图，未导入运行时。来源是教育部词典编纂网站；适名建议是本项目独立判断，不代表发布者背书。其内容不继承 CC-CEDICT 的 CC BY-SA 许可；如进一步使用原站数据库，应单独核对原站授权范围。既有 Unihan/CC-CEDICT 固定证据及授权登记保持不变。

## shunshi-ai/kangxi-mcp 现代字表与字典元数据

| 项目 | 登记值 |
|---|---|
| 项目名 | `shunshi-ai/kangxi-mcp` |
| 仓库 | https://github.com/shunshi-ai/kangxi-mcp |
| 固定 commit | `fad0bdf7c34b0ec555edbb2af91db737825a4beb` |
| License | MIT，Copyright (c) 2026 Shunshi.AI |
| 使用文件 | `packages/kangxi-core/data/chars.json.gz`、`defs.json.gz` |
| 输入 SHA-256 | `ed0b463597e3f057bbd265ca1d8cfe7b426d34bc7a3c5aa332d77a63989cd9f2`、`2c0acb2f7deace4341be91119b36ceaadb53675d79c96c7df14580a179782a5b` |
| LICENSE SHA-256 | `73fc4434dc41d6802fd019fc0c19d899bb50f019fddad6dd81248d174b30029f` |
| 使用范围 | 第三来源推荐字审计中的现代释义、拼音、部首、简体/康熙笔画、繁体和五行字段 |

来源 README 明示《康熙字典》1716 原文属于公有领域，现代字表、五行归类和释义由 Shunshi.AI 汇编并按 MIT 发布；项目不把五行归类描述为客观统一标准。来源缺失五行时本项目拒绝候选，不自行推断。运行时记录保留固定 commit，审计还用 Unicode Unihan 17.0.0 `kMandarin` 独立核对单一普通话读音。

同一第三来源审计复用已登记的 `wainshine/Chinese-Names-Corpus@47d4af8d816f6212787ddfc49173cac3b994b58d`（Apache-2.0）：现代姓名性别语料继续按既有口径解析；历史语料 `Ancient_Names_Corpus（25W）.txt` 的 SHA-256 为 `cc672845c615a7815fadb9f4a7d6b70459b37bad4ae1d336bd988897afa4661a`。因历史文件混有音译长名，审计只接收固定姓氏工作簿前 200 行中的姓氏、且全名长度为 2～3 个汉字；过滤后 115,898 个姓名、4,909 个名字用字。仓库只保存聚合次数和逐字决定，不复制原始全名。姓名出现是使用证据，不表示来源项目对适名性背书。

## chinese-poetry 典籍数据

`public/data/classics/basic.json` 根据
[chinese-poetry/chinese-poetry](https://github.com/chinese-poetry/chinese-poetry)
仓库提交 `b8594f81a89752241442f2ce267d6f66f96704ee` 的以下文件规范化生成：

- `诗经/shijing.json`：305 篇
- `楚辞/chuci.json`：65 篇
- `水墨唐诗/shuimotangshi.json`：176 篇
- `宋词/宋词三百首.json`：280 篇

V2 文化典籍分包由 `scripts/build-classic-library-v2.mjs` 生成，新增使用：

- `论语/lunyu.json`：20 篇
- `四书五经/mengzi.json`：14 篇
- 生成目标：`public/data/classics/index.json`、`core/*.json`、`tang/tang.json`、`song/songci.json`

转换仅统一篇目标识、书名、篇名、作者、章节、原文行和展示标题。A 级要求名字两字在同一段连续汉字中按原顺序连续出现；B 级允许同一分句内按原顺序分别出现；C 级只接受人工登记的同篇意象，不跨标点、不调换顺序，也不由算法自动附会。

```text
MIT License

Copyright (c) 2016 JackeyGao

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## chinese-classical-corpus《周易》数据

| 项目 | 登记值 |
|---|---|
| 项目名 | `gujilab/chinese-classical-corpus` |
| 仓库 | https://github.com/gujilab/chinese-classical-corpus |
| 固定 commit | `09a6873e46760f20027e20bf48814f5c5cc05d66` |
| License | `output/` 结构化数据为 CC0-1.0；脚本为 MIT |
| 使用文件 | `output/wujing/zhouyi.json` |
| 导入脚本 | `scripts/build-classic-library-v2.mjs` |
| 生成目标 | `public/data/classics/core/zhouyi.json` |
| 商业使用 | CC0-1.0 不限制商业使用；仍保留来源和版本记录 |

来源共 69 条，覆盖 64 卦和《系辞上》《系辞下》《说卦》《序卦》《杂卦》。固定版本把缺失的屯卦和《系辞上》补录在数组末尾，同时原坤卦记录中残留一份重复屯卦；导入脚本显式校验 1～69 唯一顺序并删除该重复段，禁止无校验复制。

## 干支关系补充来源

天干五合、生克与地支合冲会刑害表复用已登记 MIT 许可的 bazi-skill 固定资料。六破配对另于 2026-09-08 核查[玄霖易學《第二十四章：地支六害六破介绍》](https://xuanlinyi.com/article_detail?id=301988)，只记录六组配对事实及来源链接，不复制文章、图像或吉凶断语。网页无已确认开源许可，使用 `modern-commentary` 来源分类，不混同 MIT 或古籍原文。项目仅输出结构关系，不采纳该页面的预测性结论。

## 箐字补充审校网页

2026-09-08 核查[汉典箐字条](https://zdic.net/hant/%E7%AE%90)及朱建萍[《“箐”字考释》出版页面](https://www.hanspub.org/journal/PaperInformation?paperID=92509)（《现代语言学》2024，12(7)：681–685；DOI 10.12677/ml.2024.127611）。仅在项目审校提案中保存必要事实摘要和来源链接，未复制完整词条、论文或字图，未批量导入运行时。来源权利与原许可保留，不将网页资料视为 CC-CEDICT 许可覆盖的数据；来源不对本项目适名选择背书。

## Kanripo《庄子》数据

| 项目 | 登记值 |
|---|---|
| 项目名 | `kanripo/KR5c0126` |
| 仓库 | https://github.com/kanripo/KR5c0126 |
| 固定 commit | `abb9cd323dfd9520894b56b3b8ba2ec0ea50554f` |
| License | CC-BY-SA-4.0（Kanseki Repository 内容许可） |
| 使用文件 | `KR5c0126_001.txt` 至 `KR5c0126_033.txt` |
| 底本标记 | 仓库文件声明 `BASEEDITION CHANT` |
| 导入脚本 | `scripts/build-classic-library-v2.mjs` |
| 生成目标 | `public/data/classics/core/zhuangzi.json` |
| 商业使用 | 允许，但再分发该转换数据必须保留署名、许可链接并遵守相同方式共享条件 |

导入脚本保留 33 篇原文与繁体用字，只移除 Kanripo 的页码、数字化来源和 Org 标记，不自动简繁转换，不把该文本描述为唯一校勘版本。`public/data/classics/core/zhuangzi.json` 是 Name 对上述来源做过格式归一和元数据清理的转换版，本转换数据按 CC BY-SA 4.0 提供，再分发时须保留 Kanseki Repository/Kanripo 署名、本变更说明、许可链接并以相同方式共享。许可说明见 https://www.kanripo.org/catalog 和 https://creativecommons.org/licenses/by-sa/4.0/ 。
