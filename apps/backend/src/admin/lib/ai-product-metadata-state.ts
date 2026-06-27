export type BooleanFormValue = "" | "true" | "false";

export type AiCoreMetadataFormState = {
  enabled: boolean;
  productKind: string;
  audience: string;
  bestFor: string;
  notRecommendedFor: string;
  compatibilityNotes: string;
  careOrSafetyNotes: string;
  aiSearchKeywords: string;
};

export type ThreeDPrintingMetadataFormState = {
  enabled: boolean;
  productKind: string;
  material: string;
  diameterMm: string;
  nozzleDiameterMm: string;
  nozzleTempMinC: string;
  nozzleTempMaxC: string;
  bedTempMinC: string;
  bedTempMaxC: string;
  maxTemperatureC: string;
  requiresEnclosure: BooleanFormValue;
  requiresHardenedNozzle: BooleanFormValue;
  dryingRecommended: BooleanFormValue;
  compatiblePrinters: string;
  compatibleBuildSurfaces: string;
  bestFor: string;
  notRecommendedFor: string;
  commonIssues: string;
  aiSearchKeywords: string;
};

export type RcModelBuildingMetadataFormState = {
  enabled: boolean;
  componentRole: string;
  compatibleProjectTypes: string;
  voltage: string;
  connectorType: string;
  usedFor: string;
  bestFor: string;
  aiSearchKeywords: string;
};

export type AiProductMetadataFormState = {
  aiCore: AiCoreMetadataFormState;
  threeDPrinting: ThreeDPrintingMetadataFormState;
  rcModelBuilding: RcModelBuildingMetadataFormState;
};

export const emptyAiProductMetadataFormState = (): AiProductMetadataFormState => ({
  aiCore: {
    enabled: false,
    productKind: "",
    audience: "",
    bestFor: "",
    notRecommendedFor: "",
    compatibilityNotes: "",
    careOrSafetyNotes: "",
    aiSearchKeywords: "",
  },
  threeDPrinting: {
    enabled: false,
    productKind: "",
    material: "",
    diameterMm: "",
    nozzleDiameterMm: "",
    nozzleTempMinC: "",
    nozzleTempMaxC: "",
    bedTempMinC: "",
    bedTempMaxC: "",
    maxTemperatureC: "",
    requiresEnclosure: "",
    requiresHardenedNozzle: "",
    dryingRecommended: "",
    compatiblePrinters: "",
    compatibleBuildSurfaces: "",
    bestFor: "",
    notRecommendedFor: "",
    commonIssues: "",
    aiSearchKeywords: "",
  },
  rcModelBuilding: {
    enabled: false,
    componentRole: "",
    compatibleProjectTypes: "",
    voltage: "",
    connectorType: "",
    usedFor: "",
    bestFor: "",
    aiSearchKeywords: "",
  },
});
