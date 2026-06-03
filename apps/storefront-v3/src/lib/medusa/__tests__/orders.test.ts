import { getOrder, listOrders, ORDER_TRACKING_FIELDS } from '../orders'
import { sdk } from '../client'

jest.mock('../client', () => ({
  sdk: {
    store: {
      order: {
        list: jest.fn(),
        retrieve: jest.fn(),
      },
    },
  },
}))

describe('medusa order helpers', () => {
  it('requests preorder variant data when retrieving orders', async () => {
    ;(sdk.store.order.retrieve as jest.Mock).mockResolvedValue({
      order: { id: 'order_1' },
    })

    await getOrder('order_1')

    expect(sdk.store.order.retrieve).toHaveBeenCalledWith(
      'order_1',
      {
        fields: ORDER_TRACKING_FIELDS.join(','),
      },
      undefined
    )
  })

  it('passes customer auth headers when retrieving account orders', async () => {
    ;(sdk.store.order.retrieve as jest.Mock).mockResolvedValue({
      order: { id: 'order_1' },
    })

    await getOrder('order_1', ORDER_TRACKING_FIELDS, {
      Authorization: 'Bearer customer-token',
    })

    expect(sdk.store.order.retrieve).toHaveBeenCalledWith(
      'order_1',
      {
        fields: ORDER_TRACKING_FIELDS.join(','),
      },
      {
        Authorization: 'Bearer customer-token',
      }
    )
  })

  it('passes customer auth headers when listing account orders', async () => {
    ;(sdk.store.order.list as jest.Mock).mockResolvedValue({
      orders: [{ id: 'order_1' }],
      count: 1,
    })

    await listOrders(
      {
        limit: 20,
        fields: ORDER_TRACKING_FIELDS,
      },
      {
        Authorization: 'Bearer customer-token',
      }
    )

    expect(sdk.store.order.list).toHaveBeenCalledWith(
      {
        limit: 20,
        offset: 0,
        fields: ORDER_TRACKING_FIELDS.join(','),
      },
      {
        Authorization: 'Bearer customer-token',
      }
    )
  })
})
