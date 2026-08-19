import { useId } from 'react';
import { Link } from 'react-router-dom';
import { useNaming } from '../../store/useNaming';
import type { Gender, InputMode } from '../../types';

const processSteps = [
  ['一', '录入信息', '出生信息或已知四柱'],
  ['二', '分析结构', '日主、月令与五行分布'],
  ['三', '筛选汉字', '音形义与文化出处'],
  ['四', '获得名字', '查看可解释的评分构成'],
] as const;

const baziFields = ['年柱', '月柱', '日柱', '时柱'];

export function HomePage() {
  const { state, dispatch } = useNaming();
  const surnameId = useId();

  const setInputMode = (inputMode: InputMode) => {
    dispatch({ type: 'SET_INPUT_MODE', payload: inputMode });
  };

  const setGender = (gender: Gender) => {
    dispatch({ type: 'SET_GENDER', payload: gender });
  };

  return (
    <>
      <section className="hero pageWidth">
        <div className="heroCopy">
          <p className="eyebrow">传统有据 · 判断有理 · 推荐有解</p>
          <h1>
            从一纸生辰，
            <span>寻一个有根的名字</span>
          </h1>
          <p className="heroLead">
            以天干地支、五行结构、汉字音形义与中华典籍为依据，提供透明、克制、可追溯的姓名推荐。
          </p>
          <div className="heroTrust">
            <span>确定性规则</span>
            <span>不上传出生数据</span>
            <span>不以缺失论吉凶</span>
          </div>
        </div>

        <div className="namingPanel" aria-labelledby="naming-panel-title">
          <div className="panelHeading">
            <div>
              <p className="eyebrow">起名信息</p>
              <h2 id="naming-panel-title">为宝宝寻名</h2>
            </div>
            <span className="phaseTag">Phase 1 骨架</span>
          </div>

          <div className="modeTabs" role="group" aria-label="起名方式">
            <button
              aria-pressed={state.inputMode === 'birth'}
              className={state.inputMode === 'birth' ? 'modeTab isActive' : 'modeTab'}
              onClick={() => setInputMode('birth')}
              type="button"
            >
              <span>生</span>
              通过出生信息
            </button>
            <button
              aria-pressed={state.inputMode === 'bazi'}
              className={state.inputMode === 'bazi' ? 'modeTab isActive' : 'modeTab'}
              onClick={() => setInputMode('bazi')}
              type="button"
            >
              <span>字</span>
              已知八字录入
            </button>
          </div>

          <div className="baseFields">
            <label className="formField" htmlFor={surnameId}>
              <span>姓氏</span>
              <input
                id={surnameId}
                maxLength={2}
                onChange={(event) =>
                  dispatch({ type: 'SET_SURNAME', payload: event.target.value })
                }
                placeholder="如：陈"
                value={state.surname}
              />
            </label>

            <fieldset className="formField genderField">
              <legend>性别</legend>
              <div className="segmentedControl">
                <button
                  aria-pressed={state.gender === 'male'}
                  className={state.gender === 'male' ? 'isSelected' : ''}
                  onClick={() => setGender('male')}
                  type="button"
                >
                  男宝
                </button>
                <button
                  aria-pressed={state.gender === 'female'}
                  className={state.gender === 'female' ? 'isSelected' : ''}
                  onClick={() => setGender('female')}
                  type="button"
                >
                  女宝
                </button>
              </div>
            </fieldset>
          </div>

          {state.inputMode === 'birth' ? (
            <div className="modeBody">
              <div className="fieldRow">
                <label className="formField">
                  <span>历法</span>
                  <select defaultValue="lunar" disabled>
                    <option value="lunar">农历</option>
                  </select>
                </label>
                <label className="formField formField--wide">
                  <span>出生日期</span>
                  <input disabled placeholder="Phase 8 接入农历日期选择" />
                </label>
              </div>
              <div className="fieldRow">
                <label className="formField">
                  <span>出生时间</span>
                  <input disabled placeholder="时 : 分" />
                </label>
                <label className="formField formField--wide">
                  <span>出生地点（可选）</span>
                  <input disabled placeholder="用于后续真太阳时扩展" />
                </label>
              </div>
              <button className="primaryButton" disabled type="button">
                自动排盘将在 Phase 8 开放
              </button>
            </div>
          ) : (
            <div className="modeBody">
              <div className="baziInputGrid">
                {baziFields.map((field) => (
                  <label className="formField" key={field}>
                    <span>{field}</span>
                    <select defaultValue="" disabled>
                      <option value="">六十甲子</option>
                    </select>
                  </label>
                ))}
              </div>
              <button className="primaryButton" disabled type="button">
                四柱选择将在 Phase 2 开放
              </button>
            </div>
          )}

          <p className="panelFootnote">
            当前已完成输入模式、姓氏和性别的全局状态；业务提交在对应算法阶段开放。
          </p>
        </div>
      </section>

      <section className="principleStrip">
        <div className="pageWidth principleGrid">
          <div>
            <span className="principleNumber">01</span>
            <strong>规则确定</strong>
            <p>干支、节气与五行判断由本地规则完成。</p>
          </div>
          <div>
            <span className="principleNumber">02</span>
            <strong>解释透明</strong>
            <p>综合分用于排序，每个维度均可查看依据。</p>
          </div>
          <div>
            <span className="principleNumber">03</span>
            <strong>文化真实</strong>
            <p>有真实关联才展示典籍出处，不牵强附会。</p>
          </div>
        </div>
      </section>

      <section className="processSection pageWidth">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">起名脉络</p>
            <h2>从生辰到姓名，四步有迹可循</h2>
          </div>
          <Link className="textLink" to="/analysis">
            查看分析页骨架 →
          </Link>
        </div>
        <div className="processGrid">
          {processSteps.map(([number, title, description]) => (
            <article className="processCard" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
