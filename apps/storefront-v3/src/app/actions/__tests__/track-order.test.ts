const mockFetch = jest.fn()

global.fetch = mockFetch as unknown as typeof fetch

jest.mock('@/lib/medusa/client', () => ({
  sdk: {
    store: {
      order: {
        retrieve: jest.fn(),
      },
    },
  },
}))

import { lookupOrder } from '../track-order'

describe('track order action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL = 'http://localhost:9000'
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = 'pk_test'
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        order: { id: 'order_1', custom_display_id: '3DB-123' },
      }),
    })
  })

  it('looks up internal order IDs through the POST-only backend boundary', async () => {
    await expect(lookupOrder(' order_1 ', ' CUSTOMER@example.com ')).resolves.toMatchObject({
      success: true,
      order: {
        id: 'order_1',
      },
    })

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      new URL('http://localhost:9000/store/orders/lookup'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          reference: 'order_1',
          email: 'customer@example.com',
        }),
        cache: 'no-store',
      })
    )
  })

  it('adds the verified safe card payment method to the tracked order', async () => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        order: {
          id: 'order_1',
          tracking_payment_method: {
            type: 'card',
            brand: 'visa',
            last4: '4242',
          },
        },
      }),
    })

    await expect(lookupOrder('order_1', 'customer@example.com')).resolves.toMatchObject({
      success: true,
      order: {
        tracking_payment_method: {
          type: 'card',
          brand: 'visa',
          last4: '4242',
        },
      },
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('looks up custom display ids through the backend lookup endpoint', async () => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        order: {
          id: 'order_123',
          custom_display_id: '3DB-1777978800123',
        },
      }),
    })

    await expect(
      lookupOrder(' 3DB-1777978800123 ', ' CUSTOMER@example.com ')
    ).resolves.toMatchObject({
      success: true,
      order: {
        id: 'order_123',
        custom_display_id: '3DB-1777978800123',
      },
    })

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      new URL('http://localhost:9000/store/orders/lookup'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          reference: '3DB-1777978800123',
          email: 'customer@example.com',
        }),
        cache: 'no-store',
        headers: {
          'content-type': 'application/json',
          'x-publishable-api-key': 'pk_test',
        },
      })
    )
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
