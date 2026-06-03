import { render, screen } from '@testing-library/react'

import OrdersPage from '../page'

const mockGetSessionAction = jest.fn()
const mockGetCustomerAuthHeaders = jest.fn()
const mockListOrders = jest.fn()

jest.mock('@/app/actions/auth', () => ({
  getCustomerAuthHeaders: () => mockGetCustomerAuthHeaders(),
  getSessionAction: () => mockGetSessionAction(),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

jest.mock('lucide-react', () => ({
  ChevronRight: () => <span />,
  Package: () => <span />,
}))

jest.mock('@/lib/medusa/orders', () => ({
  ORDER_TRACKING_FIELDS: ['id', 'items', 'fulfillment_status'],
  listOrders: (...args: unknown[]) => mockListOrders(...args),
}))

describe('account orders page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSessionAction.mockResolvedValue({ success: true })
    mockGetCustomerAuthHeaders.mockResolvedValue({
      Authorization: 'Bearer customer-token',
    })
  })

  it('uses the shared lifecycle status for mixed preorder orders', async () => {
    mockListOrders.mockResolvedValue({
      orders: [
        {
          id: 'order_01KQP3PCJVS04HXFWFYYN4ESEY',
          status: 'pending',
          payment_status: 'authorized',
          fulfillment_status: 'partially_shipped',
          created_at: '2026-05-03T00:00:00.000Z',
          total: 261.11,
          currency_code: 'aud',
          items: [
            {
              id: 'item_ready',
              title: 'Ready Product',
              quantity: 1,
              variant: { id: 'variant_ready' },
            },
            {
              id: 'item_preorder',
              title: 'Pre-order Product',
              quantity: 1,
              variant: {
                id: 'variant_preorder',
                preorder_variant: {
                  status: 'enabled',
                  available_date: '2999-01-01T00:00:00.000Z',
                },
              },
            },
          ],
        },
      ],
      count: 1,
    })

    render(await OrdersPage())

    expect(mockListOrders).toHaveBeenCalledWith(
      {
        limit: 20,
        fields: ['id', 'items', 'fulfillment_status'],
      },
      {
        Authorization: 'Bearer customer-token',
      }
    )
    expect(screen.getByText('Partially shipped')).toBeInTheDocument()
    expect(screen.getByText(/ready-to-ship and pre-order items/i)).toBeInTheDocument()
    expect(screen.getByText('A$261.11')).toBeInTheDocument()
  })
})
