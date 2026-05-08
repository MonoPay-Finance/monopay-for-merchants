# Implementation Review — Stages 1 through 5

A summary of what's been delivered on the `ola` branch for teammate review.
Stages map to the plan in `STAGED_DEV.md`. Stage 6 (UI) and Stage 7 (E2E) are
not yet started.

---

## TL;DR

| Stage | Concern | Status |
|---|---|---|
| 1 | Validation schemas (Zod + parseX) | done |
| 2 | Service logic against fake repos | done |
| 3 | External client adapters (Dodo, Expo, Solana Pay) | done |
| 4 | Firebase REST adapter + expanded data model | done |
| 5 | API routes with shared error → status mapping | done |

- All five stages on branch `ola` (5 commits).
- `npm run typecheck` passes with **zero errors** across the entire project.
- Every stage has a smoke runner under `_smoke.ts` that exercises the
  checkpoint scenarios. All checkpoints pass.
- The pre-existing POC routes (`api/checkout`, `api/customer-portal`,
  `api/webhook`, `api/inlineCheckout`) were not deleted — they're still
  functional but should be considered superseded by Stage 5 routes.

---

## Branch & Commit Layout

```
b95ba9d  implement Stage 4 Firebase adapter + expand data model
bb9a4be  implement Stage 1 Zod validation schemas
d0864b3  implement Stage 2 service logic with in-memory fakes
470abe5  implement Stage 3 external client adapters
3651829  implement Stage 5 API routes with shared error mapping
```

Note: Stage 4 was committed first because it locked the data model that
Stages 1, 2, 5 build on. Stage 3 came after Stage 2 because services that
depend on external clients (billing, notification) are deferred to a later
pass.

---

## Stage 1 — Validation Layer

**Goal:** Stable input contracts before any service or adapter logic runs.

### Files

- `src/zod/_helpers.ts` — `cleanOptional<T>()` transform that strips
  `undefined` keys at runtime, bridging Zod's `?: T | undefined` inference
  to the port types' stricter `?: T` shape under `exactOptionalPropertyTypes`.
- `src/zod/schemas/merchant.schema.ts` — `parseMerchant`
- `src/zod/schemas/buyer.schema.ts` — `parseBuyer`
- `src/zod/schemas/cart.schema.ts` — `parseCart`, `parseCartLineItem`,
  `parseCartCreateInput` (added in Stage 2)
- `src/zod/schemas/transaction.schema.ts` — `parseTransaction`
- `src/zod/schemas/notification.schema.ts` — `parseNotification`
- `src/zod/fixtures/*.fixtures.ts` — valid + invalid sample payloads
  per domain
- `src/zod/_smoke.ts` — manual smoke runner

### Pattern

Every parser follows the same shape:
```ts
parseX(raw: unknown) → Result<X, X_VALIDATION_ERROR>
```

Internally each schema uses `parseWith()` + `makeValidationError()` from
`src/lib/zodPattern.ts` (Stage 0). The error type is enforced by template
literal type `${Uppercase<string>}_VALIDATION_ERROR` so any drift from
the convention is caught at compile time.

### Smoke (verified at commit time)

```
npx tsx src/zod/_smoke.ts
```

All 5 parsers handle valid input (`isOk`) and reject invalid input (`isErr`
with populated `fields[]`). Field counts: merchant 5, buyer 3, cart 7,
transaction 8, notification 3.

---

## Stage 2 — Service Logic with Fakes

**Goal:** Verify orchestration logic independently of any real DB.

### Files

- `src/services/cart.service.ts` — `createCart`, `getCart`, `markCartPaid`,
  `cancelCart`, `expireCart`. The cart service is the thickest one —
  generates UUIDs, computes subtotals, sets 15-minute QR expiry, manages
  status transitions.
- `src/services/transaction.service.ts` — `recordTransaction`,
  `listForMerchant`, `listForBuyer`, `getTopBuyers`
- `src/services/merchant.service.ts` — `getMerchant`,
  `getMerchantByWallet`, `upsertMerchant`
- `src/services/buyer.service.ts` — `getBuyer`, `getBuyerByWallet`,
  `getBuyerPushToken`
- `src/db/adapters/in-memory/{merchant,buyer,cart,transaction,index}.ts`
  — fake repos backed by `Map`s, satisfying the same port interfaces as
  Firebase. `makeFakeDB({ merchants, buyers, ... })` is the factory.
- `src/services/_smoke.ts` — manual smoke runner

