interface PhaseNoticeProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function PhaseNotice({
  eyebrow,
  title,
  description,
}: PhaseNoticeProps) {
  return (
    <section className="phaseNotice" aria-live="polite">
      <span className="phaseNotice__seal" aria-hidden="true">
        待
      </span>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </section>
  );
}
