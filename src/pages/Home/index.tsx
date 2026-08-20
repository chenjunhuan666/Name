import { lazy, Suspense, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BaziInput } from '../../components/BaziInput';
import { baziToInputValues } from '../../core/bazi/ganzhi';
import { analyzeBazi } from '../../core/bazi/strengthAnalysis';
import { createNamingHistoryRecord } from '../../core/storage/namingPersistence';
import { validateBaziInput } from '../../core/validators/baziValidator';
import type { BaziInputErrors } from '../../core/validators/baziValidator';
import { useNaming } from '../../store/useNaming';
import type { BirthInfo, Gender, InputMode, PillarKey } from '../../types';

const BirthForm = lazy(() =>
  import('../../components/BirthForm').then((module) => ({
    default: module.BirthForm,
  })),
);

const processSteps = [
  ['一', '录入信息', '出生信息或已知四柱'],
  ['二', '分析结构', '日主、月令与五行分布'],
  ['三', '筛选汉字', '音形义与文化出处'],
  ['四', '获得名字', '查看可解释的评分构成'],
] as const;

export function HomePage() {
  const { state, dispatch } = useNaming();
  const surnameId = useId();
  const navigate = useNavigate();
  const [baziValues, setBaziValues] = useState(() =>
    baziToInputValues(state.bazi),
  );
  const [baziErrors, setBaziErrors] = useState<BaziInputErrors>({});
  const [formMessage, setFormMessage] = useState('');

  const setInputMode = (inputMode: InputMode) => {
    dispatch({ type: 'SET_INPUT_MODE', payload: inputMode });
    setFormMessage('');
  };

  const setGender = (gender: Gender) => {
    dispatch({ type: 'SET_GENDER', payload: gender });
  };

  const updateBaziValue = (key: PillarKey, value: string) => {
    setBaziValues((current) => ({ ...current, [key]: value }));
    setBaziErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[key];
      return nextErrors;
    });
    setFormMessage('');
  };

  const submitKnownBazi = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedSurname = state.surname.trim();
    const validation = validateBaziInput(baziValues);

    if (!/^[\u3400-\u9fff]{1,2}$/u.test(normalizedSurname)) {
      setFormMessage('请输入 1～2 个汉字作为姓氏');
      setBaziErrors(validation.isValid ? {} : validation.errors);
      return;
    }

    if (!validation.isValid) {
      setBaziErrors(validation.errors);
      setFormMessage('请完成全部四柱选择后再提交');
      return;
    }

    const analysis = analyzeBazi(validation.bazi);
    dispatch({ type: 'SET_SURNAME', payload: normalizedSurname });
    dispatch({ type: 'CLEAR_BIRTH_RESULT' });
    dispatch({ type: 'SET_BAZI', payload: validation.bazi });
    dispatch({
      type: 'SET_ANALYSIS',
      payload: analysis,
    });
    dispatch({
      type: 'ADD_NAMING_HISTORY',
      payload: createNamingHistoryRecord({
        inputMode: 'bazi',
        surname: normalizedSurname,
        gender: state.gender,
        bazi: validation.bazi,
        analysis,
      }),
    });
    setBaziErrors({});
    setFormMessage('');
    navigate('/analysis');
  };

  const submitBirthInfo = async (birthInfo: BirthInfo) => {
    const normalizedSurname = state.surname.trim();

    if (!/^[\u3400-\u9fff]{1,2}$/u.test(normalizedSurname)) {
      setFormMessage('请输入 1～2 个汉字作为姓氏');
      return;
    }

    try {
      const { calculateCalendarResult } = await import(
        '../../core/calendar/calendarEngine'
      );
      const result = calculateCalendarResult(birthInfo);
      const analysis = analyzeBazi(result.bazi);
      dispatch({ type: 'SET_SURNAME', payload: normalizedSurname });
      dispatch({ type: 'SET_BIRTH_INFO', payload: birthInfo });
      dispatch({ type: 'SET_CALENDAR_RESULT', payload: result });
      dispatch({ type: 'SET_BAZI', payload: result.bazi });
      dispatch({
        type: 'SET_ANALYSIS',
        payload: analysis,
      });
      dispatch({
        type: 'ADD_NAMING_HISTORY',
        payload: createNamingHistoryRecord({
          inputMode: 'birth',
          surname: normalizedSurname,
          gender: state.gender,
          birthInfo,
          calendarResult: result,
          bazi: result.bazi,
          analysis,
        }),
      });
      setFormMessage('');
      navigate('/analysis');
    } catch (error: unknown) {
      setFormMessage(
        error instanceof Error ? error.message : '农历自动排盘失败',
      );
    }
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
            <span className="phaseTag">
              {state.inputMode === 'bazi' ? '手动四柱' : 'Phase 8 自动排盘'}
            </span>
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
            <Suspense
              fallback={(
                <div className="modeBody" role="status">
                  正在加载农历排盘规则…
                </div>
              )}
            >
              <BirthForm
                initialValue={state.birthInfo}
                onChange={() => setFormMessage('')}
                onSubmit={submitBirthInfo}
                submitError={formMessage}
              />
            </Suspense>
          ) : (
            <form className="modeBody" noValidate onSubmit={submitKnownBazi}>
              <BaziInput
                errors={baziErrors}
                onChange={updateBaziValue}
                values={baziValues}
              />
              <p className="baziGuide">
                选择项严格限定为合法六十甲子，提交时会再次校验并转换为统一 Bazi
                对象。
              </p>
              {formMessage ? (
                <p className="formMessage" role="alert">
                  {formMessage}
                </p>
              ) : null}
              <button className="primaryButton" type="submit">
                生成八字并查看分析
              </button>
            </form>
          )}

          <p className="panelFootnote">
            {state.inputMode === 'bazi'
              ? '四柱仅在浏览器本地校验和保存，不会上传出生数据。'
              : '农历、节气和四柱均在浏览器本地计算；默认使用中国标准时间，真太阳时关闭。'}
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
            查看八字分析 →
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
