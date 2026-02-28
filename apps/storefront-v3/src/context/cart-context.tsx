"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { StoreCart } from "@medusajs/types"
import { createCart, getCart, addToCart, updateLineItem, deleteLineItem } from "@/lib/medusa/cart"

export const CART_STORAGE_KEY = "_medusa_cart_id"
const CART_COOKIE = "_medusa_cart_id"
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

interface CartContextType {
  cart: StoreCart | null
  isLoading: boolean
  addItem: (variantId: string, quantity: number) => Promise<void>
  updateItem: (lineItemId: string, quantity: number) => Promise<void>
  removeItem: (lineItemId: string) => Promise<void>
  refreshCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<StoreCart | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const getCartId = (): string | null => {
    if (typeof window === "undefined") return null
    return localStorage.getItem(CART_STORAGE_KEY)
  }

  const setCartId = (cartId: string): void => {
    if (typeof window === "undefined") return
    localStorage.setItem(CART_STORAGE_KEY, cartId)
    document.cookie = `${CART_COOKIE}=${encodeURIComponent(cartId)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
  }

  const clearCartId = (): void => {
    if (typeof window === "undefined") return
    localStorage.removeItem(CART_STORAGE_KEY)
    document.cookie = `${CART_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
  }

  const refreshCart = async () => {
    try {
      const cartId = getCartId()
      if (!cartId) {
        setCart(null)
        return
      }

      const cartData = await getCart(cartId)
      setCart(cartData)
    } catch (error) {
      console.error("Failed to refresh cart", error)
      // If cart not found, clear the stored ID
      clearCartId()
      setCart(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const cartId = getCartId()
    if (cartId) {
      document.cookie = `${CART_COOKIE}=${encodeURIComponent(cartId)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
    }
    refreshCart()
  }, [])

  const ensureCart = async (): Promise<string> => {
    let cartId = getCartId()

    if (!cartId) {
      const newCart = await createCart()
      cartId = newCart.id
      setCartId(cartId)
      setCart(newCart)
    }

    return cartId
  }

  const addItem = async (variantId: string, quantity: number) => {
    setIsLoading(true)
    try {
      const cartId = await ensureCart()
      const updatedCart = await addToCart({ cartId, variantId, quantity })
      setCart(updatedCart)
    } catch (error) {
      console.error("Failed to add item", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const updateItem = async (lineItemId: string, quantity: number) => {
    setIsLoading(true)
    try {
      const cartId = getCartId()
      if (!cartId) {
        throw new Error("No cart found")
      }

      const updatedCart = await updateLineItem({ cartId, lineItemId, quantity })
      setCart(updatedCart)
    } catch (error) {
      console.error("Failed to update item", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const removeItem = async (lineItemId: string) => {
    setIsLoading(true)
    try {
      const cartId = getCartId()
      if (!cartId) {
        throw new Error("No cart found")
      }

      const updatedCart = await deleteLineItem({ cartId, lineItemId })
      setCart(updatedCart)
    } catch (error) {
      console.error("Failed to remove item", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        addItem,
        updateItem,
        removeItem,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
