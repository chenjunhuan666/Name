import { Link, useNavigate } from 'react-router-dom';
import { PageIntro } from '../../components/PageIntro';
import { PhaseNotice } from '../../components/PhaseNotice';
import { formatPillar } from '../../core/bazi/ganzhi';
import { formatLunarDate } from '../../core/calendar/calendarEngine';
import { useNaming } from '../../store/useNaming';

function formatLocalDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '时间未知';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function RecordsPage() {
  const { state, dispatch } = useNaming();
  const navigate = useNavigate();

  return (
    <div className="pageWidth innerPage">
      <PageIntro
        eyebrow="本地记录"
        title="收藏与起名过程，都留在当前浏览器"
        description="收藏姓名、最近起名会话和最近浏览均使用版本化 localStorage 保存；不需要账号，也不会上传出生信息。"
        aside={<span className="phaseTag">Phase 9 本地闭环</span>}
      />

      <section className="localRecordSummary" aria-label="本地记录统计">
        <article>
          <strong>{state.favorites.length}</strong>
          <span>收藏姓名</span>
        </article>
        <article>
          <strong>{state.namingHistory.length}</strong>
          <span>起名会话</span>
        </article>
        <article>
          <strong>{state.recentViews.length}</strong>
          <span>最近浏览</span>
        </article>
      </section>

      <section className="contentCard localRecordsSection">
        <div className="localRecordsHeading">
          <div>
            <p className="eyebrow">姓名收藏</p>
            <h2>已收藏的候选姓名</h2>
          </div>
          <span>{state.favorites.length} 个</span>
        </div>
        {state.favorites.length ? (
          <div className="localNameGrid">
            {state.favorites.map((favorite) => (
              <article className="localNameCard" key={favorite.name.id}>
                <div>
                  <p>{favorite.name.pinyin}</p>
                  <h3>{favorite.name.fullName}</h3>
                </div>
                <strong>{favorite.name.score} 分</strong>
                <p>{favorite.name.meaning}</p>
                <small>
                  收藏于 {formatLocalDateTime(favorite.savedAt)}
                </small>
                <footer>
                  <button
                    className="favoriteButton"
                    onClick={() =>
                      dispatch({
                        type: 'TOGGLE_FAVORITE',
                        payload: favorite,
                      })
                    }
                    type="button"
                  >
                    取消收藏
                  </button>
                  <Link
                    className="textLink"
                    to={`/names/${favorite.name.id}`}
                  >
                    查看详情 →
                  </Link>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <p className="localEmptyState">
            暂无收藏。可在姓名推荐卡片或姓名详情页点击“收藏”。
          </p>
        )}
      </section>

      <section className="contentCard localRecordsSection">
        <div className="localRecordsHeading">
          <div>
            <p className="eyebrow">最近起名</p>
            <h2>最近 10 次排盘会话</h2>
          </div>
          {state.namingHistory.length ? (
            <button
              className="quietButton"
              onClick={() => dispatch({ type: 'CLEAR_NAMING_HISTORY' })}
              type="button"
            >
              清空起名记录
            </button>
          ) : null}
        </div>
        {state.namingHistory.length ? (
          <div className="namingHistoryList">
            {state.namingHistory.map((record) => (
              <article key={record.id}>
                <div className="historyRecordMain">
                  <span>
                    {record.inputMode === 'birth' ? '自动排盘' : '手动四柱'}
                  </span>
                  <h3>{record.surname}姓宝宝 · {record.gender === 'male' ? '男宝' : '女宝'}</h3>
                  <p>
                    {Object.values(record.bazi).map(formatPillar).join(' · ')}
                  </p>
                  {record.birthInfo ? (
                    <small>
                      {formatLunarDate(record.birthInfo.lunarDate)} ·{' '}
                      {String(record.birthInfo.hour).padStart(2, '0')}:
                      {String(record.birthInfo.minute).padStart(2, '0')}
                    </small>
                  ) : null}
                </div>
                <div className="historyRecordActions">
                  <time dateTime={record.createdAt}>
                    {formatLocalDateTime(record.createdAt)}
                  </time>
                  <button
                    className="secondaryButton"
                    onClick={() => {
                      dispatch({
                        type: 'RESTORE_NAMING_HISTORY',
                        payload: record,
                      });
                      navigate('/analysis');
                    }}
                    type="button"
                  >
                    恢复并查看分析
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="localEmptyState">
            暂无起名记录。完成一次自动排盘或手动四柱分析后会自动保存。
          </p>
        )}
      </section>

      <section className="contentCard localRecordsSection">
        <div className="localRecordsHeading">
          <div>
            <p className="eyebrow">最近浏览</p>
            <h2>最近查看的姓名详情</h2>
          </div>
          {state.recentViews.length ? (
            <button
              className="quietButton"
              onClick={() => dispatch({ type: 'CLEAR_RECENT_VIEWS' })}
              type="button"
            >
              清空浏览记录
            </button>
          ) : null}
        </div>
        {state.recentViews.length ? (
          <div className="recentViewList">
            {state.recentViews.map((record) => (
              <Link key={record.name.id} to={`/names/${record.name.id}`}>
                <span>
                  <strong>{record.name.fullName}</strong>
                  <small>{record.name.pinyin}</small>
                </span>
                <span>
                  {formatLocalDateTime(record.viewedAt)} · {record.name.score} 分
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="localEmptyState">
            暂无浏览记录。打开姓名评分详情后会自动记录。
          </p>
        )}
      </section>

      <PhaseNotice
        eyebrow="V1 本地数据"
        title="数据只属于当前浏览器"
        description="清理浏览器站点数据、使用无痕窗口或更换设备会导致记录不可用；V1 不提供账号、云同步或跨设备恢复。"
      />

      <div className="pageActions">
        <Link className="secondaryButton" to="/names">
          返回姓名推荐
        </Link>
      </div>
    </div>
  );
}
