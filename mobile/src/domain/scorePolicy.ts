import type { ScorePolicy } from './types';

export const DEFAULT_SCORE_POLICY: ScorePolicy = Object.freeze({
  menuTasteWeight: 0.7,
  menuValueWeight: 0.3,
  visitMenuWeight: 0.6,
  visitServiceWeight: 0.2,
  visitAtmosphereWeight: 0.2,
  sequenceDecay: 0.8,
});

export function normalizePolicy(policy: ScorePolicy): ScorePolicy {
  const weights = [
    policy.menuTasteWeight,
    policy.menuValueWeight,
    policy.visitMenuWeight,
    policy.visitServiceWeight,
    policy.visitAtmosphereWeight,
  ];

  if (weights.some((weight) => !Number.isFinite(weight) || weight < 0)) {
    throw new Error('Score weights must be finite, non-negative numbers.');
  }

  if (
    !Number.isFinite(policy.sequenceDecay) ||
    policy.sequenceDecay <= 0 ||
    policy.sequenceDecay > 1
  ) {
    throw new Error('Sequence decay must be greater than 0 and no greater than 1.');
  }

  const menuWeightTotal = policy.menuTasteWeight + policy.menuValueWeight;
  const visitWeightTotal =
    policy.visitMenuWeight + policy.visitServiceWeight + policy.visitAtmosphereWeight;

  if (
    !Number.isFinite(menuWeightTotal) ||
    !Number.isFinite(visitWeightTotal) ||
    menuWeightTotal <= 0 ||
    visitWeightTotal <= 0
  ) {
    throw new Error('Each score weight group must have a positive total.');
  }

  return {
    menuTasteWeight: policy.menuTasteWeight / menuWeightTotal,
    menuValueWeight: policy.menuValueWeight / menuWeightTotal,
    visitMenuWeight: policy.visitMenuWeight / visitWeightTotal,
    visitServiceWeight: policy.visitServiceWeight / visitWeightTotal,
    visitAtmosphereWeight: policy.visitAtmosphereWeight / visitWeightTotal,
    sequenceDecay: policy.sequenceDecay,
  };
}
