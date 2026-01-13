"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { StoreCart } from "@medusajs/types"
import { getCartAction, addToCartAction, updateLineItemAction, deleteLineItemAction } from "@/app/actions/cart"
import { toast } from "@/lib/hooks/use-toast" // We'll need to create this or use a simple alert for now if missing

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

  const refreshCart = async () => {
    try {
      const cartData = await getCartAction()
      setCart(cartData)
    } catch (error) {
      console.error("Failed to refresh cart", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshCart()
  }, [])

  const addItem = async (variantId: string, quantity: number) => {
    setIsLoading(true)
    try {
      const result = await addToCartAction(variantId, quantity)
      if (result.success && result.cart) {
        setCart(result.cart)
        // Ideally show toast success
        console.log("Item added to cart")
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("Failed to add item", error)
      // Ideally show toast error
    } finally {
      setIsLoading(false)
    }
  }

  const updateItem = async (lineItemId: string, quantity: number) => {
    setIsLoading(true)
    try {
      const result = await updateLineItemAction(lineItemId, quantity)
      if (result.success && result.cart) {
        setCart(result.cart)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("Failed to update item", error)
    } finally {
      setIsLoading(false)
    }
  }

  const removeItem = async (lineItemId: string) => {
    setIsLoading(true)
    try {
      const result = await deleteLineItemAction(lineItemId)
      if (result.success && result.cart) {
        setCart(result.cart)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("Failed to remove item", error)
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
