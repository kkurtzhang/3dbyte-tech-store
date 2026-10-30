import { generateText, type LanguageModel } from "ai";
import { withComparisonStage, comparisonMetadata } from "./comparison-context";
import { isAiTelemetryEnabled } from "@3dbyte-tech-store/observability";
import {
  isSynthesisEnabled,
  synthesizeKnowledgeAnswer,
  type SynthesisOptions,
  type SynthesisOutcome,
} from "./grounded-synthesis";
import {
  SYNTHESIS_PROMPT_VERSION,
  SYNTHESIS_VALIDATOR_VERSION,
} from "./synthesis-contract";
import type { CommerceExecution } from "./commerce-execution";

export const synthesisMetadata = () => ({
  grounded_synthesis_enabled: isSynthesisEnabled(),
  synthesis_prompt_version: SYNTHESIS_PROMPT_VERSION,
  synthesis_validator_version: SYNTHESIS_VALIDATOR_VERSION,
});
/** Same configured provider/model, zero SDK retries and no tools. No new credentials. */
export function createSynthesisResolver(
  options: Omit<SynthesisOptions, "call"> & {
    model: LanguageModel;
    commerce: CommerceExecution;
    suppliedEmails: readonly string[];
    onOutcome?: (outcome: SynthesisOutcome) => void;
  },
) {
  if (!isSynthesisEnabled()) return undefined;
  return async () => {
    // Do not send commerce or customer identifiers through an extra model pass.
    if (options.commerce.summaries.size || options.suppliedEmails.length)
      return undefined;
    return synthesizeKnowledgeAnswer({
      ...options,
      call: async (request) => {
        const result = await withComparisonStage(request.stage, () =>
          generateText({
            model: options.model,
            system: request.system,
            prompt: request.payload,
            abortSignal: request.signal,
            maxRetries: 0,
            maxOutputTokens: request.maxOutputTokens,
            temperature: 0.2,
            experimental_telemetry: {
              isEnabled: isAiTelemetryEnabled(),
              functionId: `storefront.ai-shopping-assistant.synthesis.${request.stage}`,
              recordInputs: false,
              recordOutputs: false,
              metadata: {
                ...synthesisMetadata(),
                ...comparisonMetadata(),
                synthesis_stage: request.stage,
              },
            },
          }),
        );
        return {
          text: result.text,
          inputTokens: result.totalUsage.inputTokens,
          outputTokens: result.totalUsage.outputTokens,
        };
      },
    });
  };
}
