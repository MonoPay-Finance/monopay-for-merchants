// Strips undefined values from a validated object so it satisfies
// exactOptionalPropertyTypes — bridges Zod's `?: T | undefined` inference
// to the port types' stricter `?: T` shape. Use as a `.transform()` callback.
export const cleanOptional =
  <T>() =>
  (obj: object): T => {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) out[k] = v
    }
    return out as T
  }
