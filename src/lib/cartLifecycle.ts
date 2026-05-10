export const CART_PAYMENT_TTL_MS = 15 * 60 * 1000

export const getCartPaymentExpiryIso = (from: Date = new Date()): string =>
  new Date(from.getTime() + CART_PAYMENT_TTL_MS).toISOString()
