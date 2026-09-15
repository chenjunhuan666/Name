import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageIntro } from '../../components/PageIntro';
import { PhaseNotice } from '../../components/PhaseNotice';
import { NAMING_SCORE_DIMENSIONS } from '../../config/namingScore';
import { useNaming } from '../../store/useNaming';

export function NameDetailPage() {
  const { nameId } = useParams();
  const { state, dispatch } = useNaming();
  const name =
    state.generatedNames.find(({ id }) => id === nameId) ??
    state.favorites.find(({ name: favorite }) => favorite.id === nameId)
      ?.name ??
    state.recentViews.find(({ name: recent }) => recent.id === nameId)?.name;
  const isFavorite = state.favorites.some(
    ({ name: favorite }) => favorite.id === nameId,
  );

  useEffect(() => {
    if (name) {
      dispatch({
        type: 'RECORD_NAME_VIEW',
        payload: { name, viewedAt: new Date().toISOString() },
      });
    }
  }, [dispatch, name]);

  if (!name) {
    return (
      <div className="pageWidth innerPage">
        <PageIntro
          eyebrow="姓名详情"
          title="当前浏览器中未找到这个姓名"
          description="该姓名既不在当前候选中，也未保存在收藏或最近浏览记录里。"
          aside={<span className="phaseTag">结果已失效</span>}
        />
        <PhaseNotice
          eyebrow="本地数据"
          title="请返回推荐页重新生成"
          description="这不是网络错误。返回推荐页后，会根据最近一次起名信息重新生成候选姓名。"
        />
        <div className="pageActions">
          <Link className="secondaryButton" to="/names">
            返回姓名推荐
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pageWidth innerPage">
      <PageIntro
        eyebrow="姓名详情"
        title={name.fullName}
        description={`${name.pinyin} · 声调 ${name.tones.join(' - ')}。以下分数只解释当前筛选条件下的排序依据，不代表命运或吉凶。`}
        aside={<span className="phaseTag">Phase 9 可本地收藏</span>}
      />

      <section className="detailHero contentCard">
        <div className="detailName" aria-label={name.fullName}>
          {[...name.fullName].map((character, index) => (
            <span key={`${character}-${index}`}>{character}</span>
          ))}
        </div>
        <div>
          <p className="eyebrow">综合推荐分</p>
          <strong>{name.score}</strong>
          <p>当前八项维度加权结果</p>
          <button
            aria-pressed={isFavorite}
            className="favoriteButton favoriteButton--detail"
            onClick={() =>
              dispatch({
                type: 'TOGGLE_FAVORITE',
                payload: {
                  name,
                  savedAt: new Date().toISOString(),
                },
              })
            }
            type="button"
          >
            {isFavorite ? '取消收藏' : '收藏这个姓名'}
          </button>
        </div>
      </section>

      <section className="nameCharacterDetails" aria-label="单字解释">
        {name.characters.map((character) => (
          <article className="contentCard" key={character.char}>
            <header>
              <strong>{character.char}</strong>
              <div>
                <h2>{character.pinyin}</h2>
                <p>第 {character.tone} 声</p>
              </div>
            </header>
            <p>{character.meaning}</p>
            <dl>
              <div>
                <dt>五行</dt>
                <dd>
                  {Array.isArray(character.element)
                    ? character.element.join(' / ')
                    : character.element}
                </dd>
              </div>
              <div>
                <dt>部首</dt>
                <dd>{character.radical ?? '未收录'}</dd>
              </div>
              <div>
                <dt>笔画</dt>
                <dd>{character.strokes ?? '未收录'}</dd>
              </div>
              <div>
                <dt>生僻度</dt>
                <dd>{character.rarity}</dd>
              </div>
            </dl>
            <footer>{character.styleTags.join(' · ')}</footer>
          </article>
        ))}
      </section>

      <section className="detailGrid">
        <article className="contentCard detailCard">
          <span className="detailCard__number">01</span>
          <h2>音韵结构</h2>
          <p>{name.pinyin}</p>
          <dl className="phoneticDetails">
            <div>
              <dt>声调</dt>
              <dd>{name.tones.join(' - ')}</dd>
            </div>
            <div>
              <dt>声母</dt>
              <dd>
                {name.phoneticAssessment.initials
                  .map((value) => value || '零声母')
                  .join(' · ')}
              </dd>
            </div>
            <div>
              <dt>韵母</dt>
              <dd>{name.phoneticAssessment.finals.join(' · ')}</dd>
            </div>
          </dl>
          <p>{name.phoneticAssessment.notes.join('')}</p>
        </article>

        <article className="contentCard detailCard">
          <span className="detailCard__number">02</span>
          <h2>普通话谐音检查</h2>
          <strong className="safeResult">
            {name.homophoneAssessment.matches.length
              ? '存在近音提示'
              : '分层检查通过'}
          </strong>
          <p>{name.scoreExplanations.homophone}</p>
          <p className="modelDisclaimer">
            当前覆盖完整姓名、名字两字、姓与首字的精确匹配，并对部分普通话近音和网络负面词作提示；不覆盖方言或全部人工联想。
          </p>
        </article>
      </section>

      <section className="scoreBreakdownPanel contentCard">
        <div className="libraryHeading">
          <div>
            <p className="eyebrow">评分构成</p>
            <h2>每一分都有当前规则依据</h2>
          </div>
          <p>综合分 {name.score}</p>
        </div>
        <div className="scoreBreakdownList">
          {NAMING_SCORE_DIMENSIONS.map((dimension) => {
            const dimensionScore =
              name.scoreBreakdown[dimension.key] ??
              (dimension.key === 'modern' ? 80 : 0);

            return (
              <article key={dimension.key}>
                <div>
                  <strong>{dimension.label}</strong>
                  <span>
                    权重 {dimension.weight}% · {dimensionScore} 分
                  </span>
                </div>
                <div className="scoreBar" aria-hidden="true">
                  <i style={{ width: `${dimensionScore}%` }} />
                </div>
                <p>
                  {name.scoreExplanations[dimension.key] ??
                    '旧版收藏记录未包含该维度，展示中性基准分。'}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="classicReferencePanel contentCard">
        <p className="eyebrow">
          {name.classic
            ? `${name.classic.level === 'C' ? '意象化用' : '原文取名'} · ${name.classic.level ?? 'A'}级`
            : '国学出处'}
        </p>
        {name.classic ? (
          <>
            <h2>{name.classic.display}</h2>
            <p className="classicReferenceMeta">
              {name.classic.author ? `作者：${name.classic.author}` : '作者未详'}
            </p>
            <blockquote>{name.classic.text}</blockquote>
            <p>{name.scoreExplanations.classic}</p>
          </>
        ) : (
          <>
            <h2>未发现可核对典籍关联</h2>
            <p>
              当前语料中未发现 A/B 级原文关联或经人工登记的 C 级意象关联，因此不生成篇名、作者或原文。
            </p>
          </>
        )}
      </section>

      <PhaseNotice
        eyebrow="Phase 9 已完成"
        title="当前详情已加入最近浏览"
        description="收藏和最近浏览只保存在当前浏览器；刷新页面后仍可从“本地记录”重新打开，不会上传到服务器。"
      />

      <div className="pageActions">
        <Link className="secondaryButton" to="/names">
          返回姓名推荐
        </Link>
      </div>
    </div>
  );
}
