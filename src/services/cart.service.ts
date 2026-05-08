import { errAsync, ResultAsync } from 'neverthrow'
import type { Cart, CartRepository } from '@/db/ports/cart.repository'
import type { DBError } from '@/db/errors'
import { parseCartCreateInput, type CartValidationError } from '@/zod/schemas/cart.schema'

const CART_TTL_MS = 15 * 60 * 1000 // QR/payment link expires after 15 minutes

export type CartServiceDeps = { carts: CartRepository }

export const makeCartService = (deps: CartServiceDeps) => ({
  createCart: (rawInput: unknown): ResultAsync<Cart, CartValidationError | DBError> => {
    const parsed = parseCartCreateInput(rawInput)
    if (parsed.isErr()) return errAsync(parsed.error)

    const now = new Date()
    const subtotalAmount = parsed.value.lineItems.reduce(
      (sum, li) => sum + li.unitAmount * li.quantity,
      0
    )

    const cart: Cart = {
      id: crypto.randomUUID(),
      merchantId: parsed.value.merchantId,
      ...(parsed.value.buyerId !== undefined && { buyerId: parsed.value.buyerId }),
      status: 'OPEN',
      lineItems: parsed.value.lineItems,
      subtotalAmount,
      expiresAtIso: new Date(now.getTime() + CART_TTL_MS).toISOString(),
      createdAtIso: now.toISOString(),
      updatedAtIso: now.toISOString(),
    }

    return deps.carts.create(cart)
  },

  getCart: (cartId: string): ResultAsync<Cart, DBError> =>
    deps.carts.getById(cartId),

  markCartPaid: (cartId: string): ResultAsync<Cart, DBError> =>
    deps.carts.markPaid(cartId, new Date().toISOString()),

  cancelCart: (cartId: string): ResultAsync<Cart, DBError> =>
    deps.carts.getById(cartId).andThen(cart =>
      deps.carts.update({
        ...cart,
        status: 'CANCELLED',
        updatedAtIso: new Date().toISOString(),
      })
    ),

  expireCart: (cartId: string): ResultAsync<Cart, DBError> =>
    deps.carts.getById(cartId).andThen(cart =>
      deps.carts.update({
        ...cart,
        status: 'EXPIRED',
        updatedAtIso: new Date().toISOString(),
      })
    ),
})

export type CartService = ReturnType<typeof makeCartService>
