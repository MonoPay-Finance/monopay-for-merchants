export const validMerchant = {
  id: 'm_abc123',
  walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  displayName: 'Acme Coffee',
  storefrontName: 'Acme Coffee Shop',
  storefrontDescription: 'Best beans in town',
  preferredCurrency: 'USD',
  createdAtIso: '2026-05-08T10:00:00.000Z',
}

export const validMerchantMinimal = {
  id: 'm_xyz789',
  walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  displayName: 'Solo Operator',
  preferredCurrency: 'USD',
  createdAtIso: '2026-05-08T10:00:00.000Z',
}

export const invalidMerchant = {
  id: '',
  walletAddress: '',
  displayName: '',
  preferredCurrency: 'INVALID',
  createdAtIso: 'not-a-date',
}
