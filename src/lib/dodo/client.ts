import DodoPayments from 'dodopayments'
import { ResultAsync } from 'neverthrow'
import { tryCatchAsync } from '@/lib/resultPattern'
import { env } from '@/lib/env'
import { toDodoError, type DodoError } from './errors'

const client = new DodoPayments({
  bearerToken: env.DODO_PAYMENTS_API_KEY,
  environment: env.DODO_PAYMENTS_ENVIRONMENT,
})

// ---- types we expose to services (SDK fields renamed to camelCase) ----

export type CheckoutLineItem = {
  productId: string
  quantity: number
}

export type CheckoutSessionInput = {
  productCart: CheckoutLineItem[]
  customerId?: string                     // attach existing Dodo customer
  newCustomer?: { email: string; name?: string }
  returnUrl?: string
  metadata?: Record<string, string>
}

export type CheckoutSession = {
  sessionId: string
  checkoutUrl: string | null              // SDK can return null when checkout URL is deferred
}

export type Payment = {
  paymentId: string
  businessId: string
  status: string | null
  totalAmount: number
  currency: string
  customerId: string
  metadata: Record<string, string>
}

// ---- operations ----

export const createCheckoutSession = (
  input: CheckoutSessionInput
): ResultAsync<CheckoutSession, DodoError> =>
  tryCatchAsync(async () => {
    const session = await client.checkoutSessions.create({
      product_cart: input.productCart.map(p => ({
        product_id: p.productId,
        quantity: p.quantity,
      })),
      return_url: input.returnUrl ?? env.DODO_PAYMENTS_RETURN_URL,
      ...(input.customerId !== undefined && {
        customer: { customer_id: input.customerId },
      }),
      ...(input.customerId === undefined &&
        input.newCustomer !== undefined && {
          customer: input.newCustomer.name !== undefined
            ? { email: input.newCustomer.email, name: input.newCustomer.name }
            : { email: input.newCustomer.email },
        }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
    })

    return {
      sessionId: session.session_id,
      checkoutUrl: session.checkout_url ?? null,
    }
  }, toDodoError)

export const getPayment = (paymentId: string): ResultAsync<Payment, DodoError> =>
  tryCatchAsync(async () => {
    const p = await client.payments.retrieve(paymentId)
    return {
      paymentId: p.payment_id,
      businessId: p.business_id,
      status: p.status ?? null,
      totalAmount: p.total_amount,
      currency: p.currency,
      customerId: p.customer.customer_id,
      metadata: p.metadata,
    }
  }, toDodoError)
