#!/bin/bash
# Test swiss-pptx-api after deployment
set -e

HOST=${1:-localhost:3000}

echo "=== Health Check ==="
curl -sf "$HOST/api/health" | python3 -m json.tool

echo ""
echo "=== Generate PPTX ==="
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
curl -s -X POST "$HOST/api/generate" \
  -H "Content-Type: application/json" \
  -d @"$SCRIPT_DIR/test-payload.json" \
  -o "$SCRIPT_DIR/test-output.pptx" \
  -w "HTTP %{http_code} | Size: %{size_download} bytes | Time: %{time_total}s\n"

echo ""
echo "=== Output File ==="
ls -lh "$SCRIPT_DIR/test-output.pptx"
echo "Done!"
