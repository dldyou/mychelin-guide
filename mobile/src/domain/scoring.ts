import { normalizePolicy } from './scorePolicy';
import type { ScorePolicy } from './types';

type ScoredVisit = {
  score: number;
  visitedAt: string;
};

const ISO_VISITED_AT =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d))?$/;

function assertRating(rating: number) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Ratings must be integers from 1 through 5.');
  }
}

export function parseIsoDate(value: string) {
  const match = ISO_VISITED_AT.exec(value);
  if (!match) throw new Error('Visit timestamps must use a supported ISO format.');

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
    throw new Error('Visit timestamps must contain a valid calendar date.');
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error('Visit timestamps must be valid dates.');
  return timestamp;
}

function newestFirst(visits: ScoredVisit[]) {
  return visits
    .map((visit) => {
      assertRating(visit.score);
      return { visit, visitedAt: parseIsoDate(visit.visitedAt) };
    })
    .sort((left, right) => right.visitedAt - left.visitedAt)
    .map(({ visit }) => visit);
}

function weightedAverage(visits: ScoredVisit[], sequenceDecay: number) {
  let weightedScoreTotal = 0;
  let weightTotal = 0;

  visits.forEach(({ score }, rank) => {
    const weight = sequenceDecay ** rank;
    weightedScoreTotal += score * weight;
    weightTotal += weight;
  });

  return weightedScoreTotal / weightTotal;
}

export function calculateMenuScore(taste: number, value: number, policy: ScorePolicy) {
  assertRating(taste);
  assertRating(value);
  const normalized = normalizePolicy(policy);
  return Math.round(taste * normalized.menuTasteWeight + value * normalized.menuValueWeight);
}

export function calculateVisitScore(
  menuScores: number[],
  service: number,
  atmosphere: number,
  policy: ScorePolicy,
) {
  if (menuScores.length === 0) {
    throw new Error('A visit requires at least one menu score.');
  }

  menuScores.forEach(assertRating);
  assertRating(service);
  assertRating(atmosphere);

  const normalized = normalizePolicy(policy);
  const menuAverage = menuScores.reduce((total, score) => total + score, 0) / menuScores.length;

  return Math.round(
    menuAverage * normalized.visitMenuWeight +
      service * normalized.visitServiceWeight +
      atmosphere * normalized.visitAtmosphereWeight,
  );
}

export function calculateRestaurantScore(visits: ScoredVisit[], policy: ScorePolicy) {
  const normalized = normalizePolicy(policy);
  if (visits.length === 0) return null;
  return Math.round(weightedAverage(newestFirst(visits), normalized.sequenceDecay));
}

export function calculateRecentChange(visits: ScoredVisit[], policy: ScorePolicy) {
  const normalized = normalizePolicy(policy);
  if (visits.length < 4) return null;

  const sorted = newestFirst(visits);
  const recent = weightedAverage(sorted.slice(0, 3), normalized.sequenceDecay);
  const previous = weightedAverage(sorted.slice(3), normalized.sequenceDecay);
  return recent - previous;
}
