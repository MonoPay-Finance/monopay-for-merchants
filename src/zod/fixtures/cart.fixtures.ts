export const validCart = {
  id: 'cart_abc123',
  merchantId: 'm_abc123',
  buyerId: 'b_abc123',
  status: 'OPEN',
  lineItems: [
    { productId: 'pdt_0Nc8XhbNPqTik6xxJS5iW', quantity: 1, unitAmount: 299 },
    { productId: 'pdt_002', quantity: 2, unitAmount: 19999 },
  ],
  subtotalAmount: 40297,
  expiresAtIso: '2026-05-08T10:15:00.000Z',
  createdAtIso: '2026-05-08T10:00:00.000Z',
  updatedAtIso: '2026-05-08T10:00:00.000Z',
}

export const validCartMinimal = {
  id: 'cart_xyz789',
  merchantId: 'm_abc123',
  status: 'OPEN',
  lineItems: [{ productId: 'pdt_002', quantity: 1, unitAmount: 19999 }],
  subtotalAmount: 19999,
  createdAtIso: '2026-05-08T10:00:00.000Z',
  updatedAtIso: '2026-05-08T10:00:00.000Z',
}

export const invalidCart = {
  id: '',
  merchantId: '',
  status: 'WHATEVER',
  lineItems: [],
  subtotalAmount: -10,
  createdAtIso: 'not-a-date',
  updatedAtIso: 'not-a-date',
}
