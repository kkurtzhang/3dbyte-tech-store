'use client'

import React, { useState, useTransition } from 'react'

import { HttpTypes } from '@medusajs/types'
import { Button } from '@modules/common/components/button'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from '@modules/common/components/dialog'
import { cancelOrder } from '@lib/data/orders'
import { toast } from '@modules/common/components/toast'

type CancelOrderDialogProps = {
  order: HttpTypes.StoreOrder & { status: string }
  onCancelled?: () => void
}

const CancelOrderDialog: React.FC<CancelOrderDialogProps> = ({
  order,
  onCancelled,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Check if order can be cancelled
  const canCancel =
    order.status !== 'canceled' &&
    order.fulfillment_status !== 'shipped' &&
    order.fulfillment_status !== 'delivered' &&
    order.fulfillment_status !== 'partially_shipped'

  const handleCancel = () => {
    setError(null)
    startTransition(async () => {
      try {
        const result = await cancelOrder(order.id, reason || undefined)

        toast('success', 'Order cancelled successfully')

        setIsOpen(false)
        onCancelled?.()
      } catch (err: any) {
        const errorMessage =
          err.message || 'Failed to cancel order. Please try again.'
        setError(errorMessage)
        toast('error', 'Failed to cancel order')
      }
    })
  }

  if (!canCancel) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="tonal" className="w-full sm:w-auto">
          Cancel Order
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <h2 className="text-xl font-semibold">Cancel Order</h2>
          <DialogClose />
        </DialogHeader>

        <DialogBody className="p-5">
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              Are you sure you want to cancel order #{order.display_id}?
            </p>

            {order.fulfillment_status === 'fulfilled' && (
              <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
                <p>
                  This order has been fulfilled but not yet shipped. Cancellation
                  will stop the shipment process and refund your payment.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label htmlFor="reason" className="text-sm font-medium">
                Reason for cancellation (optional)
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please let us know why you're cancelling..."
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button variant="secondary" className="w-full sm:w-auto">
                Keep Order
              </Button>
            </DialogClose>
            <Button
              variant="danger"
              onClick={handleCancel}
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              {isPending ? 'Cancelling...' : 'Cancel Order'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CancelOrderDialog
