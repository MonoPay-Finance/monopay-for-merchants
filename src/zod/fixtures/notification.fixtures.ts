export const validNotification = {
  token: 'ExponentPushToken[eYa7WwJaslLHPgIIIwua2i]',
  title: 'Solana Pay Request',
  body: 'Acme Coffee is requesting $40.29',
  data: {
    url: 'solana:mvines9iiHiQTysrwkJjGf2gb9Ex9jXJX8ns3qwf2kN?amount=0.01&spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    cartId: 'cart_abc123',
  },
}

export const validNotificationMinimal = {
  token: 'ExponentPushToken[eYa7WwJaslLHPgIIIwua2i]',
  title: 'Payment confirmed',
  body: 'Thanks for your purchase',
}

export const invalidNotification = {
  token: '',
  title: '',
  body: '',
}
