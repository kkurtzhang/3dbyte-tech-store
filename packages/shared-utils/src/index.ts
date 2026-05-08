// Shared utilities for 3D Byte Tech Store

// Basic types
export interface ApiResponse<T = any> {
  data: T
  status: number
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    offset: number
    total: number
    totalPages: number
  }
}

export interface StoreConfig {
  name: string
  description: string
  url: string
  currency: string
  supportedCountries: string[]
}

// Window type declaration
declare global {
  interface Window {
    localStorage: Storage
  }
}

// API utilities
export class ApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(baseUrl: string, defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      ...this.defaultHeaders,
      ...options.headers,
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const data: unknown = await response.json()

      return {
        data: data as T,
        status: response.status,
        message: (data as any)?.message,
      }
    } catch (error) {
      throw new Error(`API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : null,
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

// Format utilities
export const formatPrice = (
  amount: number,
  currency = 'USD',
  locale = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount / 100) // Assuming amount is in cents
}

export const formatDate = (
  date: string | Date,
  locale = 'en-US'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString(locale)
}

export type SafePaymentMethodOrder = {
  payment_collections?: unknown
  payment_status?: unknown
  tracking_payment_method?: unknown
}

type SafeCardDetails = {
  brand?: unknown
  last4?: unknown
}

function humanizePaymentStatus(status: unknown) {
  if (typeof status !== 'string' || !status.trim()) return 'Payment status pending'

  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function formatCardBrand(brand: string) {
  const normalizedBrand = brand.trim().toLowerCase()

  if (normalizedBrand === 'visa') return 'Visa'
  if (normalizedBrand === 'mastercard') return 'Mastercard'
  if (normalizedBrand === 'amex') return 'American Express'

  return normalizedBrand
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getNestedRecord(
  value: Record<string, unknown>,
  key: string
): Record<string, unknown> | null {
  const nestedValue = value[key]

  return isRecord(nestedValue) ? nestedValue : null
}

function getPaymentCard(payment: unknown): SafeCardDetails | null {
  if (!isRecord(payment)) {
    return null
  }

  const data = getNestedRecord(payment, 'data')
  if (!data) {
    return null
  }

  const paymentMethodDetails = getNestedRecord(data, 'payment_method_details')
  const paymentMethod = getNestedRecord(data, 'payment_method')
  const card =
    (paymentMethodDetails && getNestedRecord(paymentMethodDetails, 'card')) ||
    (paymentMethod && getNestedRecord(paymentMethod, 'card'))

  return card
}

function isStripePayment(payment: unknown) {
  if (!isRecord(payment)) {
    return false
  }

  const providerId = payment.provider_id

  return typeof providerId === 'string' && providerId.includes('stripe')
}

function formatSafeCardDetails(card: SafeCardDetails | null) {
  if (typeof card?.brand === 'string' && typeof card?.last4 === 'string') {
    return `${formatCardBrand(card.brand)} ending in ${card.last4}`
  }

  return null
}

export function getSafePaymentMethodDisplay(order: SafePaymentMethodOrder) {
  const trackingPaymentMethod = isRecord(order.tracking_payment_method)
    ? order.tracking_payment_method
    : null

  if (trackingPaymentMethod?.type === 'card') {
    const trackingCardDisplay = formatSafeCardDetails(trackingPaymentMethod)
    if (trackingCardDisplay) {
      return trackingCardDisplay
    }
  }

  const paymentCollections = Array.isArray(order.payment_collections)
    ? order.payment_collections
    : []
  const payments = paymentCollections.flatMap((collection) => {
    if (!isRecord(collection) || !Array.isArray(collection.payments)) {
      return []
    }

    return collection.payments
  })

  for (const payment of payments) {
    const cardDisplay = formatSafeCardDetails(getPaymentCard(payment))

    if (cardDisplay) {
      return cardDisplay
    }
  }

  if (payments.some(isStripePayment)) {
    return 'Card payment'
  }

  return humanizePaymentStatus(order.payment_status)
}

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePostalCode = (postalCode: string, country = 'US'): boolean => {
  const patterns: Record<string, RegExp> = {
    US: /^\d{5}(-\d{4})?$/,
    CA: /^[A-Z]\d[A-Z] \d[A-Z]\d$/,
    UK: /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/,
  }

  const pattern = patterns[country]
  if (!pattern) return true // Accept any format for unspecified countries

  return pattern.test(postalCode.toUpperCase())
}

// Storage utilities
export const storage = {
  get: <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch {
      return null
    }
  },

  set: <T>(key: string, value: T): void => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Silently fail
    }
  },

  remove: (key: string): void => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(key)
  },
}

// Error utilities
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR',
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const createError = (message: string, code?: string): AppError => {
  return new AppError(message, code)
}
