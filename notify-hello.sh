#!/bin/bash
TOKEN="${1:?Usage: $0 <ExpoToken>}"
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"ExponentPushToken[$TOKEN]\",
    \"title\": \"Hello\",
    \"body\": \"Test notification\"
  }"
