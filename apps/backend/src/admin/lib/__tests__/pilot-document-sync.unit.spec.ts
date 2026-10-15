import { syncPilotDocuments } from "../pilot-document-sync";

const ids = ["mu3sv3poa965a25lvvlbdngc", "uur1zr0pe99e6px1r5ljs0nm"];
const success = () => ({ document_ids: [...ids], indexed: 2, deleted: 0, knowledge_indexed: 2 });

describe("fixed two-document pilot sync", () => {
  it("submits exactly the approved two IDs once and accepts reversed response order", async () => {
    const request = jest.fn().mockResolvedValue({ ...success(), document_ids: [...ids].reverse() });
    await expect(syncPilotDocuments(request)).resolves.toEqual({ ...success(), document_ids: [...ids].reverse() });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(ids);
  });
  it.each([null, {}, [], { ...success(), document_ids: [ids[0], ids[0]] },
    { ...success(), document_ids: [...ids, "unrelated"] }, { ...success(), document_ids: ["other", ids[1]] },
    { ...success(), indexed: 1 }, { ...success(), indexed: "2" }, { ...success(), deleted: 1 },
    { ...success(), knowledge_indexed: 0 }, { ...success(), document_ids: null }])(
    "does not report incomplete or malformed outcome %# as success", async (response) => {
      const request = jest.fn().mockResolvedValue(response);
      await expect(syncPilotDocuments(request)).rejects.toThrow("Sync outcome unconfirmed");
      expect(request).toHaveBeenCalledTimes(1);
    });
  it.each([401, 403, 503])("does not retry or fall back after HTTP %s", async (status) => {
    const error = Object.assign(new Error("synthetic server detail"), { status });
    const request = jest.fn().mockRejectedValue(error);
    await expect(syncPilotDocuments(request)).rejects.toBe(error);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
