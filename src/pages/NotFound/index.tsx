import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="pageWidth notFound">
      <span aria-hidden="true">空</span>
      <p className="eyebrow">404</p>
      <h1>此页尚无题名</h1>
      <p>当前地址不存在，请返回起名首页继续。</p>
      <Link className="primaryButton primaryButton--link" to="/">
        返回首页
      </Link>
    </div>
  );
}
