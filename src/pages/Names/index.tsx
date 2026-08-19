import { Link } from 'react-router-dom';
import { PageIntro } from '../../components/PageIntro';
import { PhaseNotice } from '../../components/PhaseNotice';

const scoreDimensions = ['五行适配', '字义', '音律', '文化出处'];

export function NamesPage() {
  return (
    <div className="pageWidth innerPage">
      <PageIntro
        eyebrow="姓名推荐"
        title="每一个推荐，都说明为什么"
        description="候选姓名将按五行适配、字义、音律、文化出处、谐音、字形与生僻度综合排序。"
        aside={<span className="phaseTag">页面骨架</span>}
      />

      <section className="filterBar" aria-label="推荐结果筛选骨架">
        <span>风格筛选</span>
        {['全部', '儒雅', '温润', '清朗', '典雅'].map((tag, index) => (
          <button className={index === 0 ? 'isSelected' : ''} disabled key={tag}>
            {tag}
          </button>
        ))}
      </section>

      <div className="namesLayout">
        <div className="namePreviewList" aria-hidden="true">
          {[1, 2, 3].map((item) => (
            <article className="namePreviewCard" key={item}>
              <div className="skeleton skeleton--title" />
              <div className="skeleton skeleton--score" />
              <div className="previewDivider" />
              <div className="skeleton skeleton--line" />
              <div className="skeleton skeleton--line skeleton--short" />
              <div className="tagSkeletons">
                <i />
                <i />
                <i />
              </div>
            </article>
          ))}
        </div>

        <aside className="scoreLegend">
          <p className="eyebrow">评分构成</p>
          <h2>综合分不是吉凶分</h2>
          <p>
            它只用于衡量候选名字与当前筛选条件的匹配程度，并帮助排序。
          </p>
          <ul>
            {scoreDimensions.map((dimension, index) => (
              <li key={dimension}>
                <span>{dimension}</span>
                <strong>{[30, 20, 15, 15][index]}%</strong>
              </li>
            ))}
            <li>
              <span>其他维度</span>
              <strong>20%</strong>
            </li>
          </ul>
          <Link className="textLink" to="/names/preview">
            查看详情页骨架 →
          </Link>
        </aside>
      </div>

      <PhaseNotice
        eyebrow="Phase 5—7"
        title="候选姓名尚未生成"
        description="汉字库、姓名组合、音律与谐音评分接入后，这里将展示至少 20 个可排序、可解释的候选姓名。"
      />
    </div>
  );
}
