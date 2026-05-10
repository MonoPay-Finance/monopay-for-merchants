import { z } from 'zod'
import { Result } from 'neverthrow'
import { parseWith, makeValidationError, ValidationError } from '@/lib/zodPattern'
import type { Cart, CartLineItem } from '@/db/ports/cart.repository'
import { cleanOptional } from '@/zod/_helpers'

export const CartLineItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitAmount: z.number().int().nonnegative(),
})

export const CartStatusSchema = z.enum(['OPEN', 'PAID', 'EXPIRED', 'CANCELLED'])

const CartInputSchema = z.object({
  id: z.string().min(1),
  merchantId: z.string().min(1),
  buyerId: z.string().min(1).optional(),
  status: CartStatusSchema,
  lineItems: z.array(CartLineItemSchema).min(1),
  subtotalAmount: z.number().int().nonnegative(),
  dodoPaymentId: z.string().min(1).optional(),
  expiresAtIso: z.string().datetime().optional(),
  createdAtIso: z.string().datetime(),
  updatedAtIso: z.string().datetime(),
})

export const CartSchema = CartInputSchema.transform(cleanOptional<Cart>())

export type CartValidationError = ValidationError<'CART_VALIDATION_ERROR'>

const toCartError = makeValidationError('CART_VALIDATION_ERROR')

export const parseCart = (raw: unknown): Result<Cart, CartValidationError> =>
  parseWith(CartSchema, raw, toCartError)

export const parseCartLineItem = (raw: unknown): Result<CartLineItem, CartValidationError> =>
  parseWith(CartLineItemSchema, raw, toCartError)

// Input shape accepted by cart.service.createCart — the service generates
// id, status, subtotalAmount, expiresAtIso, and timestamps from this.
export type CartCreateInput = {
  merchantId: string
  buyerId?: string
  lineItems: CartLineItem[]
}

const CartCreateInputRawSchema = z.object({
  merchantId: z.string().min(1),
  buyerId: z.string().min(1).optional(),
  lineItems: z.array(CartLineItemSchema).min(1),
})

export const CartCreateInputSchema = CartCreateInputRawSchema.transform(cleanOptional<CartCreateInput>())

export const parseCartCreateInput = (raw: unknown): Result<CartCreateInput, CartValidationError> =>
  parseWith(CartCreateInputSchema, raw, toCartError)
