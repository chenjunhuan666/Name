import { Link, useParams } from 'react-router-dom';
import { PageIntro } from '../../components/PageIntro';
import { PhaseNotice } from '../../components/PhaseNotice';

const detailSections = [
  ['五行适配', '结合日主、月令、藏干与生克关系解释'],
  ['字义字形', '展示单字含义、结构、部首与生僻度'],
  ['音韵谐音', '展示拼音、声调、声母、韵母与风险检查'],
  ['典籍出处', '仅在有真实语料关联时展示原文来源'],
];

export function NameDetailPage() {
  const { nameId } = useParams();

  return (
    <div className="pageWidth innerPage">
      <PageIntro
        eyebrow="姓名详情"
        title="姓名解释页"
        description={`当前详情标识：${nameId ?? '未指定'}。真实姓名内容将在生成模块接入后由结果数据驱动。`}
        aside={<span className="phaseTag">页面骨架</span>}
      />

      <section className="detailHero contentCard">
        <div className="detailName" aria-hidden="true">
          <span>姓</span>
          <span>名</span>
          <span>字</span>
        </div>
        <div>
          <p className="eyebrow">综合推荐分</p>
          <strong className="emptyScore">—</strong>
          <p>待姓名生成与评分模块接入</p>
        </div>
      </section>

      <section className="detailGrid">
        {detailSections.map(([title, description], index) => (
          <article className="contentCard detailCard" key={title}>
            <span className="detailCard__number">0{index + 1}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>

      <PhaseNotice
        eyebrow="Phase 6"
        title="详情数据尚未接入"
        description="详情页的数据契约已经由 GeneratedName、NameScoreBreakdown 与 ClassicReference 类型统一约束。"
      />

      <div className="pageActions">
        <Link className="secondaryButton" to="/names">
          返回姓名推荐
        </Link>
      </div>
    </div>
  );
}
