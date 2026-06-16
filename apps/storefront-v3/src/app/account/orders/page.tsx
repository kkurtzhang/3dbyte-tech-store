import { Metadata } from 'next'
import { getCustomerAuthHeaders, getSessionAction } from '@/app/actions/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Package, ChevronLeft, ChevronRight } from 'lucide-react'
import { listOrders, ORDER_TRACKING_FIELDS } from '@/lib/medusa/orders'
import type { MedusaOrder } from '@/lib/medusa/types'
import { getOrderLifecycle, getOrderLifecycleToneClass } from '@/features/order/lib/order-lifecycle'
import { cn } from '@/lib/utils'

const ORDERS_PER_PAGE = 10

export const metadata: Metadata = {
  title: 'Orders',
  description: 'View your order history and track shipments',
}

type OrdersPageProps = {
  searchParams?: Promise<{
    page?: string | string[]
  }>
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function parsePageParam(value: string | string[] | undefined) {
  const page = Number.parseInt(getSingleParam(value) || '1', 10)

  return Number.isFinite(page) && page > 0 ? page : 1
}

function buildOrdersPageHref(page: number) {
  return page > 1 ? `/account/orders?page=${page}` : '/account/orders'
}

async function getOrders(page: number): Promise<{ orders: MedusaOrder[]; count: number }> {
  try {
    const authHeaders = await getCustomerAuthHeaders()
    if (!authHeaders) return { orders: [], count: 0 }

    const offset = (page - 1) * ORDERS_PER_PAGE

    const { orders, count } = await listOrders(
      {
        limit: ORDERS_PER_PAGE,
        ...(offset > 0 ? { offset } : {}),
        fields: ORDER_TRACKING_FIELDS,
      },
      authHeaders
    )

    return { orders, count }
  } catch (error) {
    console.error('Failed to fetch orders:', error)
    return { orders: [], count: 0 }
  }
}

function formatPrice(amount: number | null | undefined, currencyCode: string | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode || 'usd',
  }).format(amount || 0)
}

export default async function OrdersPage({ searchParams }: OrdersPageProps = {}) {
  const session = await getSessionAction()

  if (!session.success) {
    redirect('/sign-in')
  }

  const params = await searchParams
  const page = parsePageParam(params?.page)
  const { orders, count } = await getOrders(page)
  const totalPages = Math.ceil(count / ORDERS_PER_PAGE)

  if (count > 0 && page > totalPages) {
    return redirect(buildOrdersPageHref(totalPages))
  }

  const firstVisibleOrder = count > 0 ? (page - 1) * ORDERS_PER_PAGE + 1 : 0
  const lastVisibleOrder = Math.min(page * ORDERS_PER_PAGE, count)

  if (count === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-mono text-2xl font-semibold uppercase tracking-wider">Orders</h1>
          <p className="text-sm text-muted-foreground mt-2">View and track your order history</p>
        </div>

        <div className="rounded-lg border bg-card p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-mono font-semibold uppercase tracking-wider mb-2">No Orders Yet</h3>
          <p className="text-sm text-muted-foreground mb-6">You haven't placed any orders yet.</p>
          <Link href="/">
            <Button className="font-mono uppercase tracking-widest">Start Shopping</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-semibold uppercase tracking-wider">Orders</h1>
        <p className="text-sm text-muted-foreground mt-2">View and track your order history</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {firstVisibleOrder}-{lastVisibleOrder} of {count} orders
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left p-4 font-mono text-sm font-semibold uppercase tracking-wider">
                  Order
                </th>
                <th className="text-left p-4 font-mono text-sm font-semibold uppercase tracking-wider hidden md:table-cell">
                  Date
                </th>
                <th className="text-left p-4 font-mono text-sm font-semibold uppercase tracking-wider hidden sm:table-cell">
                  Status
                </th>
                <th className="text-right p-4 font-mono text-sm font-semibold uppercase tracking-wider">
                  Total
                </th>
                <th className="text-right p-4 font-mono text-sm font-semibold uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map(order => {
                const lifecycle = getOrderLifecycle(order)

                return (
                  <tr key={order.id} className="hover:bg-muted/50 transition-colors">
                    <td className="p-4">
                      <Link
                        href={`/account/orders/${order.id}`}
                        className="font-mono text-sm hover:text-primary transition-colors"
                      >
                        #{order.id.slice(-8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <Badge
                        variant="outline"
                        className={cn(
                          'font-mono text-xs uppercase tracking-wider',
                          getOrderLifecycleToneClass(lifecycle.tone)
                        )}
                      >
                        {lifecycle.label}
                      </Badge>
                      {lifecycle.groups.length > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {lifecycle.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-mono text-sm">
                        {formatPrice(order.total, order.currency_code)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/account/orders/${order.id}`}>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 ? (
        <nav
          className="flex flex-wrap items-center justify-center gap-2"
          aria-label="Orders pagination"
        >
          {page > 1 ? (
            <Link
              href={buildOrdersPageHref(page - 1)}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 font-mono text-sm uppercase tracking-wider transition-colors hover:border-primary/50 hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
          ) : null}

          {Array.from({ length: totalPages }).map((_, index) => {
            const pageNumber = index + 1
            const isCurrent = pageNumber === page

            return (
              <Link
                key={pageNumber}
                href={buildOrdersPageHref(pageNumber)}
                className={cn(
                  'inline-flex h-10 w-10 items-center justify-center rounded-md border font-mono text-sm transition-colors',
                  isCurrent
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:border-primary/50 hover:bg-accent'
                )}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {pageNumber}
              </Link>
            )
          })}

          {page < totalPages ? (
            <Link
              href={buildOrdersPageHref(page + 1)}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 font-mono text-sm uppercase tracking-wider transition-colors hover:border-primary/50 hover:bg-accent"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  )
}
