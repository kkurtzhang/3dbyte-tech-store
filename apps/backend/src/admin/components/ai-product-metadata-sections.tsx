import type { AiProductMetadataFormState } from "../lib/ai-product-metadata";
import {
  BooleanField,
  SectionToggle,
  TextAreaField,
  TextField,
} from "./ai-product-metadata-fields";

type AiCoreSectionProps = {
  state: AiProductMetadataFormState["aiCore"];
  update: (patch: Partial<AiProductMetadataFormState["aiCore"]>) => void;
};

type ThreeDPrintingSectionProps = {
  state: AiProductMetadataFormState["threeDPrinting"];
  update: (
    patch: Partial<AiProductMetadataFormState["threeDPrinting"]>,
  ) => void;
};

type RcModelBuildingSectionProps = {
  state: AiProductMetadataFormState["rcModelBuilding"];
  update: (
    patch: Partial<AiProductMetadataFormState["rcModelBuilding"]>,
  ) => void;
};

export const AiCoreSection = ({ state, update }: AiCoreSectionProps) => (
  <div className="flex flex-col gap-y-4">
    <SectionToggle
      title="AI Core"
      description="General product facts for any category."
      checked={state.enabled}
      onCheckedChange={(enabled) => update({ enabled })}
    />
    {state.enabled && (
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Product kind"
          value={state.productKind}
          placeholder="soldering_station"
          onChange={(productKind) => update({ productKind })}
        />
        <TextAreaField
          label="Audience"
          value={state.audience}
          placeholder="One audience per line"
          onChange={(audience) => update({ audience })}
        />
        <TextAreaField
          label="Best for"
          value={state.bestFor}
          placeholder="One use case per line"
          onChange={(bestFor) => update({ bestFor })}
        />
        <TextAreaField
          label="Not recommended for"
          value={state.notRecommendedFor}
          placeholder="One caveat per line"
          onChange={(notRecommendedFor) => update({ notRecommendedFor })}
        />
        <TextAreaField
          label="Compatibility notes"
          value={state.compatibilityNotes}
          placeholder="One compatibility fact per line"
          onChange={(compatibilityNotes) => update({ compatibilityNotes })}
        />
        <TextAreaField
          label="Care or safety notes"
          value={state.careOrSafetyNotes}
          placeholder="One care or safety note per line"
          onChange={(careOrSafetyNotes) => update({ careOrSafetyNotes })}
        />
        <TextAreaField
          label="AI search keywords"
          value={state.aiSearchKeywords}
          placeholder="One keyword per line"
          onChange={(aiSearchKeywords) => update({ aiSearchKeywords })}
        />
      </div>
    )}
  </div>
);

