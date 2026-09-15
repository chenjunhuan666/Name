# 字音事实纠错

更新：2026-09-05。只纠正已核验的拼音、声调；不作适名性批准，不修改来源字典及固定队列证据。

| 规则 | 字 | 固定来源 / 原运行时值 | 纠正值 | 独立依据 |
|---|---|---|---|---|
| pronunciation-correction:rong-2026-09-05 | 茸 | rōng / 1 | róng / 2 | Unihan kMandarin 为 róng；CC-CEDICT 词条读音为 rong2 |

证据来自 [81 字词典核对表](recommended-character-pending-evidence-batch-01.json) 中“茸”的记录；原始来源与读音冲突仍保留在该文件。

- Unicode Unihan 17.0.0：`Unihan_Readings.txt` SHA-256 `575e69c9ad85a4737a889a4f94cbd987042a90a1a6cc16dd3f4ed995c715b17c`；[来源](https://www.unicode.org/Public/17.0.0/ucd/Unihan.zip)。
- MDBG CC-CEDICT 2026-09-03：解压文本 SHA-256 `c211a1138cdc1194b492532c4ac3eb3a7bb786cbba2165ba885f91d34f266c88`；[来源及 CC BY-SA 4.0 说明](https://www.mdbg.net/chinese/dictionary?page=cc-cedict)。这里只记录读音事实，完整词典摘录及转换许可见既有复核材料和 THIRD_PARTY_NOTICES.md。

实现入口为 `scripts/character-pronunciation-corrections.mjs`，由基础字库/读音表重建、V2 字库重建和批准导入器共同使用。仅接受登记的原值或纠正值；遇到其他值或拼音与声调不配套时抛错，要求重新核验。输入对象及原始审校证据保持不变。

运行时读音表已修正“茸”的两个字段，仍为 6,751 条记录。将来若“茸”经人工批准导入推荐层，转换时会使用二声，并在 `sources.project` 追加本纠错规则 ID；该机制不自动批准“茸”。现有“颀、铖”及推荐字库内容均不受影响。

验证：21 个测试文件、77 项测试通过；原始固定源字典在临时目录重建出的 6,751 条读音与修正后的运行时表逐条一致；测试覆盖运行时加载、未来批准导入的纠错、原始证据保留、重复应用/导入幂等，以及未登记新值被拒绝。

修正后 `pronunciations.json` SHA-256：`e8cd5ba7d943f00c0d5053c8a6bf4ec6153b3f6ca9ac59354da9229a4d31c216`。

之前的前缀复核报告保留其原始输入哈希。本次纠错只改声调，去调读音仍为 `rong`，没有重新声称完成新快照的全量姓氏扫描。
