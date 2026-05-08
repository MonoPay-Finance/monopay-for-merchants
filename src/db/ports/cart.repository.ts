import type { DBError } from '@/db/errors'
import type { tryCatchAsync } from '@/lib/resultPattern'

type AsyncResult<T, E> = ReturnType<typeof tryCatchAsync<T, E>>

export type CartLineItem = {
  productId: string
  quantity: number
  unitAmount: number
}

export type CartStatus = 'OPEN' | 'PAID' | 'EXPIRED' | 'CANCELLED'

export type Cart = {
  id: string
  merchantId: string
  buyerId?: string
  status: CartStatus
  lineItems: CartLineItem[]
  subtotalAmount: number
  dodoPaymentId?: string
  expiresAtIso?: string
  createdAtIso: string
  updatedAtIso: string
}

export interface CartRepository {
  create(cart: Cart): AsyncResult<Cart, DBError>
  getById(cartId: string): AsyncResult<Cart, DBError>
  update(cart: Cart): AsyncResult<Cart, DBError>
  markPaid(cartId: string, paidAtIso: string): AsyncResult<Cart, DBError>
}
