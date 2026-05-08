import { tryCatchAsync } from '@/lib/resultPattern'
import { toDBError } from '@/db/errors'
import type { Cart, CartRepository } from '@/db/ports/cart.repository'
import { fsCreate, fsGet, fsPatch } from './client'

const PAID_FIELDS = ['status', 'updatedAtIso'] as const

export const cartRepo: CartRepository = {
  create: (cart) =>
    tryCatchAsync(() => fsCreate<Cart>('carts', cart.id, cart), toDBError),

  getById: (cartId) =>
    tryCatchAsync(() => fsGet<Cart>('carts', cartId), toDBError),

  update: (cart) =>
    tryCatchAsync(() => fsPatch<Cart>('carts', cart.id, cart), toDBError),

  markPaid: (cartId, paidAtIso) =>
    tryCatchAsync(
      () =>
        fsPatch<Cart>(
          'carts',
          cartId,
          { status: 'PAID', updatedAtIso: paidAtIso },
          PAID_FIELDS
        ),
      toDBError
    ),
}
