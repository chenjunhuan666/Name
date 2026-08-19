import { SIXTY_JIA_ZI } from '../../data/sixtyJiaZi';
import { PILLAR_LABELS } from '../../core/validators/baziValidator';
import type { BaziInputErrors } from '../../core/validators/baziValidator';
import type { BaziInputValues, PillarKey } from '../../types';

const PILLAR_KEYS: PillarKey[] = ['year', 'month', 'day', 'hour'];

interface BaziInputProps {
  values: BaziInputValues;
  errors?: BaziInputErrors;
  onChange: (key: PillarKey, value: string) => void;
}

export function BaziInput({ values, errors = {}, onChange }: BaziInputProps) {
  return (
    <fieldset className="baziInputFieldset">
      <legend className="srOnly">选择年柱、月柱、日柱和时柱</legend>
      <div className="baziInputGrid">
        {PILLAR_KEYS.map((key) => {
          const errorId = `${key}-pillar-error`;

          return (
            <label className="formField" key={key}>
              <span>{PILLAR_LABELS[key]}</span>
              <select
                aria-describedby={errors[key] ? errorId : undefined}
                aria-invalid={Boolean(errors[key])}
                name={key}
                onChange={(event) => onChange(key, event.target.value)}
                value={values[key]}
              >
                <option value="">请选择</option>
                {SIXTY_JIA_ZI.map((jiaZi, index) => (
                  <option key={jiaZi} value={jiaZi}>
                    {String(index + 1).padStart(2, '0')} · {jiaZi}
                  </option>
                ))}
              </select>
              {errors[key] ? (
                <small className="fieldError" id={errorId}>
                  {errors[key]}
                </small>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
