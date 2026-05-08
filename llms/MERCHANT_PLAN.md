# Merchant POS — Product Plan

## What We Are Building

A merchant-facing web app that acts as a point-of-sale terminal on Solana.

The merchant creates bills from a pre-built product catalog, generates Solana Pay QR codes for buyers to scan, and sends push notifications to buyers' phones that open a live payment modal. The buyer side is a separate, existing mobile app. This project is the merchant side only.

Payment rails are built on Solana Pay specs, leveraging Dodo Payments for product catalog, invoice, and list management. Crypto payment is an in-app feature layered on top of Dodo's infrastructure — not a separate flow.

---

## Core Thesis

Normal POS systems are built for fiat. This one is built for a Solana-native merchant who wants to bill buyers, accept crypto, and maintain a private record of who pays them and how often — without leaving the browser.

Target user:

- small merchant or solo operator
- creator or service provider billing clients
- any Solana-native business wanting a simple storefront + billing tool

Core pain:

- no simple browser-based POS for Solana merchants
- no way to push a payment request directly to a buyer's phone
- no unified view of products, transactions, and regular customers

Product promise:

Bill buyers instantly, accept Solana Pay payments via QR or push notification, and track sales and relationships — all from one clean merchant dashboard.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router, Edge runtime) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Deployment | Cloudflare Workers |
| Payments | Dodo Payments API (catalog, invoices, webhooks) |
| Payment Rail | Solana Pay (QR URI encoding) |
| Wallet Login | Solana wallet adapter |
| Push Notifications | Expo Push API |
| DB | Firebase (via REST adapter — edge compatible) |
| Validation | Zod |
| Error Handling | neverthrow (`Result<T,E>`, `ResultAsync<T,E>`) |
| State | React Context (Zustand if needed later) |

---

## Architecture Boundaries

The codebase is organized in strict layers. Each layer has one job and knows nothing about the layers above it.

```
Request / UI Event
  ↓
API Route          ← thin, no logic, maps Result to HTTP
  ↓
Service Layer      ← business logic, orchestration
  ↓
DB Port            ← interface only, no implementation
  ↓
DB Adapter         ← Firebase REST (swappable)
```

Errors never throw across boundaries.
Every operation that can fail returns a `Result<T, E>` or `ResultAsync<T, E>`.
Validation is always the first step — synchronous, via Zod — before any IO runs.

---

## Project Structure

```
src/
├── app/
│   ├── _components/              # Shared UI components
│   ├── (auth)/                   # Wallet login
│   ├── (dashboard)/
│   │   ├── page.tsx              # Main dashboard
│   │   ├── products/
│   │   │   ├── page.tsx          # Product catalog
│   │   │   └── [id]/page.tsx     # Individual product detail
│   │   ├── billing/
│   │   │   └── page.tsx          # Active carts + payment panel
│   │   ├── transactions/
│   │   │   ├── page.tsx          # All transactions
│   │   │   └── [buyerId]/page.tsx # Per-buyer transaction history
│   │   └── profile/
│   │       └── page.tsx          # Merchant profile / storefront settings
│   ├── api/
│   │   ├── webhooks/
│   │   │   └── dodo/route.ts     # Dodo payment webhook receiver
│   │   ├── notify/route.ts       # Push notification sender
│   │   └── cart/route.ts         # Cart create / update / close
│   ├── layout.tsx
│   └── page.tsx
│
├── lib/
│   ├── result.ts                 # tryCatchSync, tryCatchAsync
│   ├── validation.ts             # parseWith, makeValidationError
│   ├── solana-pay/
│   │   └── uri.ts                # Solana Pay URI builder
│   ├── dodo/
│   │   ├── client.ts             # Dodo API wrapper
│   │   └── errors.ts             # DodoError type
│   ├── expo/
│   │   ├── push.ts               # Expo Push API caller
│   │   └── errors.ts             # ExpoError type
│   └── context/
│       └── AppContext.tsx
│
├── zod/
│   └── schemas/
│       ├── merchant.schema.ts
│       ├── product.schema.ts
│       ├── cart.schema.ts
│       ├── notification.schema.ts
│       └── transaction.schema.ts
│
├── db/
│   ├── ports/                    # Interfaces
│   │   ├── merchant.repository.ts
│   │   ├── cart.repository.ts
│   │   ├── transaction.repository.ts
│   │   └── buyer.repository.ts
│   ├── adapters/
│   │   └── firebase/             # Firebase REST implementation
│   ├── errors.ts                 # DBError type
│   └── index.ts                  # Active adapter — swap here only
│
├── services/
│   ├── cart.service.ts           # Cart creation, UUID logic, lifecycle
│   ├── billing.service.ts        # Invoice creation, QR generation
│   ├── notification.service.ts   # Push token lookup, Expo dispatch
│   ├── transaction.service.ts    # History queries, friends logic
│   └── product.service.ts        # Dodo catalog wrapper + sales data
│
└── utils/
    ├── uuid.ts                   # Cart UUID generation
    ├── qr.ts                     # QR code encoding helper
    └── constants.ts
```

