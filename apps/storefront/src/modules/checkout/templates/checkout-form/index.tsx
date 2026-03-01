import { listCartShippingMethods } from '@lib/data/fulfillment'
import { listCartPaymentMethods } from '@lib/data/payment'
import { HttpTypes } from '@medusajs/types'
import Addresses from '@modules/checkout/components/addresses'
import Payment from '@modules/checkout/components/payment'
import Shipping from '@modules/checkout/components/shipping'
import { Box } from '@modules/common/components/box'
import { Heading } from '@modules/common/components/heading'
import { Text } from '@modules/common/components/text'

export default async function CheckoutForm({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) {
  if (!cart) {
    return null
  }

  const shippingMethods = await listCartShippingMethods(cart.id)
  const paymentMethods = await listCartPaymentMethods(cart.region?.id ?? '')

  if (!shippingMethods || !paymentMethods) {
    return null
  }

  return (
    <Box className="grid w-full grid-cols-1 gap-y-4">
      {!customer && (
        <Box className="bg-primary p-5">
          <Heading as="h3" className="text-lg text-basic-primary">
            Checkout as Guest
          </Heading>
          <Text className="text-sm text-secondary mt-1">
            No account required. Provide your email (optional) to track your order
            and receive updates.
          </Text>
        </Box>
      )}
      <Addresses cart={cart} customer={customer} />
      <Shipping cart={cart} availableShippingMethods={shippingMethods} />
      <Payment cart={cart} availablePaymentMethods={paymentMethods} />
    </Box>
  )
}
