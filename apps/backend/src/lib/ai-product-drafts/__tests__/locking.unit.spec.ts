describe("draft mutation serialization", () => {
  it("holds the shared draft key while executing a mutation", async () => {
    const execute = jest.fn(async (_key, job) => job())
    const job = jest.fn(async () => "done")
    const req = {
      params: { id: "aipd_1" },
      scope: { resolve: () => ({ execute }) },
    }
    await expect(require("../locking").withAiDraftLock(req, job)).resolves.toBe(
      "done"
    )
    expect(execute).toHaveBeenCalledWith(
      "ai-product-draft:aipd_1",
      job,
      expect.any(Object)
    )
  })
})
