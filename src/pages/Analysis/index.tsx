import { Link } from 'react-router-dom';
import { PageIntro } from '../../components/PageIntro';
import { PhaseNotice } from '../../components/PhaseNotice';
import { FIVE_ELEMENTS } from '../../data/fiveElements';
import { formatPillar } from '../../core/bazi/ganzhi';
import { formatLunarDate } from '../../core/calendar/calendarEngine';
import { useNaming } from '../../store/useNaming';
import type { PillarKey } from '../../types';

const pillars: { key: PillarKey; label: string }[] = [
  { key: 'year', label: '年柱' },
  { key: 'month', label: '月柱' },
  { key: 'day', label: '日柱' },
  { key: 'hour', label: '时柱' },
];
export function AnalysisPage() {
  const { state, dispatch } = useNaming();
  const { analysis, bazi, birthInfo, calendarResult } = state;
  const strengthBreakdown = analysis?.strengthBreakdown;
  const namingTendencies = analysis?.namingTendencies ?? [];
  const maximumElementCount = analysis
    ? Math.max(
        ...Object.values(analysis.surfaceElements),
        ...Object.values(analysis.hiddenElements),
        1,
      )
    : 1;

  const getBarWidth = (count: number) =>
    `${Math.round((count / maximumElementCount) * 100)}%`;

  return (
    <div className="pageWidth innerPage">
      <PageIntro
        eyebrow="八字分析"
        title="看见结构，而非只看缺失"
        description="四柱、日主、月令、表层五行与藏干五行将在这里形成一份可核对的结构化分析。"
        aside={
          <span className="phaseTag">
            {calendarResult
              ? 'Phase 8 自动排盘'
              : analysis?.strength
                ? '手动四柱分析'
              : analysis
                ? 'Phase 3 基础分析'
              : bazi
                ? 'Phase 2 四柱确认'
                : '等待四柱录入'}
          </span>
        }
      />

      {calendarResult ? (
        <section className="contentCard calendarEvidenceCard">
          <div className="cardTitleRow">
            <div>
              <p className="eyebrow">自动排盘依据</p>
              <h2>从农历输入到四柱结果</h2>
            </div>
            <span className="calculationBadge">中国标准时间</span>
          </div>
          <dl className="calendarEvidenceGrid">
            <div>
              <dt>农历输入</dt>
              <dd>{formatLunarDate(calendarResult.lunarDate)}</dd>
            </div>
            <div>
              <dt>转换公历</dt>
              <dd>{calendarResult.solarDateText}</dd>
            </div>
            <div>
              <dt>节气区间</dt>
              <dd>
                {calendarResult.solarTerm && calendarResult.nextSolarTerm
                  ? `${calendarResult.solarTerm.name} ${calendarResult.solarTerm.occurredAt} → ${calendarResult.nextSolarTerm.name} ${calendarResult.nextSolarTerm.occurredAt}`
                  : '未取得节气区间'}
              </dd>
            </div>
            <div>
              <dt>出生时辰</dt>
              <dd>{calendarResult.hourLabel}</dd>
            </div>
            <div>
              <dt>出生地点</dt>
              <dd>{birthInfo?.location ?? '未填写'}</dd>
            </div>
            <div>
              <dt>真太阳时</dt>
              <dd>关闭，地点不参与计算</dd>
            </div>
          </dl>
          <ul className="calculationNotes">
            {calendarResult.calculationNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="contentCard pillarsCard">
        <div className="cardTitleRow">
          <div>
            <p className="eyebrow">四柱排盘</p>
            <h2>您的四柱八字</h2>
          </div>
          <Link
            className="quietButton"
            onClick={() => dispatch({ type: 'SET_INPUT_MODE', payload: 'bazi' })}
            to="/"
          >
            手动修改八字
          </Link>
        </div>
        <div className="pillarGrid">
          {pillars.map(({ key, label }) => {
            const pillar = bazi?.[key];
            const detail = analysis?.pillars[key];

            return (
              <div className="pillar" key={key}>
                <span>{label}</span>
                <strong>{pillar?.stem ?? '—'}</strong>
                <strong>{pillar?.branch ?? '—'}</strong>
                <small>{pillar ? formatPillar(pillar) : '等待录入'}</small>
                {detail ? (
                  <div className="pillarMeta">
                    <span>
                      天干：{detail.stemElement} · {detail.stemYinYang}
                    </span>
                    <span>
                      地支：{detail.branchElement} · {detail.branchYinYang}
                    </span>
                    <span>
                      藏干：
                      {detail.hiddenStems
                        .map(({ stem, element }) => `${stem}${element}`)
                        .join(' · ')}
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {bazi ? (
        <section className="baziConfirmation">
          <div>
            <p className="eyebrow">八字确认</p>
            <h2>
              {state.surname}宝宝的
              {calendarResult ? '自动排盘结果待确认' : '四柱已生成'}
            </h2>
            <p>
              请先核对四柱。不同流派在节气交接、子初换日或真太阳时上可能存在差异，后续可随时返回手动修正。
            </p>
          </div>
          {analysis?.strength ? (
            <Link
              className="primaryButton primaryButton--link confirmationButton"
              to="/names"
            >
              确认无误，进入起名
            </Link>
          ) : (
            <button
              className="primaryButton confirmationButton"
              disabled
              type="button"
            >
              起名方向将在 Phase 4 开放
            </button>
          )}
        </section>
      ) : null}

      <div className="analysisGrid">
        <section className="contentCard">
          <p className="eyebrow">基础信息</p>
          <h2>日主与月令</h2>
          <dl className="definitionList">
            <div>
              <dt>日主</dt>
              <dd>
                {analysis
                  ? `${analysis.dayMaster.stem}${analysis.dayMaster.element}（${analysis.dayMaster.yinYang}）`
                  : '待分析'}
              </dd>
            </div>
            <div>
              <dt>月令</dt>
              <dd>
                {analysis
                  ? `${analysis.monthCommand}（${analysis.pillars.month.branchElement}）`
                  : '待分析'}
              </dd>
            </div>
            <div>
              <dt>基础旺衰</dt>
              <dd className={analysis?.strength ? 'isReady' : undefined}>
                {analysis?.strength && strengthBreakdown
                  ? `${analysis.strength}（支持比例 ${strengthBreakdown.supportRatio}%）`
                  : analysis
                    ? 'Phase 4 待判断'
                    : '待分析'}
              </dd>
            </div>
          </dl>
          {analysis?.strengthReason ? (
            <p className="strengthReason">{analysis.strengthReason}</p>
          ) : null}
        </section>

        <section className="contentCard">
          <p className="eyebrow">五行分布</p>
          <h2>表层与藏干</h2>
          <div className="elementLegend" aria-label="五行统计图例">
            <span>表层：四柱天干与地支</span>
            <span>藏干：四个地支所含天干</span>
          </div>
          <div className="elementBars">
            {FIVE_ELEMENTS.map((element) => {
              const surfaceCount = analysis?.surfaceElements[element] ?? 0;
              const hiddenCount = analysis?.hiddenElements[element] ?? 0;

              return (
                <div className="elementBar" key={element}>
                  <strong>{element}</strong>
                  <div className="elementTracks">
                    <span>
                      <small>表层</small>
                      <i aria-hidden="true">
                        <b style={{ width: getBarWidth(surfaceCount) }} />
                      </i>
                      <em>{analysis ? surfaceCount : '—'}</em>
                    </span>
                    <span>
                      <small>藏干</small>
                      <i aria-hidden="true">
                        <b style={{ width: getBarWidth(hiddenCount) }} />
                      </i>
                      <em>{analysis ? hiddenCount : '—'}</em>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="elementFootnote">
            图表保留原始次数用于核对；旺衰模型另按表层每项 1、藏干每项
            0.5，并为月令主五行额外增加 1.5 权重。
          </p>
        </section>
      </div>

      {analysis?.strength && strengthBreakdown ? (
        <section className="contentCard tendencyCard">
          <div className="cardTitleRow">
            <div>
              <p className="eyebrow">起名五行倾向</p>
              <h2>按关系与结构排序</h2>
            </div>
            <span className="strengthBadge">日主{analysis.strength}</span>
          </div>
          <div className="tendencyList">
            {namingTendencies.map(
              ({ element, level, reason, relation, weightedPresence }) => (
                <article className="tendencyItem" key={element}>
                  <div className="tendencyHeading">
                    <strong>{element}</strong>
                    <span
                      aria-label={`${element}元素推荐 ${level} 星（满分 5 星）`}
                      className="tendencyStars"
                    >
                      <b aria-hidden="true">{'★'.repeat(level)}</b>
                      <i aria-hidden="true">{'★'.repeat(5 - level)}</i>
                    </span>
                    <em>{level} / 5</em>
                  </div>
                  <div className="tendencyMeta">
                    <span>{relation}</span>
                    <span>加权值 {weightedPresence}</span>
                  </div>
                  <p>{reason}</p>
                </article>
              ),
            )}
          </div>
          <p className="modelDisclaimer">
            这是用于 V1 姓名筛选的透明启发式结果，不等同于完整命理定论；五行缺失不会被直接判定为必须补入姓名。
          </p>
        </section>
      ) : null}

      <PhaseNotice
        eyebrow={analysis?.strength ? 'Phase 9 已完成' : analysis ? 'Phase 4' : bazi ? 'Phase 3' : 'Phase 2'}
        title={
          analysis?.strength
            ? 'V1 起名与本地记录闭环已完成'
            : analysis
              ? '基础结构已解析，等待旺衰判断'
            : bazi
              ? '四柱合法，等待五行解析'
              : '请先录入已知八字'
        }
        description={
          analysis?.strength
            ? '农历自动排盘和手动四柱已进入同一套分析与起名流程；收藏姓名、最近浏览和最近起名会话会保存在当前浏览器。'
            : analysis
              ? '日主、月令、阴阳、表层五行与藏干五行已经由本地确定性规则生成；下一阶段将加入五行生克、月令影响与基础旺衰。'
            : bazi
              ? '当前页面已经读取统一 Bazi 对象；完成基础分析后将展示天干地支、藏干、日主与五行统计。'
              : '返回起名首页，切换到“已知八字录入”，从六十甲子选择器中完成四柱后即可生成标准 Bazi 对象。'
        }
      />

      <div className="pageActions">
        <Link
          className="secondaryButton"
          onClick={() => dispatch({ type: 'SET_INPUT_MODE', payload: 'bazi' })}
          to="/"
        >
          {bazi ? '修改四柱' : '录入四柱'}
        </Link>
        <Link className="primaryButton primaryButton--link" to="/names">
          进入汉字筛选
        </Link>
      </div>
    </div>
  );
}
