import { parseIsoDate } from './scoring';

const pad = (value: number) => String(value).padStart(2, '0');

export const localDateInputValue = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const visitDateInputValue = (visitedAt: string) => {
  const timestamp = parseIsoDate(visitedAt);
  return visitedAt.length === 10 ? visitedAt : localDateInputValue(new Date(timestamp));
};

const shiftDate = (date: string, days: number) => {
  const shifted = new Date(parseIsoDate(date));
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
};

export const replaceVisitDate = (visitedAt: string, date: string) => {
  parseIsoDate(visitedAt);
  parseIsoDate(date);
  if (date.length !== 10) throw new Error('Visit timestamps must use a supported ISO format.');
  if (visitedAt.length === 10) return date;
  if (visitDateInputValue(visitedAt) === date) return visitedAt;

  const suffix = visitedAt.slice(10);
  for (const days of [0, -1, 1, -2, 2]) {
    const candidate = `${shiftDate(date, days)}${suffix}`;
    if (visitDateInputValue(candidate) === date) return candidate;
  }
  throw new Error('Visit date is not valid in the local time zone.');
};

export const formatVisitDate = (visitedAt: string) => {
  const date = new Date(`${visitDateInputValue(visitedAt)}T00:00:00`);
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
};
