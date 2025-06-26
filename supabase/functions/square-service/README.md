# Square Service Edge Function

This Supabase Edge Function handles Square API interactions and data synchronization for the AI phone system.

## Features

- **Automatic Data Fetching**: Fetches business data from Square when a new connection is established
- **Location Management**: Retrieves and stores business locations with addresses and hours
- **Catalog Integration**: Fetches menu items, categories, and pricing information
- **Nango Integration**: Uses Nango connection credentials for secure API access
- **Data Storage**: Stores fetched data in Supabase for use by the AI phone system

## API Endpoints

### POST `/functions/v1/square-service`

**Request Body:**

```json
{
  "action": "fetch_business_data",
  "userId": "user-uuid",
  "connectionId": "nango-connection-id" // optional, will auto-detect if not provided
}
```

**Response:**

```json
{
  "success": true,
  "message": "Business data fetched and stored successfully",
  "data": {
    "locations_count": 2,
    "items_count": 15,
    "categories_count": 3
  }
}
```

## Data Structure

The function fetches and stores the following Square data:

### Locations

- Business locations with addresses
- Phone numbers
- Business hours
- Location IDs

### Catalog Items

- Menu items and products
- Descriptions and categories
- Pricing information
- Item variations

### Categories

- Product categories
- Category hierarchies

## Integration Flow

1. **OAuth Connection**: User connects Square via Nango OAuth
2. **Webhook Trigger**: Nango webhook notifies successful connection
3. **Data Fetch**: This service automatically fetches Square business data
4. **Storage**: Data is stored in `user_profiles.business_data` field
5. **AI Integration**: AI phone system can now access Square data for conversations

## Environment Variables

Required environment variables:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access
- `NANGO_SECRET_KEY`: Nango secret key for connection management

## Error Handling

- Graceful handling of API failures
- Detailed error logging
- Non-blocking integration (connection process continues even if data fetch fails)
- Automatic retry mechanisms for transient failures

## Security

- Uses Nango connection credentials (no direct API keys stored)
- Validates user ownership of connections
- Implements proper error handling and logging
- Uses service role for database operations

## Development

This function uses the shared Deno configuration from the parent directory:

- Import map for package resolution
- TypeScript configuration
- Linting and formatting rules

## Usage in AI Phone System

Once Square data is fetched, the AI phone system can:

- Reference menu items in conversations
- Access business hours for scheduling
- Use location information for directions
- Process orders with accurate pricing
- Provide personalized customer experiences