export const ThreeDPrintingSection = ({
  state,
  update,
}: ThreeDPrintingSectionProps) => (
  <div className="flex flex-col gap-y-4">
    <SectionToggle
      title="3D printing expert"
      description="Print-process facts for filament, nozzles, hotends, build surfaces, drying, and maintenance products."
      checked={state.enabled}
      onCheckedChange={(enabled) => update({ enabled })}
    />
    {state.enabled && (
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Product kind"
          value={state.productKind}
          placeholder="filament"
          onChange={(productKind) => update({ productKind })}
        />
        <TextField
          label="Material"
          value={state.material}
          placeholder="PETG"
          onChange={(material) => update({ material })}
        />
        <TextField
          label="Diameter mm"
          type="number"
          value={state.diameterMm}
          onChange={(diameterMm) => update({ diameterMm })}
        />
        <TextField
          label="Nozzle diameter mm"
          type="number"
          value={state.nozzleDiameterMm}
          onChange={(nozzleDiameterMm) => update({ nozzleDiameterMm })}
        />
        <TextField
          label="Nozzle temp min C"
          type="number"
          value={state.nozzleTempMinC}
          onChange={(nozzleTempMinC) => update({ nozzleTempMinC })}
        />
        <TextField
          label="Nozzle temp max C"
          type="number"
          value={state.nozzleTempMaxC}
          onChange={(nozzleTempMaxC) => update({ nozzleTempMaxC })}
        />
        <TextField
          label="Bed temp min C"
          type="number"
          value={state.bedTempMinC}
          onChange={(bedTempMinC) => update({ bedTempMinC })}
        />
        <TextField
          label="Bed temp max C"
          type="number"
          value={state.bedTempMaxC}
          onChange={(bedTempMaxC) => update({ bedTempMaxC })}
        />
        <TextField
          label="Max temperature C"
          type="number"
          value={state.maxTemperatureC}
          onChange={(maxTemperatureC) => update({ maxTemperatureC })}
        />
        <BooleanField
          label="Requires enclosure"
          value={state.requiresEnclosure}
          onChange={(requiresEnclosure) => update({ requiresEnclosure })}
        />
        <BooleanField
          label="Requires hardened nozzle"
          value={state.requiresHardenedNozzle}
          onChange={(requiresHardenedNozzle) =>
            update({ requiresHardenedNozzle })
          }
        />
        <BooleanField
          label="Drying recommended"
          value={state.dryingRecommended}
          onChange={(dryingRecommended) => update({ dryingRecommended })}
        />
        <TextAreaField
          label="Compatible printers"
          value={state.compatiblePrinters}
          placeholder="One printer per line"
          onChange={(compatiblePrinters) => update({ compatiblePrinters })}
        />
        <TextAreaField
          label="Compatible build surfaces"
          value={state.compatibleBuildSurfaces}
          placeholder="One surface per line"
          onChange={(compatibleBuildSurfaces) =>
            update({ compatibleBuildSurfaces })
          }
        />
        <TextAreaField
          label="Best for"
          value={state.bestFor}
          placeholder="One use case per line"
          onChange={(bestFor) => update({ bestFor })}
        />
        <TextAreaField
          label="Not recommended for"
          value={state.notRecommendedFor}
          placeholder="One caveat per line"
          onChange={(notRecommendedFor) => update({ notRecommendedFor })}
        />
        <TextAreaField
          label="Common issues"
          value={state.commonIssues}
          placeholder="One issue per line"
          onChange={(commonIssues) => update({ commonIssues })}
        />
        <TextAreaField
          label="AI search keywords"
          value={state.aiSearchKeywords}
          placeholder="One keyword per line"
          onChange={(aiSearchKeywords) => update({ aiSearchKeywords })}
        />
      </div>
    )}
  </div>
);

export const RcModelBuildingSection = ({
  state,
  update,
}: RcModelBuildingSectionProps) => (
  <div className="flex flex-col gap-y-4">
    <SectionToggle
      title="RC model building expert"
      description="3DSets-style RC component, electronics, connector, voltage, hardware, and assembly facts."
      checked={state.enabled}
      onCheckedChange={(enabled) => update({ enabled })}
    />
    {state.enabled && (
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Component role"
          value={state.componentRole}
          placeholder="esc"
          onChange={(componentRole) => update({ componentRole })}
        />
        <TextField
          label="Voltage"
          value={state.voltage}
          placeholder="7.4V"
          onChange={(voltage) => update({ voltage })}
        />
        <TextField
          label="Connector type"
          value={state.connectorType}
          placeholder="XT60"
          onChange={(connectorType) => update({ connectorType })}
        />
        <TextAreaField
          label="Compatible project types"
          value={state.compatibleProjectTypes}
          placeholder="One project type per line"
          onChange={(compatibleProjectTypes) =>
            update({ compatibleProjectTypes })
          }
        />
        <TextAreaField
          label="Used for"
          value={state.usedFor}
          placeholder="One use per line"
          onChange={(usedFor) => update({ usedFor })}
        />
        <TextAreaField
          label="Best for"
          value={state.bestFor}
          placeholder="One use case per line"
          onChange={(bestFor) => update({ bestFor })}
        />
        <TextAreaField
          label="AI search keywords"
          value={state.aiSearchKeywords}
          placeholder="One keyword per line"
          onChange={(aiSearchKeywords) => update({ aiSearchKeywords })}
        />
      </div>
    )}
  </div>
);
