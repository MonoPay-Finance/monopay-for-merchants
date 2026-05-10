import { db } from '@/db'
import { tryCatchAsync } from '@/lib/resultPattern'
import { makeCartService } from '@/services/cart.service'
import { errorResponse } from '@/lib/http/errorMap'

const cartService = makeCartService(db)

export async function POST(req: Request): Promise<Response> {
  // Parse JSON body — bad JSON becomes a CART_VALIDATION_ERROR (400)
  const body = await tryCatchAsync(
    () => req.json() as Promise<unknown>,
    () => ({
      type: 'CART_VALIDATION_ERROR' as const,
      fields: [{ path: '_body', message: 'Invalid JSON' }],
    })
  )
  if (body.isErr()) return errorResponse(body.error)

  const result = await cartService.createCart(body.value)
  if (result.isErr()) return errorResponse(result.error)
  return Response.json(result.value, { status: 201 })
}
