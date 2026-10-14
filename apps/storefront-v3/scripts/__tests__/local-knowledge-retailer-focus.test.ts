import { resolveLocalRetailerFocus } from "../../src/app/api/ai-shopping-assistant/local-retailer-reference-focus";
import { officialResourceRequested } from "../../src/app/api/ai-shopping-assistant/official-resource-intent";
import { resolveThreeDSetsResources } from "../../src/app/api/ai-shopping-assistant/three-d-sets-resources";
const user = (content: string) => ({ role: "user" as const, content });
describe("external retailer reference focus", () => {
  it("uses only an exact known source SKU without selecting a store variant", () => {
    const result = resolveLocalRetailerFocus([
      user("What is included in DREMC WES2487?"),
    ])!;
    expect(result.mode).toBe("direct");
    expect(result.subjects).toEqual(["DREMC retailer reference WES2487"]);
    expect(result.groupKey).toBeUndefined();
    expect(
      resolveLocalRetailerFocus([user("What is included in WES24870?")]),
    ).toBeNull();
  });
  it("retains the most recent replacement SKU for a follow-up", () => {
    const result = resolveLocalRetailerFocus([
      user("DREMC WES2487"),
      user("Instead I need WES2489."),
      user("Does it include STLs?"),
    ])!;
    expect(result.mode).toBe("focused");
    expect(result.question).toContain("WES2489");
    expect(result.question).not.toContain("WES2487");
  });
  it("clarifies a follow-up after comparing two source variants", () => {
    const result = resolveLocalRetailerFocus([
      user("Compare WES2487 and WES2488."),
      user("Does it include a radio?"),
    ])!;
    expect(result.mode).toBe("clarify");
  });
  it("does not carry assistant claims or private user history", () => {
    expect(
      resolveLocalRetailerFocus([
        { role: "assistant", content: "WES2487 includes STLs." },
        user("Does it include STLs?"),
      ]),
    ).toBeNull();
    expect(
      resolveLocalRetailerFocus([
        user("My order order_fixture123 contained WES2487."),
        user("Does it include STLs?"),
      ]),
    ).toBeNull();
  });
  it("keeps official resource requests separate from kit inclusion questions", () => {
    expect(officialResourceRequested("Does WES2487 include STL files?")).toBe(
      false,
    );
    expect(
      officialResourceRequested(
        "Where is the public Sandy build guide for WES2487?",
      ),
    ).toBe(true);
    expect(officialResourceRequested("3D Sets WES2487 FAQ")).toBe(true);
  });
  it("routes a named-model guide despite a kit/source SKU in the question", () => {
    const result = resolveThreeDSetsResources([
      user("Where is the public Sandy build guide for WES2487 kit?"),
    ])!;
    expect(result.reason).toBe("official_build_guide_link_only");
    expect(
      result.links.some((link) =>
        link.url.includes("docs.google.com/presentation"),
      ),
    ).toBe(true);
  });
});
