# Database Model — Merchant App

## Status

**Stage 4 complete. TypeScript typecheck passes with zero errors across the full project.**

Files delivered:
- `src/db/errors.ts` — `DBError` type + `toDBError` helper
- `src/db/ports/merchant.repository.ts` — updated type + interface
- `src/db/ports/buyer.repository.ts` — updated type + interface
- `src/db/ports/cart.repository.ts` — updated type + interface
- `src/db/ports/transaction.repository.ts` — updated type + interface
- `src/db/adapters/firebase/client.ts` — edge-compatible Firebase REST client
- `src/db/adapters/firebase/merchant.ts` — `MerchantRepository` implementation
- `src/db/adapters/firebase/buyer.ts` — `BuyerRepository` implementation
- `src/db/adapters/firebase/cart.ts` — `CartRepository` implementation
- `src/db/adapters/firebase/transaction.ts` — `TransactionRepository` implementation
- `src/db/index.ts` — single adapter access point (`db.merchants`, `db.buyers`, etc.)

Pre-existing POC route fixes included:
- `src/app/api/checkout/route.ts` — switched from raw `process.env` to validated `env`
- `dodopayments` added to `package.json` (was transitive-only, now direct dep)

---

## What Dodo Tells Us

Every Dodo object (payment, product, dispute, webhook event) carries a `business_id`.
The API key in env IS the merchant, but `business_id` is Dodo's internal handle for that business.
It appears in every webhook payload — we store it to validate incoming events and future-proof multi-merchant.

Dodo's `Customer` object maps to our `Buyer`:
- `customer_id`, `name`, `email`, `phone_number`

A `PaymentResponse` from Dodo includes `payment_id` — the reconciliation key between our `Cart`
and Dodo's payment record. Store it on the `Cart` at invoice creation, and on the `Transaction`
after confirmation so invoice/receipt lookup from Dodo works.

---

## Types

### Merchant

Standard monopay user fields + shop-specific additions:

```ts
type Merchant = {
  id: string                     // our internal UUID
  walletAddress: string          // Solana wallet — primary identity
  displayName: string            // shown on dashboard header
  storefrontName?: string        // shown to buyers on storefront
  storefrontDescription?: string // brief bio / what you sell
  storefrontLogoUrl?: string     // logo for branding
  dodoBusinessId?: string        // Dodo's business_id — for webhook validation
  preferredCurrency: string      // e.g. 'USD' — default invoice currency
  createdAtIso: string
  updatedAtIso?: string
}
```

`storefrontDescription`, `storefrontLogoUrl` are the shop-specific extras.
`dodoBusinessId` ties the Firebase record to Dodo's world.
`preferredCurrency` is needed at invoice creation time.

---

### Buyer

Extended with Dodo customer linkage:

```ts
type Buyer = {
  id: string
  walletAddress: string
  nickname?: string
  email?: string                // from Dodo customer record, for display
  dodoCustomerId?: string       // lets you pre-fill checkout for repeat buyers
  expoPushTokenEncrypted?: string
}
```

`dodoCustomerId` is used to pre-fill the Dodo checkout form for repeat buyers and
to correlate Dodo payment records back to a buyer in our DB.

---

### Cart

Extended with Dodo payment linkage and QR expiry:

```ts
type Cart = {
  id: string
  merchantId: string
  buyerId?: string
  status: 'OPEN' | 'PAID' | 'EXPIRED' | 'CANCELLED'
  lineItems: CartLineItem[]
  subtotalAmount: number
  dodoPaymentId?: string        // set when Dodo payment/checkout is created
  expiresAtIso?: string         // QR code / payment link expiry (15 min)
  createdAtIso: string
  updatedAtIso: string
}
```

`dodoPaymentId` is the reconciliation key on webhook arrival:
webhook carries `payment_id` → look up cart by it → close cart.

---

### Transaction

Extended with Dodo ID and currency:

```ts
type Transaction = {
  id: string
  merchantId: string
  buyerId?: string
  cartId: string
  dodoPaymentId?: string        // for receipt/invoice lookup from Dodo
  assetSymbol: string           // crypto asset (e.g. 'SOL', 'USDC')
  currency: string              // fiat currency of Dodo payment (e.g. 'USD')
  amount: number
  status: 'PENDING' | 'CONFIRMED' | 'FAILED'
  createdAtIso: string
}
```

---

## Firebase Collection Structure

```
/merchants/{merchantId}
/buyers/{buyerId}
/carts/{cartId}
/transactions/{transactionId}
```

Flat top-level collections. No nesting.

---

## Firebase REST Adapter

Auth flow: service account JWT → Google OAuth2 token exchange using `crypto.subtle` (Web Crypto API).
This is edge-compatible — works on Cloudflare Workers with no Node.js APIs.

Token is cached at module level, refreshed 60 seconds before expiry.
All adapter methods wrap Firebase HTTP calls in `tryCatchAsync` — never throw, always `ResultAsync<T, DBError>`.

Env vars required (already in `.env.example` and `.dev.vars.example`):
```
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

If any are missing at request time, the operation fails with a `DBError` explaining what's missing.

---

## Webhook Events to Handle

| Event | Action |
|---|---|
| `payment.succeeded` | Look up cart by `dodoPaymentId`, mark PAID, create Transaction, send buyer push |
| `payment.failed` | Update cart status |
| `payment.cancelled` | Update cart to CANCELLED |

---

## topBuyersByFrequency — Query Strategy

Firestore REST has no aggregation. For MVP, fetch all transactions for a merchant
and count buyer IDs in-memory. One function, no extra writes, correct at small scale.

If volume grows: add a `buyerStats/{merchantId}_{buyerId}` counter collection
that increments on each transaction write.

---

## Access Pattern

```ts
import { db } from '@/db'

// All operations follow this pattern — never throw, always Result
const merchant = await db.merchants.getByWallet(walletAddress)
if (merchant.isErr()) { /* handle DBError */ }

const cart = await db.carts.create(newCart)
if (cart.isErr()) { /* handle DBError */ }

await db.carts.markPaid(cartId, new Date().toISOString())
```
