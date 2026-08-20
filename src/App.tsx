import { NavLink, Outlet } from 'react-router-dom';

const navigation = [
  { to: '/', label: '起名首页', end: true },
  { to: '/analysis', label: '八字分析' },
  { to: '/names', label: '姓名推荐' },
  { to: '/records', label: '本地记录' },
];

export function App() {
  return (
    <div className="siteFrame">
      <header className="siteHeader">
        <div className="headerInner">
          <NavLink className="brand" to="/" aria-label="返回起名首页">
            <span className="brandMark" aria-hidden="true">
              名
            </span>
            <span>
              <strong>传统文化宝宝起名</strong>
              <small>字有根 · 名有据</small>
            </span>
          </NavLink>

          <nav className="mainNav" aria-label="主要导航">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                className={({ isActive }) =>
                  isActive ? 'navLink navLink--active' : 'navLink'
                }
                end={item.end}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <span className="versionBadge">V1 · 本地计算与存储</span>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="siteFooter">
        <div className="footerInner">
          <p>传统文化规则与现代审美结合的姓名推荐工具</p>
          <p>
            分析结果用于文化参考，不代表命运判断；出生信息仅在本地处理。
          </p>
        </div>
      </footer>
    </div>
  );
}
