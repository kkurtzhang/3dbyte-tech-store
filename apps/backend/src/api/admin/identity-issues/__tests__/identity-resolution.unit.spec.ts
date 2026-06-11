import {
  selectCanonicalCustomer,
  type MergeCandidate,
} from "../identity-resolution";

const candidate = (
  overrides: Partial<MergeCandidate> & Pick<MergeCandidate, "id">,
): MergeCandidate => ({
  id: overrides.id,
  email: overrides.email || "owner@example.com",
  first_name: overrides.first_name || null,
  last_name: overrides.last_name || null,
  phone: overrides.phone || null,
  created_at: overrides.created_at || "2026-06-02T00:00:00.000Z",
  provider_count: overrides.provider_count || 0,
  activity_count: overrides.activity_count || 0,
});

describe("selectCanonicalCustomer", () => {
  it("prefers the customer with more usable login providers", () => {
    const selected = selectCanonicalCustomer([
      candidate({ id: "cus_old", created_at: "2026-06-01", provider_count: 1 }),
      candidate({
        id: "cus_multi_provider",
        created_at: "2026-06-03",
        provider_count: 2,
      }),
    ]);

    expect(selected.id).toBe("cus_multi_provider");
  });

  it("uses account activity and then oldest creation date as tie breakers", () => {
    const active = selectCanonicalCustomer([
      candidate({ id: "cus_old", created_at: "2026-06-01", provider_count: 1 }),
      candidate({
        id: "cus_active",
        created_at: "2026-06-03",
        provider_count: 1,
        activity_count: 3,
      }),
    ]);
    const oldest = selectCanonicalCustomer([
      candidate({ id: "cus_new", created_at: "2026-06-03", provider_count: 1 }),
      candidate({ id: "cus_old", created_at: "2026-06-01", provider_count: 1 }),
    ]);

    expect(active.id).toBe("cus_active");
    expect(oldest.id).toBe("cus_old");
  });
});
