const mockGraph = jest.fn()
const mockFetch = jest.fn()

global.fetch = mockFetch as unknown as typeof fetch

import { POST } from '../route'

const amount = (value: number) => ({
  toJSON: () => value,
  valueOf: () => value,
})

describe('POST /store/orders/lookup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_safe'
  })

  it('returns an email-verified order by custom display id', async () => {
    mockGraph.mockResolvedValue({
      data: [
        {
          id: 'order_123',
          custom_display_id: '3DB-1777978800123',
          email: 'customer@example.com',
        },
      ],
    })

    const req = {
      body: {
        email: ' CUSTOMER@example.com ',
        reference: ' 3DB-1777978800123 ',
      },
      scope: {
        resolve: jest.fn().mockReturnValue({ graph: mockGraph }),
      },
    }
    const res = {
      json: jest.fn(),
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
    }

    await POST(req as never, res as never)

    expect(mockGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'order',
        fields: expect.arrayContaining([
          'item_total',
          'items.quantity',
          'items.unit_price',
          'items.total',
          'items.variant.preorder_variant.available_date',
          'fulfillments.id',
          'fulfillments.labels.tracking_number',
          'shipping_address.city',
          'shipping_methods.name',
        ]),
        filters: {
          custom_display_id: '3DB-1777978800123',
        },
      })
    )
    const requestedFields = mockGraph.mock.calls[0]?.[0].fields
    expect(requestedFields).not.toContain('fulfillments.data')
    expect(requestedFields).not.toContain('billing_address.address_1')
    expect(res.json).toHaveBeenCalledWith({
      order: expect.objectContaining({
        id: 'order_123',
        custom_display_id: '3DB-1777978800123',
      }),
    })
    expect(res.json.mock.calls[0]?.[0].order).not.toHaveProperty('email')
  })

  it('normalizes graph totals so custom reference lookups match customer-facing order details', async () => {
    mockGraph.mockResolvedValue({
      data: [
        {
          id: 'order_123',
          custom_display_id: '3DBO-NSX9-UUTPSK',
          email: 'customer@example.com',
          currency_code: 'aud',
          subtotal: amount(383.39),
          item_subtotal: amount(356.89),
          item_total: amount(392.579),
          shipping_subtotal: amount(26.5),
          shipping_total: amount(29.15),
          tax_total: amount(38.339),
          total: amount(421.729),
          items: [
            {
              id: 'item_1',
              title: 'LDO Colony Clacker Door Kit',
              quantity: 3,
              unit_price: amount(48.03),
              subtotal: amount(144.09),
              total: amount(158.499),
            },
          ],
        },
      ],
    })

    const req = {
      body: {
        email: 'customer@example.com',
        reference: '3DBO-NSX9-UUTPSK',
      },
      scope: {
        resolve: jest.fn().mockReturnValue({ graph: mockGraph }),
      },
    }
    const res = {
      json: jest.fn(),
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
    }

    await POST(req as never, res as never)

    const payload = res.json.mock.calls[0]?.[0]

    expect(payload.order).toEqual(
      expect.objectContaining({
        id: 'order_123',
        item_total: 356.89,
        shipping_total: 26.5,
        total: 383.39,
      })
    )
    expect(payload.order.subtotal).toBeCloseTo(348.5364, 4)
    expect(payload.order.item_subtotal).toBeCloseTo(324.4455, 4)
    expect(payload.order.shipping_subtotal).toBeCloseTo(24.0909, 4)
    expect(payload.order.tax_total).toBeCloseTo(34.8536, 4)
    expect(payload.order.items[0]).toEqual(
      expect.objectContaining({
        total: 144.09,
      })
    )
    expect(payload.order.items[0].subtotal).toBeCloseTo(130.9909, 4)
  })

  it('keeps derived shipped status when tax-inclusive totals are normalized', async () => {
    mockGraph.mockResolvedValue({
      data: [
        {
          id: 'order_123',
          custom_display_id: '3DBO-AKK7-5KYYDE',
          email: 'customer@example.com',
          currency_code: 'aud',
          fulfillment_status: 'not_fulfilled',
          subtotal: amount(28.95),
          item_subtotal: amount(18.95),
          item_total: amount(20.845),
          shipping_subtotal: amount(10),
          shipping_total: amount(11),
          tax_total: amount(2.895),
          total: amount(31.845),
          fulfillments: [
            {
              id: 'ful_1',
              shipped_at: '2026-06-03T01:00:00.000Z',
              labels: [
                {
                  tracking_number: 'STG-3DBO-AKK7-5KYYDE',
                  tracking_url: '#',
                },
              ],
            },
          ],
        },
      ],
    })

    const req = {
      body: {
        email: 'customer@example.com',
        reference: '3DBO-AKK7-5KYYDE',
      },
      scope: {
        resolve: jest.fn().mockReturnValue({ graph: mockGraph }),
      },
    }
    const res = {
      json: jest.fn(),
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
    }

    await POST(req as never, res as never)

    const payload = res.json.mock.calls[0]?.[0]

    expect(payload.order).toEqual(
      expect.objectContaining({
        fulfillment_status: 'shipped',
        total: 28.95,
        fulfillments: expect.arrayContaining([
          expect.objectContaining({
            labels: expect.arrayContaining([
              expect.objectContaining({
                tracking_number: 'STG-3DBO-AKK7-5KYYDE',
              }),
            ]),
          }),
        ]),
      })
    )
  })

  it('derives shipped status from returned fulfillments when lookup status is stale', async () => {
    mockGraph.mockResolvedValue({
      data: [
        {
          id: 'order_123',
          custom_display_id: '3DBO-AKK7-5KYYDE',
          email: 'customer@example.com',
          fulfillment_status: 'not_fulfilled',
          fulfillments: [
            {
              id: 'ful_1',
              shipped_at: '2026-06-03T01:00:00.000Z',
              shipped_at: '2026-06-03T01:00:00.000Z',
            },
          ],
        },
      ],
    })

    const req = {
      body: {
        email: 'customer@example.com',
        reference: '3DBO-AKK7-5KYYDE',
      },
      scope: {
        resolve: jest.fn().mockReturnValue({ graph: mockGraph }),
      },
    }
    const res = {
      json: jest.fn(),
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
    }

    await POST(req as never, res as never)

    expect(res.json).toHaveBeenCalledWith({
      order: expect.objectContaining({
        fulfillment_status: 'shipped',
        fulfillments: expect.arrayContaining([
          expect.objectContaining({
            shipped_at: '2026-06-03T01:00:00.000Z',
          }),
        ]),
      }),
    })
  })

  it('derives a safe payment summary inside the verified lookup boundary', async () => {
    mockGraph.mockResolvedValue({
      data: [
        {
          id: 'order_123',
          custom_display_id: '3DBO-AKK7-5KYYDE',
          email: 'customer@example.com',
          payment_collections: [
            {
              payments: [
                {
                  provider_id: 'pp_stripe_stripe',
                  data: {
                    ['client' + '_secret']: 'redacted-test-value',
                    payment_method: 'pm_sensitive',
                  },
                },
              ],
            },
          ],
        },
      ],
    })
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'pm_sensitive',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 7,
          exp_year: 2030,
        },
      }),
    })

    const req = {
      body: {
        email: 'customer@example.com',
        reference: '3DBO-AKK7-5KYYDE',
      },
      scope: {
        resolve: jest.fn().mockReturnValue({ graph: mockGraph }),
      },
    }
    const res = {
      json: jest.fn(),
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
    }

    await POST(req as never, res as never)

    const graphRequest = mockGraph.mock.calls[0]?.[0]
    const payload = res.json.mock.calls[0]?.[0]

    expect(graphRequest.fields).toContain('payment_collections.payments.data')
    expect(payload.order).not.toHaveProperty('payment_collections')
    expect(payload.order.tracking_payment_method).toEqual({
      type: 'card',
      brand: 'visa',
      last4: '4242',
    })
    expect(JSON.stringify(payload)).not.toContain('pm_sensitive')
    expect(JSON.stringify(payload)).not.toContain('exp_month')
  })

  it('rejects lookup when the email does not match', async () => {
    mockGraph.mockResolvedValue({
      data: [
        {
          id: 'order_123',
          custom_display_id: '3DB-1777978800123',
          email: 'owner@example.com',
        },
      ],
    })

    const req = {
      body: {
        email: 'other@example.com',
        reference: '3DB-1777978800123',
      },
      scope: {
        resolve: jest.fn().mockReturnValue({ graph: mockGraph }),
      },
    }
    const res = {
      json: jest.fn(),
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
    }

    await POST(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ order: null })
  })

  it('requires both reference and email', async () => {
    const req = {
      body: {
        email: '',
        reference: '',
      },
      scope: {
        resolve: jest.fn().mockReturnValue({ graph: mockGraph }),
      },
    }
    const res = {
      json: jest.fn(),
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
    }

    await POST(req as never, res as never)

    expect(mockGraph).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ order: null })
  })
})
