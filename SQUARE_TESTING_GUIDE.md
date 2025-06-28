# Square API Independent Testing Guide

This guide provides comprehensive instructions for testing Square API calls independently from Supabase. You now have multiple options for testing your Square integration.

## 🎯 Overview

You can test Square API calls in three ways:

1. **Node.js Testing** (Recommended for development) - `test-square-api.js`
2. **Deno Testing** (For Supabase environment) - `supabase/functions/test-square-api-deno.ts`
3. **Mock Data Testing** (No API calls needed)

## 📋 Prerequisites

### For Node.js Testing

```bash
npm install square dotenv
```

### For Deno Testing

No installation needed - Deno handles npm imports automatically.

### Square Account Setup

1. Create a Square Developer Account at [https://developer.squareup.com](https://developer.squareup.com)
2. Create an application to get your access tokens
3. Get your **Sandbox Access Token** for testing
4. (Optional) Get your **Production Access Token** for live testing

## 🚀 Quick Start

### Option 1: Node.js Testing (Recommended)

#### Test with Mock Data (No API calls)

```bash
node test-square-api.js --mock
```

#### Test with Live API (Sandbox)

```bash
node test-square-api.js --live --token YOUR_SANDBOX_ACCESS_TOKEN
```

#### Test with Live API (Production)

```bash
node test-square-api.js --live --token YOUR_PRODUCTION_ACCESS_TOKEN --production
```

### Option 2: Deno Testing (Supabase Environment)

#### Test with Mock Data

```bash
cd supabase/functions
deno run --allow-env --allow-net test-square-api-deno.ts --mock
```

#### Test with Live API

```bash
cd supabase/functions
deno run --allow-env --allow-net test-square-api-deno.ts --live --token YOUR_ACCESS_TOKEN
```

## 🔧 Environment Variables

You can set environment variables instead of passing tokens as arguments:

### Node.js (.env file)

Create a `.env` file in your project root:

```env
SQUARE_ACCESS_TOKEN=your_access_token_here
SQUARE_ENVIRONMENT=sandbox  # or "production"
```

### Deno/Supabase

Set environment variables in your shell:

```bash
export SQUARE_ACCESS_TOKEN=your_access_token_here
export SQUARE_ENVIRONMENT=sandbox
```

## 📊 What Gets Tested

The test suite validates:

### 1. Merchant Information

- Merchant ID and business name
- Country and language settings
- Default currency

### 2. Location Data

- All business locations
- Addresses and contact information
- Business hours and timezone
- Phone numbers

### 3. Catalog Data

- Product items and variations
- Service offerings
- Pricing information
- Categories and descriptions

## 🎨 Sample Output

### Mock Data Test

```
🧪 Starting Square API Test Suite
Mode: MOCK DATA
==================================================

📋 Testing Merchant Information...
Using mock data
✅ Merchant ID: MERCHANT_123
✅ Business Name: Test Business
✅ Country: US
✅ Currency: USD

🏪 Testing Locations...
Using mock data
✅ Location 1: Main Store
   Address: 123 Main Street, San Francisco, CA
   Phone: +1-555-123-4567

📦 Testing Catalog...
Using mock data
✅ Found 1 item(s)
   Item 1: Coffee
   Variations: 2
✅ Found 1 service(s)
   Service 1: Consultation

🎉 All tests completed successfully!

📊 Summary:
   Merchant: Test Business
   Locations: 1
   Items: 1
   Services: 1
```

### Live API Test

```
🧪 Starting Square API Test Suite
Mode: LIVE API
==================================================

📋 Testing Merchant Information...
✅ Merchant ID: MLV4XXXXXXXXXXXX
✅ Business Name: Your Actual Business
✅ Country: US
✅ Currency: USD

🏪 Testing Locations...
✅ Found 2 location(s)
   Location 1: Main Location
   Address: 123 Real Street, Real City, CA
   Phone: +1-555-555-5555
   Location 2: Second Location
   Address: 456 Another St, Another City, CA

📦 Testing Catalog...
✅ Found 15 item(s)
   Item 1: Espresso
   Item 2: Cappuccino
   Item 3: Latte
   Item 4: Americano
   Item 5: Cold Brew
   ... and 10 more items
✅ Found 3 service(s)
   Service 1: Coffee Consultation
   Service 2: Barista Training
   Service 3: Equipment Maintenance

🎉 All tests completed successfully!

📊 Summary:
   Merchant: Your Actual Business
   Locations: 2
   Items: 15
   Services: 3
```

## 🔍 Debugging and Troubleshooting

### Common Issues

#### 1. "Access token required"

Make sure you're providing a valid access token:

```bash
node test-square-api.js --live --token YOUR_TOKEN_HERE
```

#### 2. "Invalid token" or "Unauthorized"

- Check that your token is correct
- Verify you're using the right environment (sandbox vs production)
- Ensure your token has the necessary permissions

#### 3. "Network error" or "Connection refused"

- Check your internet connection
- Verify Square API is accessible
- Try with mock data first: `--mock`

### Getting Detailed Error Information

The scripts provide detailed error messages. If you encounter issues:

1. First try with mock data to verify the script works
2. Check your access token is valid
3. Try with a different environment (sandbox vs production)
4. Check Square Developer Console for any account issues

## 📝 Integration with Your SquareService

The test scripts use the same API calls as your `SquareService` class. You can:

1. **Test your SquareService independently** before integrating with Supabase
2. **Validate your access tokens** work correctly
3. **Understand your data structure** before processing
4. **Debug API issues** without Supabase complexity

### Using SquareService in Tests

You can also test your actual `SquareService` class:

```javascript
import { SquareService } from "./supabase/functions/onboarding-chat/square-service.ts";

const service = new SquareService("YOUR_ACCESS_TOKEN");
const businessInfo = await service.getBusinessInformation();
console.log(businessInfo);
```

## 🔐 Security Notes

- **Never commit access tokens** to your repository
- Use **sandbox tokens** for development and testing
- Store **production tokens** securely using environment variables
- **Rotate tokens** regularly as recommended by Square

## 📚 Additional Resources

- [Square Developer Documentation](https://developer.squareup.com/docs)
- [Square API Reference](https://developer.squareup.com/reference/square)
- [Square Node.js SDK](https://github.com/square/square-nodejs-sdk)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## 🤝 Need Help?

1. Check the Square Developer Console for API status
2. Review the error messages in the test output
3. Test with mock data to isolate API vs. code issues
4. Verify your Square account settings and permissions

---

**Happy Testing! 🎉**

The independent testing scripts give you full control over testing your Square integration without the complexity of the Supabase environment.
