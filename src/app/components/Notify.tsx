// components/SendNotificationButton.tsx
"use client";

import { useState } from "react";
import { tryCatchAsync } from "@/utils/tryCatchResult";

const HARDCODED_TOKEN = "ExponentPushToken[eYa7WwJaslLHPgIIIwua2i]"; // replace with your token

export default function SendNotificationButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleClick = async () => {
    setStatus("loading");

    const result = await tryCatchAsync(
      () =>
        fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: HARDCODED_TOKEN,
            title: "Solana Pay Request",
            body: "Payment request received",
            data: { url: "solana:mvines9iiHiQTysrwkJjGf2gb9Ex9jXJX8ns3qwf2kN?amount=0.01&spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
          }),
        }).then((res) => res.json()),
      (e) => (e instanceof Error ? e.message : "Unknown error")
    );

    if (result.isOk()) {
      setStatus("success");
    } else {
      console.log("Notification error:", result.error);
      setStatus("error");
    }
  };

  return (
    <div>
      <button onClick={handleClick} disabled={status === "loading"}
        className="w-full py-3 px-4 rounded-lg font-medium text-black bg-white hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
      >
        {status === "loading" ? "Sending..." : "Send Notification"}
      </button>
      {status === "success" && <p>Notification sent!</p>}
      {status === "error" && <p>Failed to send notification.</p>}
    </div>
  );
}