## Legend
- **Result Pattern** — uses functions from `resultPattern`
- **Zod Pattern** — uses functions from `zodPattern` and `Zod` in general
- **Priority-3** = Most important | **Priority-1** = Least important

---

## Refactoring Checklist

1. **`src/app/api/webhooks/dodo/route.ts`** — Uses Result at the signature boundary, but app-level webhook side effects still need clearer logging/handling. Not needed for now. `Priority-1`

2. **`src/db/adapters/firebase/client.ts`** — Doesn't use the Zod + Result Pattern, hence is very long. Needed. `Priority-3`

3. **`src/db/adapters/in-memory/*.ts`** — Logic is unclear; wasn't outlined in the original plan. Needs cross-checking. `Priority-2`

4. **`src/lib/dodo/client.ts`**, **`src/lib/expo/push.ts`** — Validate external response shapes with Zod. Do not force Zod into ports or `errorMap`; those are typed internal contracts. Needed. `Priority-3`

5. **`src/lib/solana-pay/uri.ts`** — Over-engineered. Can be simplified via destructuring with the `solana-pay` SDK. Needed. `Priority-3`

6. **`src/services/cart.service.ts`** — Expiry time & logic is hardcoded; should be its own module. Done via `src/lib/cartLifecycle.ts`. `Priority-2`

7. **`src/services/merchant.service.ts`**, **`src/zod/_helpers.ts`** — Clarify what `upsertMerchant` does and how the logic is chained. `Priority-2`
