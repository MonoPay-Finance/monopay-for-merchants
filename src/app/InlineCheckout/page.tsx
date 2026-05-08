"use client";

import { useEffect, useState } from 'react';
import { DodoPayments, CheckoutBreakdownData } from 'dodopayments-checkout';

// Components
const OrderRow = ({ label, value, className = "text-gray-700" }: { 
  label: string; 
  value: string; 
  className?: string 
}) => (
  <div className={`flex justify-between ${className}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

const Divider = () => <hr className="border-gray-300 my-2" />;

const OrderSummary = ({ breakdown }: { breakdown: Partial<CheckoutBreakdownData> }) => {
  const format = (amt: number | null | undefined, curr: string | null | undefined) =>
    amt != null && curr ? `${curr} ${(amt / 100).toFixed(2)}` : '0.00';

  const currency = breakdown.currency ?? breakdown.finalTotalCurrency ?? '';

  return (
    <div className="w-full md:w-1/2 p-8 bg-gray-100 border-l-2 border-gray-300">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Order Summary</h2>
      <div className="space-y-2">
        {breakdown.subTotal && (
          <OrderRow label="Subtotal" value={format(breakdown.subTotal, currency)} />
        )}
        {breakdown.discount ? (
          <OrderRow label="Discount" value={`- ${format(breakdown.discount, currency)}`} className="text-green-600" />
        ) : null}
        {breakdown.tax != null && (
          <OrderRow label="Tax" value={format(breakdown.tax, currency)} />
        )}
        <Divider />
        {(breakdown.finalTotal ?? breakdown.total) && (
          <OrderRow
            label="Total"
            value={format(breakdown.finalTotal ?? breakdown.total, breakdown.finalTotalCurrency ?? currency)}
            className="font-bold text-xl text-gray-900"
          />
        )}
      </div>
    </div>
  );
};

const CheckoutForm = () => (
  <div className="w-full md:w-1/2 flex items-center">
    <div id="dodo-inline-checkout" className="w-full" />
  </div>
);

// Main Page
export default function CheckoutPage() {
  const [breakdown, setBreakdown] = useState<Partial<CheckoutBreakdownData>>({});

  useEffect(() => {
    const init = async () => {
      const res = await fetch('/api/inlineCheckout', { method: 'POST' });
      if (!res.ok) {
        console.error('API error:', res.status, res.statusText);
        return;
      }

      const { sessionId } = await res.json() as { sessionId: string };
      console.log('sessionId:', sessionId);

      DodoPayments.Initialize({
        mode: 'test',
        displayType: 'inline',
        onEvent: (event) => {
          console.log('event received:', event.event_type, event.data);
          if (event.event_type === "checkout.breakdown") {
            const message = event.data?.message as CheckoutBreakdownData;
            if (message) setBreakdown(message);
          }
        }
      });

      const el = document.getElementById('dodo-inline-checkout');
      if (el) {
        DodoPayments.Checkout.open({
          checkoutUrl: `https://test.checkout.dodopayments.com/session/${sessionId}`,
          elementId: 'dodo-inline-checkout'
        });
      }
    };

    init();
    return () => DodoPayments.Checkout.close();
  }, []);

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <CheckoutForm />
      <OrderSummary breakdown={breakdown} />
    </div>
  );
}