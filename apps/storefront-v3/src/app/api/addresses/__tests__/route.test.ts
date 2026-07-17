const mockCreateAddress = jest.fn()
const mockUpdateAddress = jest.fn()
const mockDeleteAddress = jest.fn()
const mockGetCustomerAuthHeaders = jest.fn()

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      json: async () => payload,
      status: init?.status ?? 200,
    }),
  },
}))

jest.mock('@/lib/medusa/client', () => ({
  sdk: {
    store: {
      customer: {
        createAddress: (...args: unknown[]) => mockCreateAddress(...args),
        updateAddress: (...args: unknown[]) => mockUpdateAddress(...args),
        deleteAddress: (...args: unknown[]) => mockDeleteAddress(...args),
      },
    },
  },
}))

jest.mock('@/app/actions/auth', () => ({
  getCustomerAuthHeaders: () => mockGetCustomerAuthHeaders(),
}))

jest.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: () => ({ allowed: true, retryAfterMs: 0 }),
  getClientIp: () => '127.0.0.1',
}))

import { POST } from '../route'

const createRequest = (url: string, body: Record<string, unknown>) =>
  ({
    headers: new Headers({
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
    }),
    json: async () => body,
    nextUrl: new URL(url),
  }) as never

const addressPayload = {
  address_name: 'Workshop',
  first_name: 'Launch',
  last_name: 'Gate',
  company: '3D Byte Tech',
  address_1: '32 Kiernan St',
  city: 'Gwynneville',
  province: 'NSW',
  country_code: 'AU',
  postal_code: '2500',
}

describe('POST /api/addresses', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCustomerAuthHeaders.mockResolvedValue({
      Authorization: 'Bearer customer-token',
    })
    mockCreateAddress.mockResolvedValue({ customer: { id: 'cus_1' } })
    mockUpdateAddress.mockResolvedValue({ customer: { id: 'cus_1' } })
    mockDeleteAddress.mockResolvedValue({ deleted: true })
  })

  it('creates addresses with customer auth headers', async () => {
    const response = await POST(
      createRequest('http://localhost/api/addresses?action=add', addressPayload)
    )

    expect(response.status).toBe(200)
    expect(mockCreateAddress).toHaveBeenCalledWith(
      addressPayload,
      {},
      {
        Authorization: 'Bearer customer-token',
      }
    )
  })

  it('updates addresses with customer auth headers', async () => {
    const response = await POST(
      createRequest('http://localhost/api/addresses?action=update&id=caddr_1', addressPayload)
    )

    expect(response.status).toBe(200)
    expect(mockUpdateAddress).toHaveBeenCalledWith(
      'caddr_1',
      addressPayload,
      {},
      {
        Authorization: 'Bearer customer-token',
      }
    )
  })

  it('rejects address mutations without a customer token', async () => {
    mockGetCustomerAuthHeaders.mockResolvedValue(null)

    const response = await POST(
      createRequest('http://localhost/api/addresses?action=add', addressPayload)
    )
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toEqual({
      success: false,
      error: 'Authentication required',
    })
    expect(mockCreateAddress).not.toHaveBeenCalled()
  })
})
