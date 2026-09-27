import type {
  ClassicCharacterSource,
  ClassicReference,
  ClassicSource,
  ClassicWork,
} from '../../types';

const HAN_CHARACTER_PAIR = /^\p{Script=Han}{2}$/u;
const HAN_SEGMENT = /[\p{Script=Han}]+/gu;
const REFERENCE_PRIORITY = { A: 3, B: 2, C: 1 } as const;
const phraseIndexCache = new WeakMap<
  readonly ClassicWork[],
  Map<string, ClassicReference>
>();

interface ClassicPackage {
  source: ClassicSource;
  path: string;
  workCount: number;
  available: boolean;
  load: 'on-demand';
  note?: string;
}

interface ClassicLibraryIndex {
  schemaVersion: 2 | 3;
  imageryRegistry?: {
    path: string;
    entryCount: number;
    reviewedAt: string;
  };
  characterSourceRegistry?: {
    path: string;
    entryCount: number;
    level: 'D';
    use: 'character-only';
  };
  packages: ClassicPackage[];
}

interface ClassicCharacterSourceRegistry {
  schemaVersion: 1;
  policy: string;
  level: 'D';
  use: 'character-only';
  entries: ClassicCharacterSource[];
}

interface ClassicImageryRegistry {
  schemaVersion: 1;
  policy: string;
  reviewedAt: string;
  entries: Array<{
    workId: string;
    givenName: string;
    explanation: string;
    evidenceText: string;
  }>;
}

export interface ClassicLibraryLoadResult {
  works: ClassicWork[];
  warnings: string[];
}

export function mergeClassicImageryRegistry(
  works: ClassicWork[],
  registry: ClassicImageryRegistry,
): ClassicWork[] {
  const entriesByWork = new Map<string, ClassicWork['imageryNames']>();
  registry.entries.forEach(
    ({ workId, givenName, explanation, evidenceText }) => {
      const entries = entriesByWork.get(workId) ?? [];
      entries.push({ givenName, explanation, evidenceText });
      entriesByWork.set(workId, entries);
    },
  );

  return works.map((work) => {
    const registered = entriesByWork.get(work.id);
    return registered?.length
      ? { ...work, imageryNames: [...(work.imageryNames ?? []), ...registered] }
      : work;
  });
}

function toClassicReference(
  work: ClassicWork,
  text: string,
  level: ClassicReference['level'],
  matchType: ClassicReference['matchType'],
  explanation: string,
): ClassicReference {
  return {
    workId: work.id,
    source: work.source,
    book: work.book,
    title: work.title,
    chapter: work.chapter,
    author: work.author,
    text,
    display: work.display,
    level,
    matchType,
    explanation,
  };
}

function putReference(
  index: Map<string, ClassicReference>,
  givenName: string,
  reference: ClassicReference,
) {
  const current = index.get(givenName);
  const currentPriority = current?.level
    ? REFERENCE_PRIORITY[current.level]
    : 0;
  const nextPriority = reference.level
    ? REFERENCE_PRIORITY[reference.level]
    : 0;

  if (!current || nextPriority > currentPriority) {
    index.set(givenName, reference);
  }
}

export function createClassicPhraseIndex(
  works: readonly ClassicWork[],
): Map<string, ClassicReference> {
  const cached = phraseIndexCache.get(works);
  if (cached) {
    return cached;
  }
  const index = new Map<string, ClassicReference>();

  works.forEach((work) => {
    work.lines.forEach((line) => {
      const segments = line.match(HAN_SEGMENT) ?? [];

      segments.forEach((segment) => {
        const characters = Array.from(segment);

        for (let first = 0; first < characters.length - 1; first += 1) {
          for (let second = first + 1; second < characters.length; second += 1) {
            const givenName = characters[first] + characters[second];
            const isAdjacent = second === first + 1;
            putReference(
              index,
              givenName,
              toClassicReference(
                work,
                line,
                isAdjacent ? 'A' : 'B',
                isAdjacent ? 'exact-phrase' : 'same-sentence',
                isAdjacent
                  ? '名字两字在原文中按原顺序连续出现。'
                  : '名字两字在同一分句中按原顺序分别出现。',
              ),
            );
          }
        }
      });
    });

    work.imageryNames?.forEach(({ givenName, explanation, evidenceText }) => {
      if (!HAN_CHARACTER_PAIR.test(givenName) || !explanation.trim()) {
        return;
      }
      putReference(
        index,
        givenName,
        toClassicReference(
          work,
          evidenceText?.trim() || work.lines[0] || work.display,
          'C',
          'same-work-imagery',
          explanation,
        ),
      );
    });
  });

  phraseIndexCache.set(works, index);
  return index;
}

