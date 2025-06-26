# Onboarding Chat Edge Function

This Supabase Edge Function handles the onboarding chat conversation flow for business phone system setup.

## Development Setup

### Prerequisites

1. **Deno**: This function uses Deno runtime. Make sure you have Deno installed.
2. **VS Code**: Recommended with the Deno extension for better development experience.
3. **Supabase CLI**: For local development and deployment.

### Configuration Files

The following configuration files have been set up for proper TypeScript support:

- `deno.json`: Deno configuration with TypeScript compiler options
- `import_map.json`: Maps npm packages to Deno-compatible URLs
- `tsconfig.json`: TypeScript configuration for the Edge Function
- `.vscode/settings.json`: VS Code workspace settings for Deno

### Development Workflow

1. **Local Development**:

   ```bash
   # Navigate to the function directory
   cd supabase/functions/onboarding-chat

   # Start local development server
   deno task dev
   ```

2. **Type Checking**:

   ```bash
   # Check types
   deno check index.ts

   # Lint code
   deno lint

   # Format code
   deno fmt
   ```

3. **Testing with Supabase CLI**:

   ```bash
   # Start Supabase locally
   supabase start

   # Deploy function
   supabase functions deploy onboarding-chat
   ```

### Import Resolution

The function uses an import map to resolve npm packages:

- `@supabase/supabase-js` → `npm:@supabase/supabase-js@2`
- `openai` → `npm:openai@4.28.0`
- `zod` → `npm:zod@3.22.0`
- `zod-to-json-schema` → `npm:zod-to-json-schema@3.22.0`

### TypeScript Support

The function is configured with strict TypeScript settings:

- Strict null checks
- No implicit any
- Exact optional property types
- Unchecked indexed access warnings

### Environment Variables

Required environment variables:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access
- `OPENAI_API_KEY`: OpenAI API key for GPT-4-mini

### Function Features

1. **Conversation Management**: Creates and manages onboarding conversations
2. **AI Integration**: Uses GPT-4-mini for natural language processing
3. **Tool Execution**: Executes various tools for data collection
4. **Structured Responses**: Uses JSON schema for consistent response formatting
5. **Database Integration**: Stores conversation history and onboarding data

### API Endpoints

- `POST /functions/v1/onboarding-chat`
  - Action: `get_conversation` - Retrieve or create conversation
  - Action: `send_message` - Send message and get AI response

### Data Flow

1. User starts onboarding conversation
2. AI assistant collects business information progressively
3. Information is stored in the `onboarding` table
4. User profile is updated with collected data
5. Onboarding is marked as completed

### Troubleshooting

If you encounter TypeScript errors:

1. Make sure Deno extension is enabled in VS Code
2. Check that `deno.json` is properly configured
3. Verify import map is correct
4. Restart TypeScript language server in VS Code

For deployment issues:

1. Check environment variables are set
2. Verify Supabase project configuration
3. Check function logs in Supabase dashboard
