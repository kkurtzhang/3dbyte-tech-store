import { findMissingFilteredCategoryIds } from "../sync-categories";

describe("findMissingFilteredCategoryIds", () => {
  it("returns category IDs from an explicit filter when they were not indexed", () => {
    expect(
      findMissingFilteredCategoryIds({ id: "pcat_inactive" }, []),
    ).toEqual(["pcat_inactive"]);
  });

  it("does not return IDs that were indexed", () => {
    expect(
      findMissingFilteredCategoryIds(
        { id: ["pcat_active", "pcat_inactive"] },
        [{ id: "pcat_active" }],
      ),
    ).toEqual(["pcat_inactive"]);
  });

  it("does not infer stale IDs when the sync was not for explicit category IDs", () => {
    expect(findMissingFilteredCategoryIds({}, [])).toEqual([]);
  });
});
