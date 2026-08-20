# 传统文化宝宝起名

基于 React、TypeScript 与本地确定性规则的静态宝宝起名网站。

当前已完成开发计划 Phase 1～9：项目骨架、手动四柱录入、日主与藏干解析、带月令权重的基础旺衰和五档起名倾向、1,434 字本地起名汉字库、确定性双字名生成、音律与谐音规则、《诗经》《楚辞》、基础唐诗和宋词的真实出处关联、农历出生信息自动排盘，以及浏览器本地收藏与历史记录。

自动排盘使用 `lunar-typescript@1.8.6` 在浏览器本地完成农历转公历、节气区间和四柱计算，支持 1901～2100 年、闰月、00:00～23:59 与十二时辰。计算默认采用中国标准时间和公历自然日换日，真太阳时关闭；出生地点只作记录。节气交接、23 时换日或真太阳时存在流派差异时，应在结果确认页核对，并可切换到手动四柱修正。

本地记录使用版本化 `localStorage` 保存完整收藏姓名快照、最近 10 次起名会话和最近 12 个浏览姓名。刷新页面后可恢复最近一次起名信息，也可从“本地记录”页重新打开收藏、恢复历史排盘或分类清空记录。数据不会上传；清理站点数据、使用无痕窗口或更换设备会导致记录不可用，V1 不提供账号或云同步。

基础旺衰采用透明的 V1 启发式模型：表层干支每项计 1、藏干每项计 0.5、月令主五行额外计 1.5，再按日主的同类与生扶占比划分偏弱、中和、偏旺。该结果用于候选字筛选，不代表完整命理定论，也不会把“五行缺失”直接等同于“必须补入姓名”。

汉字库由 MIT 许可的 `ai-chinese-naming` 字典筛选转换而来，仅保留正向语义、起名适用度不低于 40、生僻等级不高于 2 且核心字段完整的字符。典籍库由 MIT 许可的 `chinese-poetry` 数据集转换，包含《诗经》305 篇、《楚辞》65 篇、基础唐诗176篇和宋词280篇；历法计算依赖同为 MIT 许可的 `lunar-typescript`。完整来源与许可见 `THIRD_PARTY_NOTICES.md`。

综合分按五行适配 30%、字义标注 20%、音律 15%、文化出处 15%、谐音安全 10%、字形 5%、常用程度 5% 加权。名字两字只有按原顺序连续出现在同一句原文中时，才获得文化出处分并展示可核对的篇名、作者与原文；未命中时该项为 0 分，不跨标点、不调换顺序、不补写来源。分数仅用于候选排序，不代表命运或吉凶。谐音检查当前只覆盖普通话静态负面词的精确拼音匹配，不等同于方言或全部语境审查。

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
```

## 重建汉字库与读音索引

先获取 `cicbyte/ai-chinese-naming` 仓库，再执行：

```bash
node scripts/build-character-library.mjs /path/to/ai-chinese-naming/src-tauri/data/dict.json
```

命令会同时生成 `public/data/characters/basic.json` 和 `public/data/characters/pronunciations.json`。

## 重建基础典籍库

先获取 `chinese-poetry/chinese-poetry` 仓库，再执行：

```bash
node scripts/build-classic-library.mjs /path/to/chinese-poetry
```

命令会读取《诗经》《楚辞》、水墨唐诗和宋词三百首四个来源文件，校验各类篇数后生成 `public/data/classics/basic.json`。
