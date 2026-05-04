"use client"

import { Elements } from "@stripe/react-stripe-js"
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js"
import type * as React from "react"

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null
const StripeElements = Elements as React.ComponentType<{
  stripe: typeof stripePromise
  options: StripeElementsOptions
  children: React.ReactNode
}>

interface StripeWrapperProps {
  clientSecret?: string
  children: React.ReactNode
}

export function StripeWrapper({ clientSecret, children }: StripeWrapperProps) {
  if (!clientSecret || !stripePromise) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Secure payment setup is not available.
      </div>
    )
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
    <StripeElements stripe={stripePromise} options={options}>
      {children}
    </StripeElements>
  )
}
