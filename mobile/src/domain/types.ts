export type ScorePolicy = {
  readonly menuTasteWeight: number;
  readonly menuValueWeight: number;
  readonly visitMenuWeight: number;
  readonly visitServiceWeight: number;
  readonly visitAtmosphereWeight: number;
  readonly sequenceDecay: number;
};
