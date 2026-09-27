import { useState } from 'react';
import type { ExplanationBundle, ExplanationItem } from '../types';

interface ExplanationPanelProps {
  bundle: ExplanationBundle;
  description: string;
  title: string;
}

type ExplanationMode = keyof ExplanationBundle;

const MODE_OPTIONS: { key: ExplanationMode; label: string }[] = [
  { key: 'ordinary', label: '普通解释' },
  { key: 'professional', label: '专业解释' },
];

function ExplanationCard({
  item,
  showMetadata,
}: {
  item: ExplanationItem;
  showMetadata: boolean;
}) {
  return (
    <article
      className={`explanationItem explanationItem--${item.level ?? 'info'}`}
    >
      <header>
        <h3>{item.title}</h3>
        {item.level === 'warning' ? <span>请留意</span> : null}
      </header>
      <p className="explanationSummary">{item.summary}</p>
      {item.detail ? <p className="explanationDetail">{item.detail}</p> : null}
      {showMetadata && (item.ruleIds?.length || item.references?.length) ? (
        <footer className="explanationMetadata">
          {item.ruleIds?.length ? (
            <div>
              <strong>规则</strong>
              <ul>
                {item.ruleIds.map((ruleId) => (
                  <li key={ruleId}>
                    <code>{ruleId}</code>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {item.references?.length ? (
            <div>
              <strong>参考</strong>
              <ul>
                {item.references.map((reference) => (
                  <li key={reference}>{reference}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}

export function ExplanationPanel({
  bundle,
  description,
  title,
}: ExplanationPanelProps) {
  const [mode, setMode] = useState<ExplanationMode>('ordinary');
  const items = bundle[mode];

  return (
    <section className="contentCard explanationPanel">
      <header className="explanationHeader">
        <div>
          <p className="eyebrow">分层解释</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="explanationModeSwitch" aria-label="解释模式">
          {MODE_OPTIONS.map((option) => (
            <button
              aria-pressed={mode === option.key}
              key={option.key}
              onClick={() => setMode(option.key)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>
      <div className="explanationList" aria-live="polite">
        {items.map((item) => (
          <ExplanationCard
            item={item}
            key={item.id}
            showMetadata={mode === 'professional'}
          />
        ))}
      </div>
    </section>
  );
}
