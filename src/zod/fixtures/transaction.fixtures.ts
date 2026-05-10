export const validTransaction = {
  id: 'txn_abc123',
  merchantId: 'm_abc123',
  buyerId: 'b_abc123',
  cartId: 'cart_abc123',
  dodoPaymentId: 'pay_xyz789',
  assetSymbol: 'USDC',
  currency: 'USD',
  amount: 40297,
  status: 'CONFIRMED',
  createdAtIso: '2026-05-08T10:05:00.000Z',
}

export const validTransactionPending = {
  id: 'txn_xyz789',
  merchantId: 'm_abc123',
  cartId: 'cart_xyz789',
  assetSymbol: 'SOL',
  currency: 'USD',
  amount: 19999,
  status: 'PENDING',
  createdAtIso: '2026-05-08T10:05:00.000Z',
}

export const invalidTransaction = {
  id: '',
  merchantId: '',
  cartId: '',
  assetSymbol: '',
  currency: 'INVALID',
  amount: -1,
  status: 'WHATEVER',
  createdAtIso: 'not-a-date',
}
