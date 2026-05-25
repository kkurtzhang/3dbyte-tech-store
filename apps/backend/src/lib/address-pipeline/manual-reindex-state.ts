import type { MedusaContainer } from "@medusajs/framework/types";

import { isAddressReindexEnabled, runAddressReindex } from "./reindex";
import type { AddressPipelineResult } from "./types";

export type ManualAddressReindexStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "disabled";

export type ManualAddressReindexResponse = {
  enabled: boolean;
  status: ManualAddressReindexStatus;
  run_id?: string;
  started_at?: string;
  finished_at?: string;
  error?: string;
  result?: AddressPipelineResult;
};

export type StartManualAddressReindexResult = {
  started: boolean;
  message: string;
  status: ManualAddressReindexResponse;
};

type ManualAddressReindexRun = Omit<ManualAddressReindexResponse, "enabled">;

let currentRun: ManualAddressReindexRun = {
  status: "idle",
};

function createRunId(): string {
  return `addr_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export function getManualAddressReindexStatus(): ManualAddressReindexResponse {
  const enabled = isAddressReindexEnabled("manual");

  if (!enabled) {
    return {
      enabled,
      status: "disabled",
    };
  }

  return {
    enabled,
    ...currentRun,
  };
}

export function startManualAddressReindex(
  container: MedusaContainer,
): StartManualAddressReindexResult {
  const enabled = isAddressReindexEnabled("manual");

  if (!enabled) {
    return {
      started: false,
      message: "Manual address reindex is disabled for this environment",
      status: {
        enabled,
        status: "disabled",
      },
    };
  }

  if (currentRun.status === "running") {
    return {
      started: false,
      message: "Address reindex is already running",
      status: {
        enabled,
        ...currentRun,
      },
    };
  }

  currentRun = {
    status: "running",
    run_id: createRunId(),
    started_at: new Date().toISOString(),
  };

  void runAddressReindex(container, { trigger: "manual" })
    .then(({ result }) => {
      currentRun = {
        ...currentRun,
        status: "completed",
        finished_at: new Date().toISOString(),
        result,
      };
    })
    .catch((error: unknown) => {
      currentRun = {
        ...currentRun,
        status: "failed",
        finished_at: new Date().toISOString(),
        error: getErrorMessage(error),
      };
    });

  return {
    started: true,
    message: "Address reindex started",
    status: {
      enabled,
      ...currentRun,
    },
  };
}

export function resetManualAddressReindexStateForTests(): void {
  currentRun = {
    status: "idle",
  };
}
