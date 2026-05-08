import type { DBError } from '@/db/errors'
import type { tryCatchAsync } from '@/lib/resultPattern'

// Async repository result inferred from the canonical result wrapper.
type AsyncResult<T, E> = ReturnType<typeof tryCatchAsync<T, E>>

export type CartLineItem = {
  productId: string
  quantity: number
  unitAmount: number
}

// Cart lifecycle states for billing flow.
export type CartStatus = 'OPEN' | 'PAID' | 'EXPIRED' | 'CANCELLED'

// Stored cart shape used by repository adapters.
export type Cart = {
  id: string
  merchantId: string
  buyerId?: string
  status: CartStatus
  lineItems: CartLineItem[]
  subtotalAmount: number
  createdAtIso: string
  updatedAtIso: string
}

// Contract only: adapters implement these operations.
export interface CartRepository {
  create(cart: Cart): AsyncResult<Cart, DBError>
  getById(cartId: string): AsyncResult<Cart, DBError>
  update(cart: Cart): AsyncResult<Cart, DBError>
  markPaid(cartId: string, paidAtIso: string): AsyncResult<Cart, DBError>
}
