"use client"

import { createContext, useContext, useMemo, useState } from "react"

type CheckoutSummaryEstimateContextValue = {
  estimatedShippingTotal: number | null
  setEstimatedShippingTotal: (amount: number | null) => void
}

const CheckoutSummaryEstimateContext =
  createContext<CheckoutSummaryEstimateContextValue | null>(null)

export function CheckoutSummaryEstimateProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [estimatedShippingTotal, setEstimatedShippingTotal] = useState<
    number | null
  >(null)

  const value = useMemo(
    () => ({
      estimatedShippingTotal,
      setEstimatedShippingTotal,
    }),
    [estimatedShippingTotal]
  )

  return (
    <CheckoutSummaryEstimateContext.Provider value={value}>
      {children}
    </CheckoutSummaryEstimateContext.Provider>
  )
}

export function useCheckoutSummaryEstimate() {
  return useContext(CheckoutSummaryEstimateContext)
}
