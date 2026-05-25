import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { PaymentStep } from "../payment-step"
import { useElements, useStripe } from "@stripe/react-stripe-js"

jest.mock("@stripe/react-stripe-js", () => ({
  PaymentElement: () => <div data-testid="payment-element" />,
  useElements: jest.fn(),
  useStripe: jest.fn(),
}))

jest.mock("lucide-react", () => ({
  CreditCard: () => <span data-testid="credit-card-icon" />,
  Wallet: () => <span data-testid="wallet-icon" />,
}))

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })

  return { promise, resolve, reject }
}

describe("PaymentStep", () => {
  const mockUseStripe = useStripe as jest.Mock
  const mockUseElements = useElements as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("locks checkout finalisation and ignores duplicate payment submissions", async () => {
    const paymentDeferred = createDeferred<{ error?: { message?: string } }>()
    const submit = jest.fn().mockResolvedValue({})
    const confirmPayment = jest.fn().mockReturnValue(paymentDeferred.promise)
    const onComplete = jest.fn()

    mockUseElements.mockReturnValue({ submit })
    mockUseStripe.mockReturnValue({ confirmPayment })

    const { container } = render(
      <PaymentStep onBack={jest.fn()} onComplete={onComplete} />
    )

    const form = container.querySelector("form")
    expect(form).toBeInTheDocument()

    fireEvent.submit(form!)
    fireEvent.submit(form!)

    await waitFor(() => {
      expect(submit).toHaveBeenCalledTimes(1)
    })
    expect(confirmPayment).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: /back/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /pay now/i })).toBeDisabled()
    expect(
      screen.getByRole("button", { name: /credit card/i })
    ).toHaveAttribute("aria-disabled", "true")
    expect(
      screen.getByRole("button", { name: /manual payment/i })
    ).toHaveAttribute("aria-disabled", "true")
    expect(screen.getByText(/finalising your payment/i)).toBeInTheDocument()

    paymentDeferred.resolve({})

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1)
    })
  })
})