### Pattern

Each service is a **factory** that takes repos as deps:

```ts
export const makeCartService = (deps: { carts: CartRepository }) => ({
  createCart: (rawInput: unknown) => { ... },
  ...
})
```

This is the dependency-injection seam. Routes wire the real `db` from
`@/db`. Tests / smoke runners wire `makeFakeDB()`. No global state, no
singletons.

### Smoke (verified at commit time)

```
npx tsx src/services/_smoke.ts
```

Demonstrates all three Stage 2 checkpoint scenarios:
- **Happy path**: parse → write through cart create → mark paid → record
  transaction → list (4 chained ops succeed)
- **Validation fail**: short-circuits at parse with `CART_VALIDATION_ERROR`
  and 2 field errors
- **Domain error**: `getCart('cart_does_not_exist')` returns `DBError`

Subtotal computed correctly: 2 × 1500 + 1 × 19999 = 22999.

---

## Stage 3 — External Client Adapters

**Goal:** Isolate third-party integration risk before it touches services.

### Files

- `src/lib/solana-pay/uri.ts` — `buildSolanaPayURI(params)`. Pure function,
  no IO, no errors. Encodes per Solana Pay spec: `solana:<recipient>?...`
  with amount, spl-token, single/multi reference, label, message, memo.
- `src/lib/dodo/errors.ts` — `DodoError`, `WebhookSignatureError`, +
  mappers (`toDodoError`, `toWebhookSignatureError`).
- `src/lib/dodo/client.ts` — `createCheckoutSession()`, `getPayment()`,
  `verifyWebhook()`. SDK fields renamed to camelCase at the boundary so
  consumers never see snake_case from Dodo.
- `src/lib/expo/errors.ts` — `ExpoError` + `toExpoError`.
- `src/lib/expo/push.ts` — `sendPush(payload)` POSTs to the Cloudflare
  Worker that fronts Expo (with `X-Secret` header).
- `src/lib/_smoke.ts` — manual smoke runner.

### Env additions

`src/lib/env.ts`, `.env.example`, `.dev.vars.example` got two new
**optional** vars used by `lib/expo/push.ts`:

```
WORKER_URL=
WORKER_SECRET=
```

Optional so dev runs don't require the worker. The push function checks at
call time and returns an `ExpoError` if missing.

### Smoke (verified at commit time)

```
npx tsx src/lib/_smoke.ts
```

- Three Solana Pay URIs printed: full (all params), minimal (recipient
  only), multi-reference (two `reference=` query params).
- Push payload constructed dry-run (not actually sent).
- Dodo error mapper exercised with 5 thrown shapes (plain Error,
  Error+status, string, null, unknown). All mapped correctly.

---

## Stage 4 — Firebase Adapter + Data Model

**Goal:** Real DB access satisfying the existing port interfaces, while
service code stays unchanged. Edge-compatible (no Node-only APIs).

See `llms/DB_MODEL.md` for the full data model rationale.

### Files

- `src/db/errors.ts` — `DBError` + `toDBError` helper.
- `src/db/adapters/firebase/client.ts` — Firebase REST client. JWT signing
  with `crypto.subtle` (Web Crypto, edge-compatible), Google OAuth2 token
  exchange, module-level token cache, Firestore typed-field
  serialization, four core ops: `fsGet`, `fsCreate`, `fsPatch`, `fsQuery`.
- `src/db/adapters/firebase/{merchant,buyer,cart,transaction}.ts` —
  each ~10 lines, just wires the client through `tryCatchAsync`.
- `src/db/index.ts` — single swap point. `db.merchants`, `db.buyers`,
  `db.carts`, `db.transactions`.
- Updated port types in `src/db/ports/*` to add Dodo-linked fields:
  `dodoPaymentId`, `dodoCustomerId`, `dodoBusinessId`,
  `preferredCurrency`, `currency`, `expiresAtIso`, `updatedAtIso`,
  `storefrontDescription`, `storefrontLogoUrl`.

### Pre-existing POC route fixes (snuck into this commit)

- `src/app/api/checkout/route.ts` switched from raw `process.env` to
  validated `env` (was failing typecheck under
  `exactOptionalPropertyTypes`).
