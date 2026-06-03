import orderShippedHandler from '../order-shipped'

jest.mock('../../../emails/renderers/order-shipped', () => ({
  renderOrderShippedEmail: jest.fn().mockResolvedValue({
    html: '<p>Shipment email</p>',
    subject: 'Your 3D Byte Tech order #1001 has shipped',
    text: 'Tracking number: STG-123',
  }),
}))

const baseShipment = {
  id: 'ful_123',
  data: {
    carrier_name: 'Manual',
    tracking_number: 'STG-123',
    tracking_url: 'https://tracking.example/STG-123',
  },
  labels: [],
  shipped_at: '2026-06-03T08:00:00.000Z',
}

const baseOrder = {
  created_at: '2026-05-05T08:00:00.000Z',
  currency_code: 'aud',
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
  fulfillments: [baseShipment],
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

const createArgs = ({
  linkRows = [{ order_id: 'order_123', fulfillment_id: 'ful_123' }],
  order = baseOrder,
  noNotification = false,
}: {
  linkRows?: Array<Record<string, string>>
  order?: typeof baseOrder | null
  noNotification?: boolean
} = {}) => {
  const createNotifications = jest.fn().mockResolvedValue([{ id: 'noti_123' }])
  const linkService = {
    list: jest.fn().mockResolvedValue(linkRows),
  }
  const remoteLink = {
    getLinkModule: jest.fn().mockReturnValue(linkService),
  }
  const graph = jest
    .fn()
    .mockResolvedValueOnce({ data: [{ name: '3D Byte Tech' }] })
    .mockResolvedValueOnce({ data: order ? [order] : [] })
  const resolve = jest.fn((key: string) => {
    if (key === 'query') {
      return { graph }
    }
    if (key === 'notification') {
      return { createNotifications }
    }
    if (key === 'link') {
      return remoteLink
    }
    if (key === 'logger') {
      return {
        warn: jest.fn(),
        error: jest.fn(),
      }
    }
    throw new Error(`Unexpected dependency ${key}`)
  })

  return {
    args: {
      event: { data: { id: 'ful_123', no_notification: noNotification } },
      container: {
        resolve,
      },
    },
    createNotifications,
    graph,
    linkService,
    remoteLink,
    resolve,
  }
}

describe('orderShippedHandler', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.NODE_ENV = 'development'
    process.env.ORDER_EMAILS_ENABLED = 'true'
    delete process.env.RESEND_API_KEY
    delete process.env.RESEND_FROM_EMAIL
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('renders and sends a shipment notification for shipped orders', async () => {
    const { args, createNotifications, graph, linkService, remoteLink } = createArgs()

    await orderShippedHandler(args as never)

    expect(remoteLink.getLinkModule).toHaveBeenCalledWith(
      'order',
      'order_id',
      'fulfillment',
      'fulfillment_id'
    )
    expect(linkService.list).toHaveBeenCalledWith(
      { fulfillment_id: 'ful_123' },
      { select: ['order_id', 'fulfillment_id'], take: 1 }
    )
    expect(graph).toHaveBeenCalledTimes(2)
    expect(graph).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        filters: { id: 'order_123' },
        fields: expect.arrayContaining([
          'email',
          'fulfillments.id',
          'fulfillments.data',
          'fulfillments.labels.tracking_number',
        ]),
      })
    )
    expect(createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'email',
        idempotency_key: 'order-shipped/order_123/ful_123',
        template: 'order-shipped',
        to: 'test@demo.com',
        data: expect.objectContaining({
          email_metadata: {
            entity_id: 'order_123',
            event: 'shipment.created',
            fulfillment_id: 'ful_123',
            idempotency_key: 'order-shipped/order_123/ful_123',
          },
        }),
      })
    )
  })

  it('does not send when the shipment event disables notification', async () => {
    const { args, createNotifications, resolve } = createArgs({
      noNotification: true,
    })

    await orderShippedHandler(args as never)

    expect(resolve).not.toHaveBeenCalledWith('query')
    expect(createNotifications).not.toHaveBeenCalled()
  })

  it('skips when the fulfillment is not linked to an order', async () => {
    const { args, createNotifications, graph } = createArgs({ linkRows: [] })

    await orderShippedHandler(args as never)

    expect(graph).not.toHaveBeenCalled()
    expect(createNotifications).not.toHaveBeenCalled()
  })
})
