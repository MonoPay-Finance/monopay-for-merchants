# Project Development Plan

## Guiding Principle

Each stage solves one concern. A stage is not complete until its checkpoint passes. Agents do not move to the next stage until told to.

---

## Agent Rules (Apply to Every Stage)

- All validation must use `parseWith()` + `makeValidationError()` from `zodPattern.ts`
- All sync throws must use `tryCatchSync()`, all async throws must use `tryCatchAsync()` from `resultPatterns.ts`
- Every function that can fail must return `Result<T, E>` or `ResultAsync<T, E>` — never throw, never return null, never return undefined
- Never access env variables outside `lib/env.ts`
- Never generate a transformer or mapper outside existing patterns — stop and ask instead
- If a situation arises where these patterns don't fit, stop and ask instead of inventing an alternative
- Never touch files outside the current stage's scope

---

## Layer Order

```
Config & Types → Validation → Service Logic (faked) → External Adapters → DB Adapter → Routes → UI
```

Each layer only talks to the layer below it. Test each seam before moving on.

---

## Stage 0 — Config, Types & Skeleton

**Goal:** Lock structure and contracts so later generations don't drift.

**Tasks:**
- Set up `.env.local` and `.dev.vars` — never committed to git
- Define `types/env.d.ts` — single source of truth for all env variables
- Implement `lib/env.ts` — only place env variables are accessed, with Zod validation at startup
- Create folder/file skeleton from architecture
- Define all interfaces and types: `db/ports/*`, error types, `Result` primitives
- Implement `lib/result.ts` — `tryCatchSync`, `tryCatchAsync`
- Implement `lib/validation.ts` — `parseWith`, `makeValidationError`
- Add minimal `db/index.ts` adapter export

**Checkpoint:**
- `npm run typecheck` passes with zero errors
- `npm run lint` passes with zero errors
- No `any` or implicit `unknown` anywhere — enforced by compiler, not by manual checking

---

## Stage 1 — Validation Layer

**Goal:** Stable input contracts before any service or adapter is generated.

**Tasks:**
- Implement `zod/schemas/*` with `parseX` APIs using `parseWith()` + `makeValidationError()`
- Enforce `*_VALIDATION_ERROR` naming convention on all error types
- Add fixtures for valid and invalid payloads per domain

**Checkpoint:**
- Unit tests for every schema: valid input returns `isOk()`, invalid input returns `isErr()` with `fields[]` populated
- `npm run typecheck` passes
- Smoke: call `parseCart({ ...badData })` and log `result.error` to confirm shape

---

## Stage 2 — Service Logic with Fakes

**Goal:** Verify orchestration logic independently of any real database or API.

**Tasks:**
- Implement service flows against mocked ports — no real API calls
- Use in-memory fakes that satisfy port interfaces exactly
- Parse first, then query/write — always in that order

**Checkpoint:**
- Service unit tests with fakes: happy path, validation fail short-circuits, domain error path
- `npm run typecheck` passes
- Smoke: log `step: parse | lookup | write` through a service call to confirm order

---

## Stage 3 — External Client Adapters

**Goal:** Isolate third-party integration risk before it touches service logic.

**Tasks:**
- Implement `lib/dodo/client.ts`, `lib/expo/push.ts`, `lib/solana-pay/uri.ts`
- Wrap every external call with `tryCatchAsync()` and typed error mappers
- Map all third-party errors to your internal error types at the boundary

**Checkpoint:**
- Unit tests for pure helpers (Solana URI generation)
- Contract tests with mocked HTTP: success mapping, non-200 mapping, timeout mapping
- Smoke: print a generated Solana Pay URI for known input, dry-run a push payload without sending

---

## Stage 4 — Firebase Adapter

**Goal:** Repositories become real while service code stays completely unchanged.

**Tasks:**
- Implement `db/adapters/firebase/*` to satisfy existing port interfaces
- Keep `db/index.ts` as the single swap point between fake and real
- All returns must be `ResultAsync` — never throw

**Checkpoint:**
- Adapter tests with mocked Firebase REST responses
- Smoke script: create cart → fetch cart → mark cart paid
- Confirm return types are always `ResultAsync`, never raw throws

---

## Stage 5 — API Routes

**Goal:** Wire HTTP transport without leaking any logic into route handlers.

**Route job only:** decode request → call service → map error type to HTTP status code. Nothing else.

**Tasks:**
- Implement `api/cart/route.ts`, `api/notify/route.ts`, `api/webhooks/dodo/route.ts`
- Define one shared `mapErrorToStatus()` used across all routes — not recreated per route
- Webhook route: signature verification runs before body is parsed — fail with 401 immediately if invalid

**Checkpoint:**
- Route tests: 2xx happy path, 400 validation error, 401 webhook signature fail, 500 external failure
- `npm run typecheck` passes
- Smoke: log `error.type` and selected status code at route level

---

## Stage 6 — UI in Slices

**Goal:** Ship one complete, working screen at a time — not all screens simultaneously.

A slice is one screen that fetches real data, displays it, handles loading, and handles errors. Complete before moving to the next.

**Order (critical path first):**
1. Billing panel — cart + QR code (core payment flow)
2. Product list — required to add to cart
3. Transactions — confirms payment worked
4. Auth + dashboard shell
5. Profile/storefront

**Checkpoint per slice:**
- Component renders correctly with real data
- Loading and error states are handled
- Smoke: manually verify in browser with seeded data

---

## Stage 7 — End-to-End Payment Lifecycle

**Goal:** Verify the highest-value flow works completely.

**Full path:**
- Cart create → invoice create → URI/QR → webhook confirm → cart closed → transaction visible

**Push path:**
- Send notification → status updated

**Checkpoint:**
- E2E scenario with mocked Dodo + webhook callback
- Assert DB state transitions: `OPEN` → `PAID` / `EXPIRED`

---

## tsconfig.json

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "useUnknownInCatchVariables": true
  }
}
```

**Why each option:**
- `strict` — baseline, enables all strict checks
- `noImplicitAny` — agents cannot leave anything untyped
- `noUncheckedIndexedAccess` — `array[0]` returns `T | undefined`, forces null handling
- `exactOptionalPropertyTypes` — tightens optional fields on Zod-inferred types
- `noImplicitReturns` — every code path must return, catches missed error branches
- `noFallthroughCasesInSwitch` — `mapErrorToStatus` must handle every case explicitly
- `useUnknownInCatchVariables` — makes raw `try/catch` unusable, forces `tryCatchSync`/`tryCatchAsync`

---

## Checkpoint Rhythm After Every Stage

```
npm run typecheck   →  did agents break contracts between modules?
npm run lint        →  did agents quietly violate code rules?
npm run test        →  does the logic behave correctly?
smoke script        →  does it actually execute without blowing up?
```

All four green before the next stage begins.