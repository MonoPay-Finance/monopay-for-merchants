#!/bin/bash
TOKEN="${1:?Usage: $0 <ExpoToken>}"
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"ExponentPushToken[$TOKEN]\",
    \"title\": \"Solana Pay Request\",
    \"body\": \"Payment request received\",
    \"data\": {
      \"url\": \"solana:mvines9iiHiQTysrwkJjGf2gb9Ex9jXJX8ns3qwf2kN?amount=0.01&spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v\"
    }
  }"
