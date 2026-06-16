import { render, screen, within } from '@testing-library/react'

import OrdersPage from '../page'

const mockGetSessionAction = jest.fn()
const mockGetCustomerAuthHeaders = jest.fn()
const mockListOrders = jest.fn()
const mockRedirect = jest.fn()

jest.mock('@/app/actions/auth', () => ({
  getCustomerAuthHeaders: () => mockGetCustomerAuthHeaders(),
  getSessionAction: () => mockGetSessionAction(),
}))

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: React.ReactNode
    href: string
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

jest.mock('lucide-react', () => ({
  ChevronLeft: () => <span />,
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
        limit: 10,
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

  it('paginates account order history from the page query string', async () => {
    mockListOrders.mockResolvedValue({
      orders: Array.from({ length: 10 }, (_, index) => ({
        id: `order_01KQP3PCJVS04HXFWFYYN4ES${index}`,
        status: 'pending',
        payment_status: 'authorized',
        fulfillment_status: 'not_fulfilled',
        created_at: '2026-05-03T00:00:00.000Z',
        total: 100 + index,
        currency_code: 'aud',
        items: [],
      })),
      count: 25,
    })

    render(
      await OrdersPage({
        searchParams: Promise.resolve({ page: '2' }),
      })
    )

    expect(mockListOrders).toHaveBeenCalledWith(
      {
        limit: 10,
        offset: 10,
        fields: ['id', 'items', 'fulfillment_status'],
      },
      {
        Authorization: 'Bearer customer-token',
      }
    )
    expect(screen.getByText('Showing 11-20 of 25 orders')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /previous/i })).toHaveAttribute(
      'href',
      '/account/orders'
    )
    expect(screen.getByRole('link', { name: /next/i })).toHaveAttribute(
      'href',
      '/account/orders?page=3'
    )
    const pagination = screen.getByRole('navigation', { name: /orders pagination/i })

    expect(within(pagination).getByRole('link', { name: '2' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })

  it('redirects out-of-range order pages to the last available page', async () => {
    mockListOrders.mockResolvedValue({
      orders: [],
      count: 25,
    })

    await OrdersPage({
      searchParams: Promise.resolve({ page: '99' }),
    })

    expect(mockRedirect).toHaveBeenCalledWith('/account/orders?page=3')
  })
})
