# Architecture Overview

## Seed Ideas

- **Clear boundaries** — each layer has one job and knows nothing about the others
- **Safe error handling** — no throws, no silent failures, errors are values
- **Type safety end-to-end** — from raw input to DB, everything is typed and validated
- **Swappable infrastructure** — DB, auth, or any external service can be replaced without touching business logic

---

## Seed Ideas → Tech Stack

| Idea | Tech |
|---|---|
| Clear boundaries | Next.js App Router — route → service → db, each a distinct layer |
| Safe error handling | `neverthrow` — `Result<T, E>` and `ResultAsync<T, E>` instead of try/catch |
| Type safety & validation | `zod` — schemas define the shape, parse at the boundary |
| Swappable infrastructure | Repository pattern — ports (interfaces) + adapters (implementations) |
| Edge-compatible deployment | Cloudflare Workers — Next.js edge runtime, no Node-only dependencies |
| Scalable state | React Context at the top, Zustand available if needed |

---

## Structure

```
src/
├── app/
│   ├── _components/        # Shared UI components
│   ├── (auth)/             # Route groups
│   ├── (dashboard)/
│   ├── layout.tsx          # Context providers live here
│   └── page.tsx
│
├── lib/
│   ├── result.ts           # tryCatchSync, tryCatchAsync
│   ├── validation.ts       # parseWith, makeValidationError
│   └── context/
│       └── AppContext.tsx
│
├── zod/
│   └── schemas/            # One file per domain
│       └── account.schema.ts
│
├── db/
│   ├── ports/              # Interfaces — what the DB can do
│   ├── adapters/           # Implementations — Firestore, Supabase, etc.
│   │   ├── firestore/
│   │   └── supabase/
│   ├── errors.ts           # Shared DBError type
│   └── index.ts            # Active adapter — swap here only
│
├── services/               # Business logic — orchestrates validation + db
│   └── account.service.ts
│
└── utils/
    ├── format.ts
    └── constants.ts
```

---

## Patterns Per Layer

### `lib/` — Infrastructure Primitives

Two core wrappers that everything else builds on.

`tryCatchSync` wraps any synchronous operation that can throw into a `Result<T, E>`.
`tryCatchAsync` wraps any async operation into a `ResultAsync<T, E>`.

These are the only place in the codebase where try/catch is used.
All errors flow out as typed values from here.

`parseWith` and `makeValidationError` form the validation primitive.
`parseWith` runs a Zod schema and maps the result to neverthrow's `Result`.
`makeValidationError` is a factory that binds an error type string to a ZodError mapper — keeping per-domain validation wiring minimal.

---

### `zod/schemas/` — Validation Boundary

One file per domain. Each file owns:
- The Zod schema
- The inferred TypeScript type
- The domain-specific error type (e.g. `AccountValidationError`)
- A `parseX` function as the public API

Validation is always **synchronous**. It is always the **first step** before any IO.
If validation fails, nothing else runs.

```ts
const parsed = parseAccount(rawData)
if (parsed.isErr()) return parsed

const account = parsed.value  // typed as Account, guaranteed valid
```

Error types follow the convention: `DOMAIN_VALIDATION_ERROR` (uppercase, suffix enforced by type).

---

### `db/` — Data Access Layer

Built on the **repository pattern** to keep infrastructure swappable.

**Ports** (`db/ports/`) define interfaces — what operations exist, what they return.
They know nothing about Firestore, Supabase, or any specific DB.

**Adapters** (`db/adapters/`) implement those interfaces for a specific DB.
Each adapter function wraps its DB call in `tryCatchAsync` and maps errors to `DBError`.

**`db/index.ts`** exports the active adapter. Swapping the DB means changing one line here.

DB functions:
- Always return `ResultAsync<T, DBError>`
- Never validate input — they assume it is already parsed
- Never throw — `tryCatchAsync` handles it

---

### `services/` — Business Logic Layer

The only layer that knows about both validation and data access.
It orchestrates the flow: parse → check → act.

```ts
// parse first
const parsed = parseAccount(rawData)
if (parsed.isErr()) return parsed

// then query
const existing = await accountRepo.getAccount(parsed.value.wallet)
if (existing.isOk()) return err({ type: 'ACCOUNT_ALREADY_EXISTS' })

// then write
return accountRepo.createAccount(parsed.value)
```

Services know nothing about HTTP — no `Request`, no `Response`.
They return `Result` or `ResultAsync`. That is all.

---

### `app/api/` — API Route Layer

Thin layer. One job: call a service, map the result to an HTTP response.

```ts
export async function POST(req: Request) {
  const body = await req.json()
  const result = await createAccountService(body)

  if (result.isErr()) return Response.json(result.error, { status: 400 })
  return Response.json(result.value, { status: 201 })
}
```

No business logic here. No validation here. No DB calls here.

---

### `app/_components/` — UI Components

Shared components used across routes.
Route-specific components live inside their own route folder.
Context providers are mounted in `app/layout.tsx` at the top.
Zustand stores can be added under `lib/store/` if context is not enough.

---

## Error Design

Every error is a plain object with a `type` field.

```ts
type DBError = { type: 'DB_ERROR'; message: string }
type AccountValidationError = { type: 'ACCOUNT_VALIDATION_ERROR'; fields: FieldError[] }
type AccountExistsError = { type: 'ACCOUNT_ALREADY_EXISTS' }
```

Union error types emerge naturally at the service boundary:

```ts
ResultAsync<Account, AccountValidationError | DBError | AccountExistsError>
```

No error classes. No thrown exceptions outside of `tryCatchSync` / `tryCatchAsync`.
Errors are data — they can be logged, serialized, and returned to the client as-is.
