# DB Pattern Notes (Stage 0)

## Adapter Usage (First Read)

- Stage 0 has no adapter initialization code yet.
- Keep `src/db/ports/*` as contracts only.
- Add adapter wiring in the next stage (`src/db/adapters/*` + `src/db/index.ts`).
- Do not initialize adapters in `useEffect`, `Home()`, or `RootLayout()`.
- Adapter setup belongs in server-only bootstrap or API/server entry paths.

## Purpose

- Define stable data-access contracts before writing real database code.
- Keep service logic independent from database vendor details.
- Enforce typed error flow from the start.

## Pattern 1: Ports First

- **What:** `src/db/ports/*.repository.ts` defines repository interfaces and domain data shapes.
- **Why:** Services depend on contracts, not Firebase-specific implementation details.
- **How:** Each repository method exposes operation intent (`getById`, `create`, `listByMerchant`, etc.) with typed inputs/outputs.
- **Why now:** Early contract stability reduces rewrite churn when adapters are implemented.

## Pattern 2: Adapter Boundary

- **What:** `src/db/adapters/*` is the only place where provider-specific logic lives.
- **Why:** Firebase, Supabase, or another DB should be swappable without changing services.
- **How:** Adapters implement the repository interfaces defined in ports.
- **Why now:** We keep infrastructure decisions reversible while requirements are still evolving.

## Pattern 3: Single Adapter Access Point

- **What:** A future `src/db/index.ts` file will be the entry point for active adapter access.
- **Why:** One access point prevents scattered adapter wiring across the codebase.
- **How:** It will expose adapter registration and retrieval in one place.
- **Why now:** We document this early so Stage 1 implementation stays consistent.

## Pattern 4: Typed Error Contract

- **What:** `src/db/errors.ts` defines `DBError` as the database error shape.
- **Why:** A consistent error contract simplifies handling at service and API boundaries.
- **How:** DB failures are mapped to `{ type: 'DB_ERROR', message, cause? }`.
- **Why now:** Early consistency avoids mixed and incompatible error formats later.

## Pattern 5: Result-Based Return Types

- **What:** DB contracts return `SyncResult` / `AsyncResult` instead of throwing.
- **Why:** Errors become explicit values that callers must handle.
- **How:** Result types are inferred from `src/lib/result.ts` wrappers (`tryCatchSync`, `tryCatchAsync`).
- **Why now:** This aligns every layer to one failure-handling model from day one.

