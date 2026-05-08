import DodoPayments from 'dodopayments';
import { NextResponse } from 'next/server';

const client = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  environment: 'test_mode',
});

export async function POST() {
    //console.log('API Key:', process.env.DODO_PAYMENTS_API_KEY);
    try {
        const session = await client.checkoutSessions.create({
        product_cart: [{ product_id: 'pdt_0NcfzBYGOI1KbMEzA2ItS', quantity: 1 }],
        return_url: process.env.DODO_PAYMENTS_RETURN_URL ?? 'http://localhost:3000/success',
        });

        console.log('session:', session);
        return NextResponse.json({ sessionId: session.session_id });
    } catch (error) {
        console.error('Dodo error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}