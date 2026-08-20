import type { ClassicReference, ClassicWork } from '../../types';

const HAN_CHARACTER_PAIR = /^\p{Script=Han}{2}$/u;
const HAN_SEGMENT = /[\p{Script=Han}]+/gu;

function toClassicReference(
  work: ClassicWork,
  text: string,
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
  };
}

export function createClassicPhraseIndex(
  works: ClassicWork[],
): Map<string, ClassicReference> {
  const index = new Map<string, ClassicReference>();

  works.forEach((work) => {
    work.lines.forEach((line) => {
      const segments = line.match(HAN_SEGMENT) ?? [];

      segments.forEach((segment) => {
        const characters = Array.from(segment);

        for (let position = 0; position < characters.length - 1; position += 1) {
          const phrase = characters.slice(position, position + 2).join('');

          if (!index.has(phrase)) {
            index.set(phrase, toClassicReference(work, line));
          }
        }
      });
    });
  });

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

export async function loadClassicLibrary(): Promise<ClassicWork[]> {
  const response = await fetch(
    `${import.meta.env.BASE_URL}data/classics/basic.json`,
  );

  if (!response.ok) {
    throw new Error(`典籍语料加载失败（HTTP ${response.status}）`);
  }

  const works: unknown = await response.json();

  if (!Array.isArray(works)) {
    throw new Error('典籍语料格式错误：根节点必须是数组');
  }

  return works as ClassicWork[];
}
