import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  MAX_LUNAR_YEAR,
  MIN_LUNAR_YEAR,
  getLunarMonthOptions,
} from '../../core/calendar/calendarEngine';
import type { BirthInfo } from '../../types';

interface BirthFormProps {
  initialValue?: BirthInfo;
  onChange?: () => void;
  onSubmit: (birthInfo: BirthInfo) => void;
  submitError?: string;
}

const yearOptions = Array.from(
  { length: MAX_LUNAR_YEAR - MIN_LUNAR_YEAR + 1 },
  (_, index) => MAX_LUNAR_YEAR - index,
);
const hourOptions = Array.from({ length: 24 }, (_, hour) => hour);
const minuteOptions = Array.from({ length: 60 }, (_, minute) => minute);

function toMonthKey(month: number, isLeapMonth: boolean): string {
  return `${isLeapMonth ? 'leap-' : ''}${month}`;
}

function parseMonthKey(value: string) {
  const isLeapMonth = value.startsWith('leap-');
  const month = Number(value.replace('leap-', ''));
  return { month, isLeapMonth };
}

export function BirthForm({
  initialValue,
  onChange,
  onSubmit,
  submitError,
}: BirthFormProps) {
  const currentYear = new Date().getFullYear();
  const defaultYear = Math.min(
    Math.max(currentYear, MIN_LUNAR_YEAR),
    MAX_LUNAR_YEAR,
  );
  const [year, setYear] = useState(
    String(initialValue?.lunarDate.year ?? defaultYear),
  );
  const [monthKey, setMonthKey] = useState(() =>
    initialValue
      ? toMonthKey(
          initialValue.lunarDate.month,
          initialValue.lunarDate.isLeapMonth,
        )
      : '',
  );
  const [day, setDay] = useState(
    initialValue ? String(initialValue.lunarDate.day) : '',
  );
  const [hour, setHour] = useState(
    initialValue ? String(initialValue.hour) : '',
  );
  const [minute, setMinute] = useState(
    initialValue ? String(initialValue.minute) : '',
  );
  const [location, setLocation] = useState(initialValue?.location ?? '');
  const [formError, setFormError] = useState('');

  const monthOptions = useMemo(
    () => getLunarMonthOptions(Number(year)),
    [year],
  );
  const selectedMonth = monthOptions.find(
    (option) =>
      toMonthKey(option.month, option.isLeapMonth) === monthKey,
  );
  const dayOptions = Array.from(
    { length: selectedMonth?.dayCount ?? 0 },
    (_, index) => index + 1,
  );

  const reportChange = () => {
    setFormError('');
    onChange?.();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!monthKey || !day || !hour || !minute) {
      setFormError('请完整选择农历日期和出生时间');
      return;
    }

    const { month, isLeapMonth } = parseMonthKey(monthKey);
    onSubmit({
      calendar: 'lunar',
      lunarDate: {
        year: Number(year),
        month,
        day: Number(day),
        isLeapMonth,
      },
      hour: Number(hour),
      minute: Number(minute),
      location: location.trim() || undefined,
    });
  };

  return (
    <form className="modeBody birthForm" noValidate onSubmit={submit}>
      <label className="formField">
        <span>历法</span>
        <select aria-label="历法" value="lunar" disabled>
          <option value="lunar">农历</option>
        </select>
      </label>

      <fieldset className="birthFieldset">
        <legend>出生日期</legend>
        <div className="birthDateFields">
          <label className="formField">
            <span>年份</span>
            <select
              aria-label="农历年份"
              onChange={(event) => {
                setYear(event.target.value);
                setMonthKey('');
                setDay('');
                reportChange();
              }}
              value={year}
            >
              {yearOptions.map((yearOption) => (
                <option key={yearOption} value={yearOption}>
                  {yearOption} 年
                </option>
              ))}
            </select>
          </label>
          <label className="formField">
            <span>月份</span>
            <select
              aria-label="农历月份"
              onChange={(event) => {
                setMonthKey(event.target.value);
                setDay('');
                reportChange();
              }}
              value={monthKey}
            >
              <option value="">请选择</option>
              {monthOptions.map((option) => {
                const value = toMonthKey(
                  option.month,
                  option.isLeapMonth,
                );
                return (
                  <option key={value} value={value}>
                    {option.label}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="formField">
            <span>日期</span>
            <select
              aria-label="农历日期"
              disabled={!selectedMonth}
              onChange={(event) => {
                setDay(event.target.value);
                reportChange();
              }}
              value={day}
            >
              <option value="">请选择</option>
              {dayOptions.map((dayOption) => (
                <option key={dayOption} value={dayOption}>
                  {dayOption} 日
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="birthFieldset">
        <legend>出生时间（中国标准时间）</legend>
        <div className="birthTimeFields">
          <label className="formField">
            <span>小时</span>
            <select
              aria-label="出生小时"
              onChange={(event) => {
                setHour(event.target.value);
                reportChange();
              }}
              value={hour}
            >
              <option value="">请选择</option>
              {hourOptions.map((hourOption) => (
                <option key={hourOption} value={hourOption}>
                  {String(hourOption).padStart(2, '0')} 时
                </option>
              ))}
            </select>
          </label>
          <label className="formField">
            <span>分钟</span>
            <select
              aria-label="出生分钟"
              onChange={(event) => {
                setMinute(event.target.value);
                reportChange();
              }}
              value={minute}
            >
              <option value="">请选择</option>
              {minuteOptions.map((minuteOption) => (
                <option key={minuteOption} value={minuteOption}>
                  {String(minuteOption).padStart(2, '0')} 分
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <label className="formField birthLocationField">
        <span>出生地点（可选）</span>
        <input
          maxLength={30}
          onChange={(event) => {
            setLocation(event.target.value);
            reportChange();
          }}
          placeholder="如：深圳市；V1 仅记录，不启用真太阳时"
          value={location}
        />
      </label>

      <p className="baziGuide">
        系统先把农历转换为公历，再按精确节气交接确定年柱和月柱；地点暂不参与计算。
      </p>
      {formError || submitError ? (
        <p className="formMessage" role="alert">
          {formError || submitError}
        </p>
      ) : null}
      <button className="primaryButton" type="submit">
        自动排盘并查看分析
      </button>
    </form>
  );
}
