import DodoPayments from 'dodopayments'
import { ResultAsync } from 'neverthrow'
import { z } from 'zod'
import { tryCatchAsync } from '@/lib/resultPattern'
import { env } from '@/lib/env'
import { makeValidationError, parseWith } from '@/lib/zodPattern'
import {
  toDodoError,
  toWebhookSignatureError,
  type DodoError,
  type WebhookSignatureError,
} from './errors'

const client = new DodoPayments({
  bearerToken: env.DODO_PAYMENTS_API_KEY,
  environment: env.DODO_PAYMENTS_ENVIRONMENT,
})

const DodoResponseValidationError = makeValidationError('DODO_RESPONSE_VALIDATION_ERROR')

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

const CheckoutSessionSchema: z.ZodType<CheckoutSession> = z.object({
  sessionId: z.string().min(1),
  checkoutUrl: z.string().min(1).nullable(),
})

const PaymentSchema: z.ZodType<Payment> = z.object({
  paymentId: z.string().min(1),
  businessId: z.string().min(1),
  status: z.string().min(1).nullable(),
  totalAmount: z.number().int().nonnegative(),
  currency: z.string().min(1),
  customerId: z.string().min(1),
  metadata: z.record(z.string(), z.string()),
})

function parseDodoResponse<T>(schema: z.ZodSchema<T>, raw: unknown, label: string): T {
  const parsed = parseWith(schema, raw, DodoResponseValidationError)
  if (parsed.isOk()) return parsed.value

  const fields = parsed.error.fields
    .map(field => `${field.path || '<root>'}: ${field.message}`)
    .join('; ')
  throw new Error(`${label} response validation failed: ${fields}`)
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

    return parseDodoResponse(CheckoutSessionSchema, {
      sessionId: session.session_id,
      checkoutUrl: session.checkout_url ?? null,
    }, 'Dodo checkout session')
  }, toDodoError)

export const getPayment = (paymentId: string): ResultAsync<Payment, DodoError> =>
  tryCatchAsync(async () => {
    const p = await client.payments.retrieve(paymentId)
    return parseDodoResponse(PaymentSchema, {
      paymentId: p.payment_id,
      businessId: p.business_id,
      status: p.status ?? null,
      totalAmount: p.total_amount,
      currency: p.currency,
      customerId: p.customer.customer_id,
      metadata: p.metadata ?? {},
    }, 'Dodo payment')
  }, toDodoError)

// Verifies the webhook signature using Dodo SDK's unwrap helper.
// Returns the typed webhook event on success, or WebhookSignatureError on
// signature failure. This MUST be called before parsing the body — the raw
// body is what the signature was computed over.
export type DodoWebhookEvent = ReturnType<typeof client.webhooks.unwrap>

export const verifyWebhook = (
  rawBody: string,
  headers: Record<string, string>
): ResultAsync<DodoWebhookEvent, WebhookSignatureError> =>
  tryCatchAsync(
    async () => client.webhooks.unwrap(rawBody, { headers, key: env.DODO_PAYMENTS_WEBHOOK_KEY }),
    toWebhookSignatureError
  )
