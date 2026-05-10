import { Checkout } from "@dodopayments/nextjs";
import { env } from "@/lib/env";

export const GET = Checkout({
  bearerToken: env.DODO_PAYMENTS_API_KEY,
  returnUrl: env.DODO_PAYMENTS_RETURN_URL,
  environment: env.DODO_PAYMENTS_ENVIRONMENT,
  type: "static",
});

export const POST = Checkout({
  bearerToken: env.DODO_PAYMENTS_API_KEY,
  returnUrl: env.DODO_PAYMENTS_RETURN_URL,
  environment: env.DODO_PAYMENTS_ENVIRONMENT,
  type: "session",
});
