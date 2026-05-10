import { db } from '@/db'
import { verifyWebhook } from '@/lib/dodo/client'
import { makeCartService } from '@/services/cart.service'
import { makeTransactionService } from '@/services/transaction.service'
import { errorResponse } from '@/lib/http/errorMap'

const cartService = makeCartService(db)
const transactionService = makeTransactionService(db)

export async function POST(req: Request): Promise<Response> {
  // Read raw body — signature is computed over the unmodified bytes.
  const rawBody = await req.text()

  const headers = {
    'webhook-id': req.headers.get('webhook-id') ?? '',
    'webhook-signature': req.headers.get('webhook-signature') ?? '',
    'webhook-timestamp': req.headers.get('webhook-timestamp') ?? '',
  }

  // Verify signature BEFORE trusting the body — fail with 401 immediately.
  const verified = await verifyWebhook(rawBody, headers)
  if (verified.isErr()) return errorResponse(verified.error)

  const event = verified.value

  if (event.type === 'payment.succeeded') {
    const cartId = event.data.metadata['cartId']
    if (cartId) {
      const cart = await cartService.getCart(cartId)
      if (cart.isOk()) {
        await cartService.markCartPaid(cartId)
        await transactionService.recordTransaction({
          id: crypto.randomUUID(),
          merchantId: cart.value.merchantId,
          ...(cart.value.buyerId !== undefined && { buyerId: cart.value.buyerId }),
          cartId,
          dodoPaymentId: event.data.payment_id,
          assetSymbol: 'USDC',
          currency: event.data.currency,
          amount: event.data.total_amount,
          status: 'CONFIRMED',
          createdAtIso: new Date().toISOString(),
        })
      } else {
        console.error('Webhook payment.succeeded: cart not found', cart.error)
      }
    } else {
      console.warn('Webhook payment.succeeded: no cartId in metadata')
    }
  }

  // Always 200 once signature is valid — Dodo doesn't need to retry app-level
  // failures (those are logged above for ops to inspect).
  return Response.json({ received: true }, { status: 200 })
}
