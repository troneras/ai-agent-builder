# Square Service - Testing Guide

This document explains how to test the Square service with mock data.

## Overview

The Square service has been wrapped with test functionality that allows you to:

- Test the data processing logic without a real Square connection
- Use mock data to verify the integration works correctly
- Test both the data fetching and storage functionality

## Test Mode

The service supports a `TEST_MODE` environment variable that enables mock data:

```bash
export TEST_MODE=true
```

When `TEST_MODE=true`, the service will:

- Use mock Square data instead of making real API calls
- Skip connection validation
- Use a mock Square client
- Still process and store data in Supabase (if configured)

## Mock Data

The service includes realistic mock data:

- **1 Location**: "Test Restaurant" with address and business hours
- **2 Items**:
  - Margherita Pizza (with Regular/Large variations)
  - Caesar Salad (with Regular variation)
- **2 Categories**: Pizza, Salads

## Testing Endpoints

### 1. Test Data Endpoint

Returns mock data without storing it in the database:

```bash
curl -X POST http://localhost:54321/functions/v1/square-service \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "action": "test_data",
    "userId": "test-user-123"
  }'
```

### 2. Fetch Business Data (Test Mode)

Fetches and stores mock data when `TEST_MODE=true`:

```bash
curl -X POST http://localhost:54321/functions/v1/square-service \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "action": "fetch_business_data",
    "userId": "test-user-123"
  }'
```

## Test Scripts

### Quick Test with curl

```bash
./test-square-curl.sh
```

### Deno Test Script

```bash
deno run --allow-env --allow-net test-square-service.ts
```

## Expected Response

When testing, you should see a response like:

```json
{
  "success": true,
  "message": "Test data generated successfully",
  "test_mode": true,
  "data": {
    "locations": [
      {
        "id": "LOCATION_1",
        "name": "Test Restaurant",
        "address": {
          "address_line_1": "123 Test Street",
          "address_line_2": "Suite 100",
          "locality": "Test City",
          "administrative_district_level_1": "CA",
          "postal_code": "12345",
          "country": "US"
        },
        "phone_number": "+1-555-123-4567",
        "business_hours": {
          "periods": [
            {
              "day_of_week": "MONDAY",
              "start_local_time": "09:00",
              "end_local_time": "17:00"
            }
          ]
        }
      }
    ],
    "items": [
      {
        "id": "ITEM_1",
        "name": "Margherita Pizza",
        "description": "<p>Classic tomato and mozzarella pizza</p>",
        "categories": [
          {
            "id": "CAT_1",
            "name": "Pizza"
          }
        ],
        "variations": [
          {
            "id": "VAR_1",
            "name": "Regular",
            "pricing_type": "FIXED_PRICING",
            "price_money": {
              "amount": 1500,
              "currency": "USD"
            }
          }
        ]
      }
    ],
    "categories": [
      {
        "id": "CAT_1",
        "name": "Pizza"
      }
    ]
  }
}
```

## Production Mode

To use with real Square data:

1. Set up a Square connection via Nango
2. Ensure `TEST_MODE` is not set or is `false`
3. Use the `fetch_business_data` action with a valid `userId` and `connectionId`

## Type Safety

The service uses proper Square SDK v40 types and includes type guards for:

- `isCatalogItem()` - Validates and extracts item data
- `isCatalogCategory()` - Validates and extracts category data
- `isCatalogItemVariation()` - Validates and extracts variation data

This ensures type safety and prevents runtime errors when processing Square catalog data.
