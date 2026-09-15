import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageIntro } from '../../components/PageIntro';
import { PhaseNotice } from '../../components/PhaseNotice';
import {
  NAMING_SCORE_DIMENSIONS,
  RARITY_LIMITS,
} from '../../config/namingScore';
import { NAMING_STYLE_OPTIONS } from '../../config/namingStyles';
import {
  filterCharacters,
  loadCharacterLibrary,
  loadPronunciationLibrary,
} from '../../core/characters/characterRepository';
import { loadClassicLibraryWithDiagnostics } from '../../core/classics/classicRepository';
import { generateNames } from '../../core/naming/nameGenerator';
import { createFavoriteNameRecord } from '../../core/storage/namingPersistence';
import { FIVE_ELEMENTS } from '../../data/fiveElements';
import { useNaming } from '../../store/useNaming';
import type {
  CharacterPronunciation,
  ClassicWork,
  FiveElement,
  Gender,
  GeneratedName,
  NamingCharacter,
  NamingPreference,
  NamingStyle,
} from '../../types';

const styleOptions = ['全部', ...NAMING_STYLE_OPTIONS] as const;
const rarityOptions = [
  { label: '常用优先', value: 'common', maxRarity: RARITY_LIMITS.common },
  { label: '均衡', value: 'balanced', maxRarity: RARITY_LIMITS.balanced },
  {
    label: '允许个性字',
    value: 'distinctive',
    maxRarity: RARITY_LIMITS.distinctive,
  },
] as const;
const classicOptions: Array<{
  label: string;
  value: NonNullable<NamingPreference['classicPreference']>;
}> = [
  { label: '不限典籍', value: 'none' },
  { label: '诗经', value: 'shijing' },
  { label: '楚辞', value: 'chuci' },
  { label: '儒家经典', value: 'confucian' },
  { label: '道家经典', value: 'taoist' },
  { label: '唐诗', value: 'tang' },
  { label: '宋词', value: 'song' },
];
const preferenceStyleSet = new Set<NamingStyle>(NAMING_STYLE_OPTIONS);

function parseCharacterInput(value: string): string[] {
  return [...new Set(Array.from(value).filter((char) => /\p{Script=Han}/u.test(char)))];
}
const genderOptions: { label: string; value: Gender | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '男宝', value: 'male' },
  { label: '女宝', value: 'female' },
];
const sortOptions = [
  { label: '综合评分', value: 'score' },
  { label: '五行适配', value: 'element' },
  { label: '音律评分', value: 'phonetic' },
  { label: '常用程度', value: 'rarity' },
] as const;
type SortKey = (typeof sortOptions)[number]['value'];

function sortNames(names: GeneratedName[], sortBy: SortKey): GeneratedName[] {
  return [...names].sort((left, right) => {
    const scoreDifference =
      sortBy === 'score'
        ? right.score - left.score
        : right.scoreBreakdown[sortBy] - left.scoreBreakdown[sortBy];

    return (
      scoreDifference ||
      right.score - left.score ||
      left.givenName.localeCompare(right.givenName, 'zh-CN')
    );
  });
}