export function findClassicReference(
  givenName: string,
  works: ClassicWork[],
): ClassicReference | undefined {
  if (!HAN_CHARACTER_PAIR.test(givenName)) {
    return undefined;
  }

  return createClassicPhraseIndex(works).get(givenName);
}

async function fetchJson<T>(path: string, label: string): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/classics/${path}`);
  if (!response.ok) {
    throw new Error(`${label}加载失败（HTTP ${response.status}）`);
  }
  return response.json() as Promise<T>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function loadClassicLibraryWithDiagnostics(
  sources?: ClassicSource[],
): Promise<ClassicLibraryLoadResult> {
  let index: ClassicLibraryIndex;
  try {
    index = await fetchJson<ClassicLibraryIndex>('index.json', '典籍索引');
    if (!Array.isArray(index.packages)) {
      throw new Error('典籍索引格式错误：缺少 packages 数组');
    }
  } catch (error) {
    return { works: [], warnings: [errorMessage(error)] };
  }

  const selectedSources = new Set(
    sources ??
      index.packages
        .filter(({ available }) => available)
        .map(({ source }) => source),
  );
  const packages = index.packages.filter(
    ({ available, source }) => available && selectedSources.has(source),
  );
  const packageResults = await Promise.allSettled(
    packages.map(async (item) => {
      const works = await fetchJson<unknown>(item.path, `${item.source} 典籍分包`);
      if (!Array.isArray(works)) {
        throw new Error(`${item.source} 典籍分包格式错误：根节点必须是数组`);
      }
      if (works.length !== item.workCount) {
        throw new Error(
          `${item.source} 典籍分包数量异常：期望 ${item.workCount}，实际 ${works.length}`,
        );
      }
      return works as ClassicWork[];
    }),
  );
  const warnings: string[] = [];
  const works = packageResults.flatMap((result) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    warnings.push(errorMessage(result.reason));
    return [];
  });

  if (!index.imageryRegistry) {
    return { works, warnings };
  }

  try {
    const registry = await fetchJson<ClassicImageryRegistry>(
      index.imageryRegistry.path,
      'C 级典籍意象登记表',
    );
    if (
      !Array.isArray(registry.entries) ||
      registry.entries.length !== index.imageryRegistry.entryCount
    ) {
      throw new Error('C 级典籍意象登记表数量异常');
    }

    return {
      works: mergeClassicImageryRegistry(works, registry),
      warnings,
    };
  } catch (error) {
    warnings.push(errorMessage(error));
    return { works, warnings };
  }
}

export async function loadClassicLibrary(
  sources?: ClassicSource[],
): Promise<ClassicWork[]> {
  return (await loadClassicLibraryWithDiagnostics(sources)).works;
}

export async function loadClassicCharacterSources(): Promise<
  ClassicCharacterSource[]
> {
  const index = await fetchJson<ClassicLibraryIndex>('index.json', '典籍索引');
  if (!index.characterSourceRegistry) {
    return [];
  }
  const registry = await fetchJson<ClassicCharacterSourceRegistry>(
    index.characterSourceRegistry.path,
    'D 级单字文化来源登记表',
  );
  if (
    !Array.isArray(registry.entries) ||
    registry.entries.length !== index.characterSourceRegistry.entryCount ||
    registry.level !== 'D' ||
    registry.use !== 'character-only' ||
    registry.entries.some(
      ({ char, text, level, use }) =>
        Array.from(char).length !== 1 ||
        !/^\p{Script=Han}$/u.test(char) ||
        !text.includes(char) ||
        level !== 'D' ||
        use !== 'character-only',
    )
  ) {
    throw new Error('D 级单字文化来源登记表格式或数量异常');
  }
  return registry.entries;
}
