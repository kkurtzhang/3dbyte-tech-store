export const PILOT_DOCUMENTS = [
  { id: "mu3sv3poa965a25lvvlbdngc", title: "Magigoo Original 50ml" },
  { id: "uur1zr0pe99e6px1r5ljs0nm", title: "Phaetus Dragonfly BMS" },
] as const;

type PilotSyncResult = {
  document_ids: string[];
  indexed: number;
  deleted: number;
  knowledge_indexed: number;
};

export async function syncPilotDocuments(
  request: (documentIds: string[]) => Promise<unknown>,
): Promise<PilotSyncResult> {
  const ids = PILOT_DOCUMENTS.map((document) => document.id);
  const response = await request(ids);
  if (typeof response !== "object" || response === null) {
    throw new Error("Sync outcome unconfirmed");
  }
  const result = response as Partial<PilotSyncResult>;
  if (
    !Array.isArray(result.document_ids) ||
    result.document_ids.length !== ids.length ||
    !ids.every((id) => result.document_ids!.includes(id)) ||
    result.indexed !== 2 || result.deleted !== 0 || result.knowledge_indexed !== 2
  ) {
    throw new Error("Sync outcome unconfirmed");
  }
  return result as PilotSyncResult;
}
