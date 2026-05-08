import { okAsync, errAsync } from 'neverthrow'
import type { Cart, CartRepository } from '@/db/ports/cart.repository'
import type { DBError } from '@/db/errors'

const dbErr = (message: string): DBError => ({ type: 'DB_ERROR', message })

export const makeFakeCartRepo = (initial: Cart[] = []): CartRepository => {
  const store = new Map<string, Cart>(initial.map(c => [c.id, c]))

  return {
    create: (cart) => {
      if (store.has(cart.id)) return errAsync(dbErr(`Cart already exists: ${cart.id}`))
      store.set(cart.id, cart)
      return okAsync(cart)
    },

    getById: (cartId) => {
      const c = store.get(cartId)
      if (!c) return errAsync(dbErr(`Cart not found: ${cartId}`))
      return okAsync(c)
    },

    update: (cart) => {
      if (!store.has(cart.id)) return errAsync(dbErr(`Cart not found: ${cart.id}`))
      store.set(cart.id, cart)
      return okAsync(cart)
    },

    markPaid: (cartId, paidAtIso) => {
      const c = store.get(cartId)
      if (!c) return errAsync(dbErr(`Cart not found: ${cartId}`))
      const updated: Cart = { ...c, status: 'PAID', updatedAtIso: paidAtIso }
      store.set(cartId, updated)
      return okAsync(updated)
    },
  }
}
