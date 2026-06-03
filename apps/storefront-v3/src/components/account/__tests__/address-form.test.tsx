import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { AddressForm } from '../address-form'

const mockFetch = jest.fn()

global.fetch = mockFetch as unknown as typeof fetch

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
}))

jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('lucide-react', () => ({
  Pencil: () => <span />,
}))

describe('AddressForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ success: false }),
    })
  })

  it('submits new addresses to the authenticated JSON API route', async () => {
    render(<AddressForm />)

    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Launch' },
    })
    fireEvent.change(screen.getByLabelText('Last Name'), {
      target: { value: 'Gate' },
    })
    fireEvent.change(screen.getByLabelText('Address Line 1'), {
      target: { value: '32 Kiernan St' },
    })
    fireEvent.change(screen.getByLabelText('City'), {
      target: { value: 'Gwynneville' },
    })
    fireEvent.change(screen.getByLabelText('Postal Code'), {
      target: { value: '2500' },
    })
    fireEvent.change(screen.getByLabelText('Country Code'), {
      target: { value: 'AU' },
    })

    fireEvent.submit(screen.getByRole('button', { name: /save address/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/addresses?action=add',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })
  })
})
