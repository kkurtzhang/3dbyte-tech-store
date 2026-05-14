import {
  buildWaitlistCsv,
  buildWaitlistDemand,
  filterWaitlistEntries,
  getMarkNotifiedPayload,
} from "../admin"

const entries = [
  {
    id: "wait_1",
    customer_email: "ava@example.com",
    customer_id: null,
    product_id: "prod_1",
    product_variant_id: "variant_1",
    product_handle: "test-product",
    product_title: "Test Product",
    variant_title: "Black - 180",
    notified: false,
    notification_count: 0,
    created_at: "2026-05-13T00:00:00.000Z",
  },
  {
    id: "wait_2",
    customer_email: "bea@example.com",
    customer_id: "cus_2",
    product_id: "prod_1",
    product_variant_id: "variant_1",
    product_handle: "test-product",
    product_title: "Test Product",
    variant_title: "Black - 180",
    notified: true,
    notification_count: 2,
    created_at: "2026-05-12T00:00:00.000Z",
  },
  {
    id: "wait_3",
    customer_email: "cam@example.com",
    customer_id: null,
    product_id: "prod_2",
    product_variant_id: null,
    product_handle: "plain-product",
    product_title: "Plain Product",
    variant_title: null,
    notified: false,
    notification_count: 0,
    created_at: "2026-05-11T00:00:00.000Z",
  },
]

describe("waitlist admin helpers", () => {
  it("builds product demand rows with queued and notified counts", () => {
    expect(buildWaitlistDemand(entries)).toEqual([
      expect.objectContaining({
        product_id: "prod_1",
        product_variant_id: "variant_1",
        product_title: "Test Product",
        variant_title: "Black - 180",
        queued_count: 1,
        notified_count: 1,
        total_count: 2,
      }),
      expect.objectContaining({
        product_id: "prod_2",
        product_variant_id: null,
        queued_count: 1,
        notified_count: 0,
        total_count: 1,
      }),
    ])
  })

  it("filters queued subscribers by status and search text", () => {
    expect(
      filterWaitlistEntries(entries, {
        q: "ava",
        status: "queued",
      })
    ).toEqual([entries[0]])
  })

  it("exports waitlist rows as escaped CSV", () => {
    expect(buildWaitlistCsv([entries[0]])).toBe(
      [
        "id,email,customer_id,product_id,product_variant_id,product_title,variant_title,product_handle,notified,notification_count,created_at,last_notified_at",
        "wait_1,ava@example.com,,prod_1,variant_1,Test Product,Black - 180,test-product,false,0,2026-05-13T00:00:00.000Z,",
      ].join("\n")
    )
  })

  it("builds mark-notified updates without resetting original notified_at", () => {
    expect(
      getMarkNotifiedPayload(
        {
          id: "wait_1",
          notified_at: "2026-05-12T00:00:00.000Z",
          notification_count: 2,
        },
        new Date("2026-05-13T00:00:00.000Z")
      )
    ).toEqual({
      id: "wait_1",
      notified: true,
      notified_at: "2026-05-12T00:00:00.000Z",
      last_notified_at: "2026-05-13T00:00:00.000Z",
      notification_count: 3,
    })
  })
})
