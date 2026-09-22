export const NAMING_RETRIEVAL = {
  targetCharacterCount: 320,
  legacyFloorCount: 240,
  beamWidthPerFirst: 30,
  quotaRatios: {
    element: 0.4,
    style: 0.25,
    gender: 0.1,
    classic: 0.1,
    exploration: 0.15,
  },
} as const;

export type NamingRetrievalQuota = keyof typeof NAMING_RETRIEVAL.quotaRatios;
