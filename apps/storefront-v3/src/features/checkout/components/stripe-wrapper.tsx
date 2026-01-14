"use client"

import { Elements } from "@stripe/react-stripe-js"
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js"
import { ReactNode } from "react"

// Ensure we have a key, even if mock for dev
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_KEY || "pk_test_mock_key"
const stripePromise = loadStripe(stripeKey)

interface StripeWrapperProps {
  clientSecret?: string
  children: ReactNode
}

export function StripeWrapper({ clientSecret, children }: StripeWrapperProps) {
  if (!clientSecret) {
    return <>{children}</>
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#00f0ff', // Electric Cyan
        colorBackground: '#09090b', // Zinc 950
        colorText: '#e4e4e7', // Zinc 200
        colorDanger: '#ef4444',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        borderRadius: '4px',
        spacingUnit: '4px',
      },
      rules: {
        '.Input': {
          border: '1px solid #27272a', // Zinc 800
          backgroundColor: '#18181b', // Zinc 900
        },
        '.Input:focus': {
          border: '1px solid #00f0ff',
          boxShadow: 'none',
        },
      }
    },
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      {children as any}
    </Elements>
  )
}