---

## Screens

### Dashboard

The merchant's home base.

- connected wallet display
- shielded storefront summary
- recent transactions (last 5, with a "View All" link)
- friends block — top buyers by transaction frequency
- quick actions: New Bill, Browse Products, View History

### Product Catalog

Pulled from Dodo Payments API. Read-only initially.

- grid of pre-created products
- each product card shows name, price, and a quick-add button
- clicking a card opens the product detail page

### Product Detail

- product name, description, price
- sales performance (total units sold, total revenue)
- stock status (placeholder initially — stubbed with dummy service)
- recent transactions involving this product

### Billing Panel

The core daily-use screen.

- multiple open carts, each with a UUID
- add products from catalog into active cart
- cart shows line items, quantities, subtotal
- on checkout:
  - Dodo invoice is created
  - Solana Pay URI is encoded from invoice details
  - QR code is generated and displayed (15 min expiry)
  - option to send push notification to buyer instead of / alongside QR

### Payment + Notification Panel

Sits within the billing screen.

- QR code display with countdown timer
- "Send to Phone" button — triggers push notification to buyer
- notification payload carries cart UUID, amount, merchant identity
- on webhook confirmation (payment landed):
  - cart is closed
  - buyer receives confirmation notification
  - merchant sees success state

### Transactions — All

- full list of completed transactions
- filterable by date, asset, amount
- each row is clickable — opens detail view

### Transactions — Per Buyer

- opened from the Friends block or from a transaction row
- full history with that buyer
- "Request" button at the bottom:
  - opens a mini billing composer
  - sends a push notification with a new payment request

### Profile / Storefront

- merchant wallet address
- display name and storefront details (set once via Dodo onboarding)
- one merchant = one Dodo account = one storefront
- no multi-store complexity

---

## Key Flows

### Cart → QR → Payment

```
Merchant adds products to cart
  → cart.service creates cart with UUID, stores in DB
  → billing.service calls Dodo API to create invoice
  → solana-pay/uri.ts encodes Solana Pay URI from invoice
  → QR rendered in UI with 15 min timer
  → Buyer scans and pays
  → Dodo webhook fires → api/webhooks/dodo/route.ts receives it
  → cart is marked paid in DB
  → confirmation push sent to buyer via notification.service
```

### Push Notification → Payment

```
Merchant taps "Send to Phone" in billing panel
  → notification.service looks up buyer's Expo Push Token from DB
  → payload includes cart UUID, amount, merchant name
  → Expo Push API sends notification to buyer's device
  → Buyer's app receives it, opens payment modal (Pay / Cancel + timer)
  → If Pay → same Solana Pay flow as QR
  → If Cancel or timeout → cart stays open, merchant sees status
```

### Friends Block

```
transaction.service queries DB for buyer frequency
  → top N buyers by transaction count with this merchant
  → rendered as avatar + nickname list on dashboard
  → clicking opens per-buyer transaction page
  → "Request" button composes and sends a new payment push
```

---

## Error Handling Strategy

No layer throws. Every failure is a typed value.

