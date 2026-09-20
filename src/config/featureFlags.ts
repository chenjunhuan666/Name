export interface FeatureFlags {
  tenGods: boolean;
  benchmarkModel: boolean;
  dynamicRetrieval: boolean;
  advancedExplanation: boolean;
}

export const FEATURES: Readonly<FeatureFlags> = {
  tenGods: true,
  benchmarkModel: false,
  dynamicRetrieval: false,
  advancedExplanation: false,
};
