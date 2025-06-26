#!/bin/bash

echo "🧪 Testing Square Service with curl..."

# Test the test_data endpoint
echo "📊 Testing test_data endpoint..."
curl -X POST http://localhost:54321/functions/v1/square-service \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "action": "test_data",
    "userId": "test-user-123"
  }' | jq '.'

echo -e "\n\n🔧 Testing fetch_business_data endpoint (will fail without real connection)..."
curl -X POST http://localhost:54321/functions/v1/square-service \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "action": "fetch_business_data",
    "userId": "test-user-123"
  }' | jq '.'

echo -e "\n\n✅ Test completed!" 