export function NamesPage() {
  const { state, dispatch } = useNaming();
  const [characters, setCharacters] = useState<NamingCharacter[]>([]);
  const [pronunciations, setPronunciations] = useState<
    CharacterPronunciation[]
  >([]);
  const [classicWorks, setClassicWorks] = useState<ClassicWork[]>([]);
  const [classicLoadWarning, setClassicLoadWarning] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [element, setElement] = useState<FiveElement | 'all'>(
    () => state.analysis?.namingTendencies?.[0]?.element ?? 'all',
  );
  const [gender, setGender] = useState<Gender | 'all'>(state.gender);
  const [style, setStyle] = useState<(typeof styleOptions)[number]>('全部');
  const [excludedStyles, setExcludedStyles] = useState<NamingStyle[]>([]);
  const [rarityPreference, setRarityPreference] =
    useState<NamingPreference['rarityPreference']>('balanced');
  const [classicPreference, setClassicPreference] =
    useState<NonNullable<NamingPreference['classicPreference']>>('none');
  const [includeCharacters, setIncludeCharacters] = useState('');
  const [excludeCharacters, setExcludeCharacters] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('score');
  const [visibleLimit, setVisibleLimit] = useState<30 | 60>(30);
  const maxRarity =
    rarityOptions.find(({ value }) => value === rarityPreference)?.maxRarity ??
    RARITY_LIMITS.default;

  useEffect(() => {
    let isActive = true;

    Promise.all([loadCharacterLibrary(), loadPronunciationLibrary()])
      .then(([library, pronunciationLibrary]) => {
        if (isActive) {
          setCharacters(library);
          setPronunciations(pronunciationLibrary);
          setLoadError('');
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setLoadError(
            error instanceof Error ? error.message : '本地起名数据加载失败',
          );
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    loadClassicLibraryWithDiagnostics().then(({ works, warnings }) => {
      if (isActive) {
        setClassicWorks(works);
        setClassicLoadWarning(
          warnings.length
            ? `部分典籍数据未加载，核心姓名生成不受影响：${warnings.join('；')}`
            : '',
        );
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  const filteredCharacters = useMemo(
    () =>
      filterCharacters(characters, {
        elements: element === 'all' ? undefined : [element],
        gender: gender === 'all' ? undefined : gender,
        styleTags: style === '全部' ? undefined : [style],
        excludedStyleTags: excludedStyles,
        maxRarity,
        query,
      }),
    [characters, element, excludedStyles, gender, maxRarity, query, style],
  );
  const visibleCharacters = filteredCharacters.slice(0, 30);
  const generatedNames = useMemo(
    () =>
      generateNames({
        surname: state.surname,
        characters: filteredCharacters,
        tendencies: state.analysis?.namingTendencies,
        pronunciations,
        classicWorks,
        preference: {
          styles:
            style !== '全部' && preferenceStyleSet.has(style as NamingStyle)
              ? [style as NamingStyle]
              : [],
          excludeStyles: excludedStyles,
          includeCharacters: parseCharacterInput(includeCharacters),
          excludeCharacters: parseCharacterInput(excludeCharacters),
          rarityPreference,
          genderExpression:
            gender === 'male'
              ? 'masculine'
              : gender === 'female'
                ? 'feminine'
                : 'neutral',
          classicPreference,
        },
      }),
    [
      classicWorks,
      filteredCharacters,
      gender,
      includeCharacters,
      pronunciations,
      rarityPreference,
      classicPreference,
      excludeCharacters,
      excludedStyles,
      state.analysis?.namingTendencies,
      state.surname,
      style,
    ],
  );
  const visibleNames = useMemo(
    () => sortNames(generatedNames, sortBy).slice(0, visibleLimit),
    [generatedNames, sortBy, visibleLimit],
  );

  useEffect(() => {
    dispatch({ type: 'SET_GENERATED_NAMES', payload: generatedNames });
  }, [dispatch, generatedNames]);

  return (
    <div className="pageWidth innerPage">
      <PageIntro
        eyebrow="姓名推荐"
        title="从候选好字，组合可解释姓名"
        description="筛选条件会实时生成双字名，并按五行、组合语义、音律、分级典籍关联、谐音、字形与常用程度综合排序。"
        aside={<span className="phaseTag">Phase 9 本地收藏</span>}
      />

      <section className="characterFilters" aria-label="起名汉字筛选">
        <div className="filterGroup">
          <span>五行</span>
          <div>
            <button
              aria-pressed={element === 'all'}
              className={element === 'all' ? 'isSelected' : ''}
              onClick={() => setElement('all')}
              type="button"
            >
              全部
            </button>
            {FIVE_ELEMENTS.map((item) => (
              <button
                aria-pressed={element === item}
                className={element === item ? 'isSelected' : ''}
                key={item}
                onClick={() => setElement(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="filterGroup">
          <span>性别</span>
          <div>
            {genderOptions.map((item) => (
              <button
                aria-pressed={gender === item.value}
                className={gender === item.value ? 'isSelected' : ''}
                key={item.value}
                onClick={() => setGender(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filterGroup filterGroup--styles">
          <span>风格</span>
          <div>
            {styleOptions.map((item) => (
              <button
                aria-pressed={style === item}
                className={style === item ? 'isSelected' : ''}
                key={item}
                onClick={() => {
                  setStyle(item);
                  if (item !== '全部') {
                    setExcludedStyles((current) =>
                      current.filter((excluded) => excluded !== item),
                    );
                  }
                }}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="filterGroup filterGroup--styles">
          <span>排除风格</span>
          <div>
            {NAMING_STYLE_OPTIONS.map((item) => {
              const isExcluded = excludedStyles.includes(item);
              return (
                <button
                  aria-pressed={isExcluded}
                  className={isExcluded ? 'isSelected' : ''}
                  key={item}
                  onClick={() => {
                    setExcludedStyles((current) =>
                      isExcluded
                        ? current.filter((styleName) => styleName !== item)
                        : [...current, item],
                    );
                    if (style === item) {
                      setStyle('全部');
                    }
                  }}
                  type="button"
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <div className="characterSearchRow">
          <label>
            <span>关键词</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="汉字、拼音或字义"
              type="search"
              value={query}
            />
          </label>
          <label>
            <span>生僻度</span>
            <select
              onChange={(event) =>
                setRarityPreference(
                  event.target.value as NamingPreference['rarityPreference'],
                )
              }
              value={rarityPreference}
            >
              {rarityOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>包含字</span>
            <input
              maxLength={8}
              onChange={(event) => setIncludeCharacters(event.target.value)}
              placeholder="例如：清、宁"
              value={includeCharacters}
            />
          </label>
          <label>
            <span>排除字</span>
            <input
              maxLength={16}
              onChange={(event) => setExcludeCharacters(event.target.value)}
              placeholder="例如：梓、沐"
              value={excludeCharacters}
            />
          </label>
          <label>
            <span>典籍</span>
            <select
              onChange={(event) =>
                setClassicPreference(
                  event.target.value as NonNullable<
                    NamingPreference['classicPreference']
                  >,
                )
              }
              value={classicPreference}
            >
              {classicOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="generatedNamesPanel" aria-busy={isLoading}>
        <div className="generatedNamesHeading">
          <div>
            <p className="eyebrow">双字姓名</p>
            <h2>{state.surname ? `为${state.surname}姓宝宝精选` : '等待姓氏信息'}</h2>
            <p aria-live="polite">
              {isLoading
                ? '正在组合候选名…'
                : loadError
                  ? '姓名生成暂不可用'
                  : `已生成并保留 ${generatedNames.length} 个候选名`}
            </p>
          </div>
          <label className="nameSortControl">
            <span>排序方式</span>
            <select
              onChange={(event) => setSortBy(event.target.value as SortKey)}
              value={sortBy}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="nameSortControl">
            <span>显示数量</span>
            <select
              onChange={(event) =>
                setVisibleLimit(Number(event.target.value) as 30 | 60)
              }
              value={visibleLimit}
            >
              <option value={30}>前 30 个</option>
              <option value={60}>前 60 个</option>
            </select>
          </label>
        </div>

        {classicLoadWarning ? (
          <p className="libraryMessage libraryMessageWarning" role="status">
            {classicLoadWarning}
          </p>
        ) : null}

        {loadError ? (
          <p className="libraryMessage" role="alert">
            {loadError}
          </p>
        ) : visibleNames.length ? (
          <div className="nameResultGrid">
            {visibleNames.map((name) => (
              <article className="nameResultCard" key={name.id}>
                <header>
                  <div>
                    <p>{name.pinyin}</p>
                    <h3>{name.fullName}</h3>
                  </div>
                  <strong aria-label={`综合评分 ${name.score} 分`}>
                    {name.score}
                    <small>综合分</small>
                  </strong>
                </header>

                <p className="nameToneLine">
                  声调 {name.tones.join(' - ')} · 音律 {name.scoreBreakdown.phonetic}
                </p>
                <div className="nameCharacterMeanings">
                  {name.characters.map((character) => (
                    <div key={character.char}>
                      <strong>{character.char}</strong>
                      <span>
                        {Array.isArray(character.element)
                          ? character.element.join(' / ')
                          : character.element}
                      </span>
                      <p>{character.meaning}</p>
                    </div>
                  ))}
                </div>
                <p
                  className={`nameClassicReference${name.classic ? ' hasSource' : ''}`}
                >
                  <strong>
                    {name.classic
                      ? `${name.classic.level === 'C' ? '意象化用' : '原文取名'} · ${name.classic.level ?? 'A'}级`
                      : '典籍关联'}
                  </strong>
                  {name.classic ? (
                    <>
                      <span>{name.classic.display}</span>
                      <q>{name.classic.text}</q>
                    </>
                  ) : (
                    <span>当前语料未发现可核对关联，不附会出处。</span>
                  )}
                </p>
                <div className="nameScoreSummary" aria-label="主要评分构成">
                  <span>五行 {name.scoreBreakdown.element}</span>
                  <span>字义 {name.scoreBreakdown.meaning}</span>
                  <span>谐音 {name.scoreBreakdown.homophone}</span>
                </div>
                <p className="nameRecommendation">{name.recommendation}</p>
                <footer>
                  <div className="nameStyleTags">
                    {name.styleTags.slice(0, 3).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className="nameCardActions">
                    <button
                      aria-pressed={state.favorites.some(
                        ({ name: favorite }) => favorite.id === name.id,
                      )}
                      className="favoriteButton"
                      onClick={() =>
                        dispatch({
                          type: 'TOGGLE_FAVORITE',
                          payload: createFavoriteNameRecord(name),
                        })
                      }
                      type="button"
                    >
                      {state.favorites.some(
                        ({ name: favorite }) => favorite.id === name.id,
                      )
                        ? '已收藏'
                        : '收藏'}
                    </button>
                    <Link className="textLink" to={`/names/${name.id}`}>
                      查看评分解释 →
                    </Link>
                  </div>
                </footer>
              </article>
            ))}
          </div>
        ) : isLoading ? (
          <p className="libraryMessage">正在读取本地字库与读音索引…</p>
        ) : (
          <p className="libraryMessage">
            至少需要两个符合条件的汉字和有效姓氏，请放宽筛选或返回首页补充姓氏。
          </p>
        )}

        {generatedNames.length > visibleNames.length ? (
          <p className="libraryFootnote">
            当前展示前 {visibleNames.length} 名；切换排序方式可比较同一批候选。
          </p>
        ) : null}
      </section>

      <div className="namesLayout">
        <section className="characterLibraryPanel" aria-busy={isLoading}>
          <div className="libraryHeading">
            <div>
              <p className="eyebrow">候选汉字</p>
              <h2>精选静态字库</h2>
            </div>
            <p aria-live="polite">
              {isLoading
                ? '正在加载…'
                : loadError
                  ? '加载失败'
                  : `${filteredCharacters.length} / ${characters.length} 字`}
            </p>
          </div>

          {loadError ? (
            <p className="libraryMessage" role="alert">
              {loadError}
            </p>
          ) : visibleCharacters.length ? (
            <div className="characterGrid">
              {visibleCharacters.map((character) => (
                <article className="characterCard" key={character.char}>
                  <strong>{character.char}</strong>
                  <div>
                    <span>{character.pinyin}</span>
                    <em>
                      {Array.isArray(character.element)
                        ? character.element.join(' / ')
                        : character.element}
                    </em>
                  </div>
                  <p>{character.meaning}</p>
                  <footer>
                    {character.styleTags.slice(0, 2).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </footer>
                </article>
              ))}
            </div>
          ) : isLoading ? (
            <p className="libraryMessage">正在读取本地汉字数据…</p>
          ) : (
            <p className="libraryMessage">
              当前条件没有匹配字符，请放宽五行、风格或生僻度条件。
            </p>
          )}

          {filteredCharacters.length > visibleCharacters.length ? (
            <p className="libraryFootnote">
              当前预览前 {visibleCharacters.length} 字；上方姓名生成会从完整筛选结果中分阶段选取候选并进行确定性组合。
            </p>
          ) : null}
        </section>

        <aside className="scoreLegend">
          <p className="eyebrow">评分说明</p>
          <h2>综合分不是吉凶分</h2>
          <p>
            分数只用于比较候选与当前条件的匹配程度。文化出处区分 A 级原文连续、B 级同句同序和人工登记的 C 级同篇意象；无可核对关联则为 0 分。
          </p>
          <ul>
            {NAMING_SCORE_DIMENSIONS.map((dimension) => (
              <li key={dimension.key}>
                <span>{dimension.label}</span>
                <strong>
                  {dimension.weight}%
                </strong>
              </li>
            ))}
          </ul>
          <a
            className="textLink"
            href="https://github.com/cicbyte/ai-chinese-naming"
            rel="noreferrer"
            target="_blank"
          >
            查看字典来源与许可 →
          </a>
        </aside>
      </div>

      <PhaseNotice
        eyebrow="Phase 9 已完成"
        title="候选姓名可以收藏到当前浏览器"
        description="收藏姓名、最近浏览和最近起名会话均使用版本化本地数据保存；不需要登录，也不会上传出生信息。"
      />

      <div className="pageActions">
        <Link className="secondaryButton" to="/analysis">
          返回八字分析
        </Link>
      </div>
    </div>
  );
}