```ts
// Validation always first, always sync
const parsed = parseCart(rawData)
if (parsed.isErr()) return parsed

// IO always wrapped
const invoice = await tryCatchAsync(
  () => dodoClient.createInvoice(parsed.value),
  toDodoError
)
if (invoice.isErr()) return invoice
```

Error types per domain:

```ts
type DBError           = { type: 'DB_ERROR'; message: string }
type DodoError         = { type: 'DODO_ERROR'; message: string; code?: number }
type ExpoError         = { type: 'EXPO_ERROR'; message: string }
type CartError         = { type: 'CART_EXPIRED' | 'CART_NOT_FOUND' }
type ValidationError<T> = { type: T; fields: { path: string; message: string }[] }
```

Union error types emerge at the service boundary and are explicit in function signatures.
API routes map these to HTTP status codes — nothing else does.

---

## Expo Push Token Storage

Token storage is not yet fully defined. Current development uses hardcoded tokens locally. The following options are being considered:

**Option A — DB-only (source of truth in Firebase)**
- buyer app writes its Expo Push Token to the DB on login or token refresh
- keyed by wallet address as primary, email/phone as secondary indexes
- merchant app always reads from DB via `buyer.repository`
- no local caching on merchant side

**Option B — DB + encrypted local cache**
- same as above for DB storage
- merchant device caches tokens for frequent buyers locally
- local cache is encrypted using a merchant-set app password
- wallet address is also stored locally in encrypted form
- cache is treated as ephemeral — DB is always the source of truth
- on cache miss, falls back to DB lookup

**Option C — Password-derived encryption for DB values**
- tokens in DB are encrypted before write using a key derived from merchant password
- only the merchant who knows the password can decrypt and use the token
- adds privacy at rest but requires key management on client

**Current decision:** Option B is the likely path. Exact encryption mechanism (Web Crypto API, a lightweight library) to be decided during implementation.

Rules regardless of strategy:
- tokens are never stored or transmitted in plaintext
- all token reads go through `buyer.repository` — never accessed directly by UI or services
- token writes are the responsibility of the buyer app, not this merchant app

---

## Stock Tracking — Stub Plan

Not built in MVP but designed for.

```ts
// services/product.service.ts
export const getStockLevel = (_productId: string): ResultAsync<StockLevel, never> =>
  okAsync({ status: 'in_stock', quantity: null })  // stub
```

When real stock data is available (Dodo API or internal), swap the implementation without touching the service interface.

---

## What Is Out Of Scope

- buyer-side UI — handled by existing mobile app
- merchant onboarding flow — handled by Dodo
- multi-store per merchant
- manual buyer tagging or CRM features
- fiat payment flows
- inventory management (stubbed only)

---

## Build Order

1. App scaffold — Next.js, Tailwind, wallet adapter
2. Auth — wallet login, merchant identity resolution
3. Dodo integration — product catalog pull, invoice creation
4. Cart service — UUID logic, DB persistence
5. Solana Pay URI encoding + QR generation
6. Webhook receiver — Dodo payment confirmation
7. Push notification service — Expo token lookup + dispatch
8. Transaction history — queries, friends frequency logic
9. Full UI — dashboard, billing panel, product pages, history
10. Polish — loading states, error states, timers, empty states

---

## Resolved

1. **Dodo → Solana Pay enrichment** — existing logic handles the data exchange between Dodo invoice and Solana Pay URI. No open question.
2. **Webhook authentication** — Dodo requires signature verification on all webhook requests. The SDK's `webhooks.unwrap()` helper handles this. Three headers must be present and verified: `webhook-id`, `webhook-signature`, `webhook-timestamp`. Requests that fail verification are rejected with 401. This is handled in `api/webhooks/dodo/route.ts`.
3. **On-chain ID card** — existing query code handles nickname resolution from the on-chain ID card. Plugs into `buyer.repository` for display in friends block and transaction views.

---

## Open Questions

1. **Token storage encryption** — exact encryption mechanism for local token cache (Web Crypto API vs library). To be decided during implementation.
2. **Expo Push rate limits** — no current strategy for bulk notification throttling. A per-merchant rate limit or time-windowed queue may be needed if notification volume grows. To be revisited post-MVP.
