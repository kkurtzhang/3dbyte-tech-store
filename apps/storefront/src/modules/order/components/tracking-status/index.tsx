import { CheckCircle2, Circle, Truck, Package, Clock } from 'lucide-react'
import { Box } from '@modules/common/components/box'
import { Text } from '@modules/common/components/text'

type TrackingStatusProps = {
  trackingStatus: string
  orderStatus: string
  fulfillmentStatus: string
}

const statusSteps = [
  {
    key: 'processing',
    label: 'Processing',
    icon: Clock,
  },
  {
    key: 'shipped',
    label: 'Shipped',
    icon: Package,
  },
  {
    key: 'delivered',
    label: 'Delivered',
    icon: CheckCircle2,
  },
]

const TrackingStatus = ({
  trackingStatus,
  orderStatus,
  fulfillmentStatus,
}: TrackingStatusProps) => {
  const getCurrentStepIndex = () => {
    switch (trackingStatus) {
      case 'processing':
        return 0
      case 'shipped':
        return 1
      case 'delivered':
        return 2
      case 'canceled':
        return -1
      default:
        return 0
    }
  }

  const currentStep = getCurrentStepIndex()

  return (
    <Box className="rounded-lg bg-primary p-6">
      <Text size="large" className="mb-6">
        Order Status
      </Text>
      <Box className="flex items-start justify-between">
        {statusSteps.map((step, index) => {
          const isActive = index <= currentStep
          const Icon = step.icon

          return (
            <Box
              key={step.key}
              className="flex flex-1 flex-col items-center"
            >
              <Box className="relative flex flex-col items-center">
                {/* Icon */}
                <Box
                  className={`mb-2 rounded-full p-2 ${
                    isActive
                      ? 'bg-ui-fg-base text-white'
                      : 'bg-ui-fg-subtle text-ui-fg-muted'
                  }`}
                >
                  {index === currentStep && isActive ? (
                    <Truck size={24} />
                  ) : (
                    <Icon size={24} />
                  )}
                </Box>

                {/* Label */}
                <Text
                  size="small"
                  className={`text-center ${
                    isActive ? 'text-basic-primary' : 'text-secondary'
                  }`}
                >
                  {step.label}
                </Text>

                {/* Connector Line */}
                {index < statusSteps.length - 1 && (
                  <Box
                    className={`absolute left-full top-1/2 h-0.5 w-16 -translate-y-1/2 ${
                      index < currentStep
                        ? 'bg-ui-fg-base'
                        : 'bg-ui-fg-subtle'
                    }`}
                  />
                )}
              </Box>
            </Box>
          )
        })}
      </Box>

      {/* Current Status Text */}
      <Box className="mt-6 rounded-lg bg-secondary p-4">
        <Text size="base" className="text-center">
          {trackingStatus === 'canceled'
            ? 'This order has been canceled.'
            : `Your order is currently ${trackingStatus}`}
        </Text>
      </Box>
    </Box>
  )
}

export default TrackingStatus
