import { Link } from 'react-router-dom';
import { ExplanationPanel } from '../../components/ExplanationPanel';
import { PageIntro } from '../../components/PageIntro';
import { PhaseNotice } from '../../components/PhaseNotice';
import { FEATURES } from '../../config/featureFlags';
import { createBaziExplanationBundle } from '../../core/explanation';
import { explainTenGodOccurrence } from '../../core/bazi/tenGods';
import { FIVE_ELEMENTS } from '../../data/fiveElements';
import { findBaziRule } from '../../data/baziRules';
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
const hiddenRoleLabels = {
  main: '主气',
  middle: '中气',
  residual: '余气',
} as const;

export function AnalysisPage() {
  const { state, dispatch } = useNaming();
  const { analysis, bazi, birthInfo, calendarResult } = state;
  const strengthBreakdown = analysis?.strengthBreakdown;
  const namingTendencies = analysis?.namingTendencies ?? [];
  const advancedExplanations =
    FEATURES.advancedExplanation && analysis
      ? (analysis.explanations ?? createBaziExplanationBundle(analysis))
      : undefined;
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
                  ? `${analysis.strength}（支持证据 ${strengthBreakdown.supportScore} / 制约证据 ${strengthBreakdown.weakenScore}）`
                  : analysis
                    ? 'Phase 4 待判断'
                    : '待分析'}
              </dd>
            </div>
            <div>
              <dt>基础调候</dt>
              <dd className={analysis?.tiaohou ? 'isReady' : undefined}>
                {analysis?.tiaohou
                  ? `${analysis.tiaohou.climate}${analysis.tiaohou.favoredElements.length ? ` · 调节方向 ${analysis.tiaohou.favoredElements.join('、')}` : ' · 无额外调节'}`
                  : '待分析'}
              </dd>
            </div>
          </dl>
          {analysis?.strengthReason ? (
            <p className="strengthReason">{analysis.strengthReason}</p>
          ) : null}
          {analysis?.tiaohou ? (
            <p className="strengthReason">{analysis.tiaohou.reason}</p>
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
            图表只保留原始次数用于核对；V2 旺衰由月令、季节、通根、透干、生扶与克泄耗证据综合判定。
          </p>
        </section>
      </div>

      {advancedExplanations ? (
        <ExplanationPanel
          bundle={advancedExplanations}
          description="普通解释聚焦起名方向，专业解释展开日主、月令、藏干、旺衰、调候、十神、干支关系及规则来源。"
          title="从八字结构到起名方向"
        />
      ) : null}

      {!advancedExplanations && FEATURES.tenGods && analysis?.tenGods?.length ? (
        <details className="contentCard ruleEvidencePanel">
          <summary>
            十神结构
            <span>{analysis.tenGods.length} 项传统关系 · 只读解释</span>
          </summary>
          <div className="ruleEvidenceList">
            {analysis.tenGods.map((occurrence, index) => (
              <article
                key={`${occurrence.pillar}-${occurrence.location}-${occurrence.hiddenRole ?? 'stem'}-${occurrence.stem}-${index}`}
              >
                <header>
                  <strong>
                    {occurrence.tenGod} · {occurrence.stem}
                  </strong>
                  <span>
                    {pillars.find(({ key }) => key === occurrence.pillar)?.label}
                    {occurrence.location === 'stem'
                      ? '天干'
                      : `地支${hiddenRoleLabels[occurrence.hiddenRole ?? 'main']}`}
                  </span>
                </header>
                <p>{explainTenGodOccurrence(occurrence)}</p>
                <ul>
                  {occurrence.ruleIds.map((ruleId) => (
                    <li key={ruleId}>
                      <code>{ruleId}</code>
                      <span>{findBaziRule(ruleId)?.name ?? '规则说明待补充'}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="modelDisclaimer">
            十神只用于解释命局结构，不改变旺衰、起名五行倾向、候选排序或姓名分数。
          </p>
        </details>
      ) : null}

      {!advancedExplanations && analysis?.strength && strengthBreakdown ? (
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
              ({ element, level, reason, relation, evidenceScore }) => (
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
                    <span>结构证据值 {evidenceScore ?? 0}</span>
                  </div>
                  <p>{reason}</p>
                </article>
              ),
            )}
          </div>
          <p className="modelDisclaimer">
            这是用于 V2 起名的可追溯工程模型，不等同于完整命理定论；五行缺失不会被直接判定为必须补入姓名。
          </p>
        </section>
      ) : null}

      {!advancedExplanations && strengthBreakdown?.evidence.length ? (
        <details className="ruleEvidencePanel contentCard">
          <summary>
            规则依据与来源
            <span>{strengthBreakdown.evidence.length} 条结构证据 + 基础调候</span>
          </summary>
          <div className="ruleEvidenceList">
            {analysis?.tiaohou ? (
              <article>
                <header>
                  <strong>{analysis.tiaohou.reason}</strong>
                  <span>起名倾向修正 · {analysis.tiaohou.adjustment} 档</span>
                </header>
                <ul>
                  {analysis.tiaohou.ruleIds.map((ruleId) => {
                    const rule = findBaziRule(ruleId);
                    return (
                      <li key={ruleId}>
                        <code>{ruleId}</code>
                        <span>{rule?.name ?? '规则说明待补充'}</span>
                        {rule?.references[0] ? (
                          <small>{rule.references[0].work}</small>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </article>
            ) : null}
            {strengthBreakdown.evidence.map((evidence, index) => (
              <article key={`${evidence.type}-${evidence.element}-${index}`}>
                <header>
                  <strong>{evidence.reason}</strong>
                  <span>
                    {evidence.effect === 'support'
                      ? '支持'
                      : evidence.effect === 'weaken'
                        ? '制约'
                        : '中性'}{' '}
                    · {evidence.level} / 5
                  </span>
                </header>
                <ul>
                  {evidence.ruleIds.map((ruleId) => {
                    const rule = findBaziRule(ruleId);
                    return (
                      <li key={ruleId}>
                        <code>{ruleId}</code>
                        <span>{rule?.name ?? '规则说明待补充'}</span>
                        {rule?.references[0] ? (
                          <small>
                            {rule.references[0].work}
                            {rule.references[0].chapter
                              ? ` · ${rule.references[0].chapter}`
                              : ''}
                          </small>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </div>
        </details>
      ) : null}

      <PhaseNotice
        eyebrow={
          advancedExplanations
            ? 'V3.5 分层解释'
            : FEATURES.tenGods && analysis?.tenGods
            ? 'V3.1 十神运行时'
            : analysis?.strength
              ? 'V2.1 规则引擎'
              : analysis
                ? 'Phase 4'
                : bazi
                  ? 'Phase 3'
                  : 'Phase 2'
        }
        title={
          advancedExplanations
            ? '普通与专业解释已由核心层统一生成'
            : FEATURES.tenGods && analysis?.tenGods
            ? '十神结构已进入专业解释链路'
            : analysis?.strength
              ? 'V2 旺衰证据已进入起名链路'
            : analysis
              ? '基础结构已解析，等待旺衰判断'
            : bazi
              ? '四柱合法，等待五行解析'
              : '请先录入已知八字'
        }
        description={
          advancedExplanations
            ? '页面只展示结构化解释项；切换模式不会重新计算旺衰、五行倾向或姓名分数，也不会输出性格、人生事件或吉凶判断。'
            : FEATURES.tenGods && analysis?.tenGods
            ? '年、月、时干和四柱藏干已按日主映射十神并关联规则来源；该结果只作结构解释，不改变旺衰、起名倾向或姓名评分。'
            : analysis?.strength
              ? '月令、季节、通根、透干、生扶与克泄耗已转为可追溯证据；基础调候只修正起名五档倾向，不输出唯一喜用神。'
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
