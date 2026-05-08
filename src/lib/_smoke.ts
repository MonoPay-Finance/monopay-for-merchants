// Manual smoke check for Stage 3 external clients.
//   npx tsx src/lib/_smoke.ts
//
// Verifies checkpoint:
//  - Solana Pay URI: prints generated URI for known input
//  - Expo push: dry-runs payload (constructs but doesn't send)
//  - Dodo error mapping: invokes toDodoError with various shapes

import { buildSolanaPayURI } from './solana-pay/uri'
import { toDodoError } from './dodo/errors'
import { toExpoError } from './expo/errors'

console.log('=== Solana Pay URI ===')
const fullURI = buildSolanaPayURI({
  recipient: 'mvines9iiHiQTysrwkJjGf2gb9Ex9jXJX8ns3qwf2kN',
  amount: 0.01,
  splToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mainnet mint
  reference: 'cart_abc123',
  label: 'Acme Coffee',
  message: 'Order #1234',
})
console.log('  full     :', fullURI)

const minimalURI = buildSolanaPayURI({
  recipient: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
})
console.log('  minimal  :', minimalURI)

const multiRefURI = buildSolanaPayURI({
  recipient: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  amount: '1.50',
  reference: ['cart_abc123', 'merchant_m_001'],
  label: 'Acme',
})
console.log('  multi-ref:', multiRefURI)

console.log('\n=== Expo push (dry-run) ===')
const pushPayload = {
  token: 'ExponentPushToken[eYa7WwJaslLHPgIIIwua2i]',
  title: 'Solana Pay Request',
  body: 'Acme Coffee is requesting $0.01',
  data: { url: fullURI, cartId: 'cart_abc123' },
}
console.log('  payload:', JSON.stringify(pushPayload))
console.log('  → would POST to WORKER_URL with X-Secret header')
console.log('  → not invoked: dry-run')

console.log('\n=== Dodo error mapping ===')
console.log('  plain Error           →', toDodoError(new Error('Boom')))
console.log('  Error with .status=401→', toDodoError(Object.assign(new Error('Unauthorized'), { status: 401 })))
console.log('  Error with .status=500→', toDodoError(Object.assign(new Error('Internal'), { status: 500 })))
console.log('  string thrown         →', toDodoError('not even an error'))
console.log('  null thrown           →', toDodoError(null))

console.log('\n=== Expo error mapping ===')
console.log('  plain Error →', toExpoError(new Error('network down')))
console.log('  unknown     →', toExpoError({ weird: true }))

console.log('\n[done]')
