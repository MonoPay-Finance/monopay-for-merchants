import { merchantRepo } from './adapters/firebase/merchant'
import { buyerRepo } from './adapters/firebase/buyer'
import { cartRepo } from './adapters/firebase/cart'
import { transactionRepo } from './adapters/firebase/transaction'

export const db = {
  merchants: merchantRepo,
  buyers: buyerRepo,
  carts: cartRepo,
  transactions: transactionRepo,
}