- `dodopayments` promoted from a transitive dep to a direct dep in
  `package.json` (TypeScript couldn't resolve the module).

### Verification

`npm run typecheck` — zero errors across the project. There's no real
smoke (would need Firebase service account credentials), but the contract
is enforced by TypeScript: every adapter method satisfies its port
interface.

---

## Stage 5 — API Routes

**Goal:** Wire HTTP transport. Routes are thin: decode → call service →
map error to status.

### Files

- `src/lib/http/errorMap.ts` — single source of truth for error → HTTP
  status. `RouteError` is the discriminated union over every error type
  that can leave a service or external client. `mapErrorToStatus()` and
  `errorResponse()` are the public API. Routes never recreate this mapping.
- `src/lib/dodo/errors.ts` — extended with `WebhookSignatureError`.
- `src/lib/dodo/client.ts` — extended with `verifyWebhook()` that wraps
  the SDK's `webhooks.unwrap()` in `tryCatchAsync`.
- `src/app/api/cart/route.ts` — `POST` creates a cart. Body parsed via
  `tryCatchAsync` so bad JSON returns 400, not 500.
- `src/app/api/notify/route.ts` — refactored from POC. Validates via
  `parseNotification`, sends via `lib/expo/push`.
- `src/app/api/webhooks/dodo/route.ts` — signature verification runs
  BEFORE body parse. On `payment.succeeded`, looks up cart by
  `metadata.cartId`, marks it paid, records transaction. Returns 200
  once signature is valid (app-level failures are logged but acked, so
  Dodo doesn't retry our business logic).
- `src/app/api/_smoke.ts` — manual smoke runner.

### Status code contract

```
WEBHOOK_SIGNATURE_ERROR  →  401
*_VALIDATION_ERROR       →  400
DB_ERROR                 →  500
DODO_ERROR | EXPO_ERROR  →  502
```

### Smoke (verified at commit time)

```
npx tsx src/app/api/_smoke.ts
```

- `mapErrorToStatus` for all 6 types maps to the right status.
- Cart route 400 validation: empty body returns
  `CART_VALIDATION_ERROR` with 2 field errors.
- Cart route 400 bad JSON: short-circuits at parse before service is called.
- Webhook route 401: bogus signature rejected by Dodo's `unwrap()`,
  returns `WEBHOOK_SIGNATURE_ERROR` with the SDK's specific message.

---

## How to verify the whole stack

From the project root, with deps installed (`pnpm install`):

```sh
# 1. Type contract holds across all layers
./node_modules/.bin/tsc --noEmit

# 2. Stage-by-stage smoke
npx tsx src/zod/_smoke.ts          # Stage 1: validation
npx tsx src/services/_smoke.ts     # Stage 2: services + fake DB
npx tsx src/lib/_smoke.ts          # Stage 3: external clients
npx tsx src/app/api/_smoke.ts      # Stage 5: routes (sets fake env first)
```

Stage 4 has no smoke — it's verified by typecheck (every adapter method
satisfies its port). A real smoke would require a Firebase service
account and is deferred to Stage 7 (E2E).

---

## Files / decisions worth a closer look

For a fast review, focus on these in order:

1. **`src/lib/http/errorMap.ts`** — the contract that ties routes,
   services, and external clients together. If this is right, the rest
   composes naturally.
2. **`src/db/adapters/firebase/client.ts`** — the most subtle file. JWT
   signing on the edge, Firestore typed-field encoding. Worth a careful
   read to verify the auth flow.
3. **`src/services/cart.service.ts`** — the only "thick" service.
   UUID generation, subtotal computation, expiry calculation, status
   lifecycle. Everything else is just orchestration.
4. **`src/zod/_helpers.ts`** — small but important: bridges Zod's
   inference to `exactOptionalPropertyTypes`. Without it the schema /
   port types diverge.
5. **`src/app/api/webhooks/dodo/route.ts`** — verifies the
   "signature-before-body-parse" rule from the architecture.

---

## What's still ahead

- **Stage 6 — UI in slices.** Per `STAGED_DEV.md`: Billing panel + QR,
  Product list, Transactions, Auth + dashboard, Profile. One slice at a
  time, each with real data + loading/error states.
- **Stage 7 — End-to-end payment lifecycle.** Cart create → invoice
  create → URI/QR → webhook confirm → cart closed → transaction visible.
  E2E with mocked Dodo + webhook callback.

The pre-existing POC routes (`api/checkout`, `api/customer-portal`,
`api/webhook`, `api/inlineCheckout`) and the `InlineCheckout/page.tsx` are
still in the tree. They predate the architecture and should be
deleted/replaced as Stage 6 brings real UI online.
