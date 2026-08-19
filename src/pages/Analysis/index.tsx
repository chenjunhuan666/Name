import { Link } from 'react-router-dom';
import { PageIntro } from '../../components/PageIntro';
import { PhaseNotice } from '../../components/PhaseNotice';

const pillars = ['年柱', '月柱', '日柱', '时柱'];
const elements = ['木', '火', '土', '金', '水'];

export function AnalysisPage() {
  return (
    <div className="pageWidth innerPage">
      <PageIntro
        eyebrow="八字分析"
        title="看见结构，而非只看缺失"
        description="四柱、日主、月令、表层五行与藏干五行将在这里形成一份可核对的结构化分析。"
        aside={<span className="phaseTag">页面骨架</span>}
      />

      <section className="contentCard pillarsCard">
        <div className="cardTitleRow">
          <div>
            <p className="eyebrow">四柱排盘</p>
            <h2>您的四柱八字</h2>
          </div>
          <button className="quietButton" disabled type="button">
            手动修改八字
          </button>
        </div>
        <div className="pillarGrid">
          {pillars.map((pillar) => (
            <div className="pillar" key={pillar}>
              <span>{pillar}</span>
              <strong>—</strong>
              <strong>—</strong>
              <small>等待录入</small>
            </div>
          ))}
        </div>
      </section>

      <div className="analysisGrid">
        <section className="contentCard">
          <p className="eyebrow">基础信息</p>
          <h2>日主与月令</h2>
          <dl className="definitionList">
            <div>
              <dt>日主</dt>
              <dd>待分析</dd>
            </div>
            <div>
              <dt>月令</dt>
              <dd>待分析</dd>
            </div>
            <div>
              <dt>基础旺衰</dt>
              <dd>待分析</dd>
            </div>
          </dl>
        </section>

        <section className="contentCard">
          <p className="eyebrow">五行分布</p>
          <h2>表层与藏干</h2>
          <div className="elementBars">
            {elements.map((element) => (
              <div className="elementBar" key={element}>
                <span>{element}</span>
                <i aria-hidden="true" />
                <small>—</small>
              </div>
            ))}
          </div>
        </section>
      </div>

      <PhaseNotice
        eyebrow="Phase 2—4"
        title="分析逻辑尚未接入"
        description="下一阶段将先完成合法六十甲子录入，再以统一 Bazi 对象接入天干地支、藏干、五行与基础旺衰分析。"
      />

      <div className="pageActions">
        <Link className="secondaryButton" to="/">
          返回起名首页
        </Link>
        <Link className="primaryButton primaryButton--link" to="/names">
          查看推荐页骨架
        </Link>
      </div>
    </div>
  );
}
