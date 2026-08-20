# 第三方数据声明

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

`public/data/characters/basic.json` 是根据
[cicbyte/ai-chinese-naming](https://github.com/cicbyte/ai-chinese-naming)
的 `src-tauri/data/dict.json` 筛选并转换得到的静态数据子集。

本项目仅保留五行与声调完整、正向语义、起名适用度不低于 40、且生僻等级不高于 2 的字符。五行字段沿用来源字典分类，在本项目中按 `0.7` 中等置信度处理，不代表唯一传统文化判断。

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

## chinese-poetry 典籍数据

`public/data/classics/basic.json` 根据
[chinese-poetry/chinese-poetry](https://github.com/chinese-poetry/chinese-poetry)
仓库提交 `b8594f81a89752241442f2ce267d6f66f96704ee` 的以下文件规范化生成：

- `诗经/shijing.json`：305 篇
- `楚辞/chuci.json`：65 篇
- `水墨唐诗/shuimotangshi.json`：176 篇
- `宋词/宋词三百首.json`：280 篇

转换仅统一篇目标识、书名、篇名、作者、章节、原文行和展示标题。文化出处匹配只接受名字两字在同一段连续汉字中按原顺序出现，不跨标点或非汉字间隔。

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
