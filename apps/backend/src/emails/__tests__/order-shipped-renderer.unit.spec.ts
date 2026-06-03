import { renderOrderShippedEmail } from '../renderers/order-shipped'

const baseOrder = {
  created_at: '2026-05-05T08:00:00.000Z',
  currency_code: 'aud',
  custom_display_id: '3DBO-TEST-123',
  display_id: 1001,
  email: 'test@demo.com',
  id: 'order_123',
  items: [
    {
      id: 'item_123',
      product_title: 'Polymaker PolyLite PETG',
      quantity: 1,
      total: 29.95,
      variant_title: 'Black',
    },
  ],
  shipping_address: {
    first_name: 'Ada',
    last_name: 'Lovelace',
    address_1: '1 Test Street',
    city: 'Hobart',
    province: 'TAS',
    postal_code: '7000',
    country_code: 'au',
  },
  shipping_methods: [{ name: 'Manual Launch Gate' }],
}

describe('renderOrderShippedEmail', () => {
  it('renders tracking details for a shipped order', async () => {
    const rendered = await renderOrderShippedEmail({
      order: baseOrder,
      shipment: {
        id: 'ful_123',
        data: {
          carrier_name: 'Manual',
          tracking_number: 'STG-3DBO-TEST-123',
          tracking_url: 'https://tracking.example/STG-3DBO-TEST-123',
        },
        labels: [],
        shipped_at: '2026-06-03T08:00:00.000Z',
      },
      store: {
        name: '3D Byte Tech',
      },
    })

    expect(rendered.subject).toBe('Your 3D Byte Tech order 3DBO-TEST-123 has shipped')
    expect(rendered.text).toContain('Tracking number: STG-3DBO-TEST-123')
    expect(rendered.text).toContain('Track shipment: https://tracking.example/STG-3DBO-TEST-123')
    expect(rendered.text).toContain('Carrier: Manual')
    expect(rendered.html).toContain('Polymaker PolyLite PETG')
    expect(rendered.html).toContain('STG-3DBO-TEST-123')
  })

  it('falls back to fulfillment labels when provider data has no tracking number', async () => {
    const rendered = await renderOrderShippedEmail({
      order: baseOrder,
      shipment: {
        id: 'ful_123',
        data: {},
        labels: [
          {
            id: 'fl_123',
            tracking_number: 'LBL-123',
            tracking_url: 'https://tracking.example/LBL-123',
          },
        ],
      },
      store: {
        name: '3D Byte Tech',
      },
    })

    expect(rendered.text).toContain('Tracking number: LBL-123')
    expect(rendered.text).toContain('Track shipment: https://tracking.example/LBL-123')
  })
})
