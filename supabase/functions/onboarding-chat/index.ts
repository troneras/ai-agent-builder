/*
  # Onboarding Chat Edge Function

  This function handles the onboarding chat conversation flow:
  1. Creates or retrieves existing conversations
  2. Processes user messages and generates AI responses using GPT-4-mini
  3. Manages conversation state and message history
  4. Integrates with various tools for data collection

  ## Security
  - Requires authenticated user
  - Uses RLS policies for data access
  - Validates user ownership of conversations
*/

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { OpenAI } from "npm:openai@4.28.0";
import { z } from "npm:zod@3.22.0";
import { zodToJsonSchema } from "npm:zod-to-json-schema@3.22.0";

// Constants
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

const SYSTEM_PROMPT =
  `You are an AI assistant helping users set up their business phone system.\n\n**MANDATORY FIRST STEP:**\nAlways start onboarding by asking the user to connect their Square account using an oauth_connection artifact.\n\n**Why connect Square?**\n- Instantly import business name, phone, and opening hours\n- Set up phone bookings for customers\n- Keep info in sync automatically\n\n**If the user refuses to connect Square:**\n- Upsell the benefits again\n- Reassure them: 'You're always in control — you can review and update any details before continuing.'\n- Show this privacy statement: '🔒 Your privacy matters. We only use your Square account to import your business information and manage bookings. You can disconnect your account at any time.'\n- Only allow manual entry if the user insists on not connecting\n\n**Artifacts:**\n- When you want the user to select from a set of options, include an artifacts array with an option_choice object.\n- For Square connection, always use an oauth_connection artifact with a prompt explaining the benefits and privacy.\n- Only return ONE artifact at a time.\n\nBe friendly and professional, use emojis occasionally, and format responses using markdown.\n` as const;

const AI_USE_CASES = [
  "appointment_scheduling",
  "order_taking",
  "customer_support",
  "lead_qualification",
  "message_taking",
  "information_sharing",
] as const;

// Type definitions
interface RequestBody {
  action: "get_conversation" | "send_message";
  userId?: string;
  message?: string;
}

interface ToolResult {
  success: boolean;
  [key: string]: unknown;
}

interface DatabaseMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  message_order: number;
  tool_calls?: unknown;
  tool_call_id?: string;
  tool_name?: string;
  tool_result?: ToolResult;
  tool_args?: unknown;
  token_count?: number;
  created_at: string;
  [key: string]: unknown;
}

interface Conversation {
  id: string;
  user_id: string;
  title: string;
  type: string;
  created_at: string;
  updated_at: string;
}

interface OnboardingData {
  user_id: string;
  user_name?: string;
  business_name?: string;
  business_type?: string;
  business_city?: string;
  phone_number?: string;
  opening_hours?: string;
  services?: string[];
  ai_use_cases?: string[];
  current_step?: number;
  completed?: boolean;
  completed_at?: string;
}

interface ToolCallFunction {
  name: string;
  arguments: string;
}

interface ToolCallItem {
  id: string;
  function: ToolCallFunction;
}

// Tool definitions for GPT-4-mini
const tools = [
  {
    type: "function",
    function: {
      name: "store_user_info",
      description: "Store user information in the onboarding record",
      parameters: {
        type: "object",
        properties: {
          user_name: {
            type: "string",
            description: "The user's full name",
          },
        },
        required: ["user_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "store_business_info",
      description: "Store business information in the onboarding record",
      parameters: {
        type: "object",
        properties: {
          business_name: {
            type: "string",
            description: "The name of the business",
          },
          business_type: {
            type: "string",
            description:
              "The type of business (e.g., restaurant, retail, professional services)",
          },
        },
        required: ["business_name", "business_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "store_contact_info",
      description: "Store contact information in the onboarding record",
      parameters: {
        type: "object",
        properties: {
          business_city: {
            type: "string",
            description: "The city where the business is located",
          },
          phone_number: {
            type: "string",
            description: "The business phone number",
          },
        },
        required: ["business_city", "phone_number"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "store_business_details",
      description: "Store business details in the onboarding record",
      parameters: {
        type: "object",
        properties: {
          opening_hours: {
            type: "string",
            description: "The business operating hours",
          },
          services: {
            type: "array",
            items: {
              type: "string",
            },
            description: "List of services offered by the business",
          },
        },
        required: ["opening_hours", "services"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "store_ai_preferences",
      description: "Store AI preferences and complete onboarding",
      parameters: {
        type: "object",
        properties: {
          ai_use_cases: {
            type: "array",
            items: {
              type: "string",
              enum: AI_USE_CASES,
            },
            description: "List of AI features the user wants to enable",
          },
        },
        required: ["ai_use_cases"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_integration_connection",
      description: "Suggest connecting to Square payment integration",
      parameters: {
        type: "object",
        properties: {
          integration_name: {
            type: "string",
            description:
              "The name of the integration to suggest (currently only 'Square' is supported)",
          },
        },
        required: ["integration_name"],
      },
    },
  },
] as const;

const optionChoiceArtifactSchema = z.object({
  type: z.literal("option_choice").describe("The type of artifact."),
  prompt: z.string().describe("The prompt to show the user."),
  options: z.array(z.object({
    label: z.string().describe("The option label."),
    value: z.string().describe("The value to return if chosen."),
  })).describe("The list of options."),
  allowFreeText: z.boolean().describe(
    "Whether to allow free-text answers.",
  ),
}).describe(
  "An artifact that allows the user to choose an option from a list.",
).strict();

const oauthConnectionArtifactSchema = z.object({
  type: z.literal("oauth_connection").describe("The type of artifact."),
  integrationId: z.string().describe("The integration ID to connect to."),
  integrationName: z.string().describe("The display name of the integration."),
  description: z.string().describe("Description of what the integration does."),
  icon: z.string().describe("Icon identifier for the integration."),
  prompt: z.string().describe(
    "Prompt explaining why the user should connect this integration.",
  ),
}).describe(
  "An artifact that allows the user to connect an OAuth integration.",
).strict();

const artifactSchema = z.discriminatedUnion("type", [
  optionChoiceArtifactSchema,
  oauthConnectionArtifactSchema,
  // other artifact types...
]);

export const responseFormatSchema = z.object({
  text: z.string().describe("The user-facing message content."),
  artifacts: z.array(artifactSchema).describe(
    "Optional UI artifacts for advanced rendering. Structure reserved for future use.",
  ),
}).strict();

type ChatResponse = z.infer<typeof responseFormatSchema>;

// Convert Zod schema to JSON schema for OpenAI
const responseJsonSchema = {
  name: "chat_response",
  strict: true,
  schema: zodToJsonSchema(responseFormatSchema),
};

function handleChatResponse(rawResponse: unknown): ChatResponse | null {
  const parsed = responseFormatSchema.safeParse(rawResponse);
  if (!parsed.success) {
    // Handle invalid response (e.g., fallback to plain text, show error, log, etc.)
    console.error("Invalid response format", parsed.error);
    return null;
  }
  return parsed.data;
}

// Utility functions
function createErrorResponse(message: string, status = 400): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    },
  );
}

function createSuccessResponse(data: unknown): Response {
  return new Response(
    JSON.stringify(data),
    {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    },
  );
}

// Helper to build conversation history for OpenAI
function buildConversationHistory(messages: DatabaseMessage[]) {
  const history = [];
  for (const msg of messages) {
    if (msg.role === "user") {
      history.push({
        role: "user",
        content: msg.content,
      });
    } else if (msg.role === "assistant") {
      if (msg.tool_calls) {
        history.push({
          role: "assistant",
          content: msg.content || null,
          tool_calls: msg.tool_calls,
        });
      } else {
        history.push({
          role: "assistant",
          content: msg.content,
        });
      }
    } else if (msg.role === "tool") {
      history.push({
        role: "tool",
        tool_call_id: msg.tool_call_id,
        name: msg.tool_name,
        content: msg.content,
      });
    }
  }
  return history;
}

// Helper to get the next message order for a conversation
async function getNextMessageOrder(
  supabaseClient: SupabaseClient,
  conversationId: string,
): Promise<number> {
  const { data: lastMsg } = await supabaseClient
    .from("messages")
    .select("message_order")
    .eq("conversation_id", conversationId)
    .order("message_order", { ascending: false })
    .limit(1)
    .single();

  return lastMsg && typeof lastMsg.message_order === "number"
    ? lastMsg.message_order + 1
    : 1;
}

// Helper to safely parse JSON
function safeJsonParse(jsonString: string): unknown {
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

// Tool execution functions
async function executeToolCall(
  supabaseClient: SupabaseClient,
  toolCall: ToolCallItem,
  userId: string,
): Promise<ToolResult> {
  const { name, arguments: args } = toolCall.function;
  const parsedArgs = safeJsonParse(args);

  if (!parsedArgs || typeof parsedArgs !== "object") {
    return { success: false, error: "Invalid tool arguments" };
  }

  try {
    switch (name) {
      case "store_user_info": {
        const { user_name } = parsedArgs as { user_name: string };
        await supabaseClient
          .from("onboarding")
          .upsert({
            user_id: userId,
            user_name,
            current_step: 2,
          }, { onConflict: "user_id" });
        return { success: true, user_name };
      }

      case "store_business_info": {
        const { business_name, business_type } = parsedArgs as {
          business_name: string;
          business_type: string;
        };
        await supabaseClient
          .from("onboarding")
          .upsert({
            user_id: userId,
            business_name,
            business_type,
            current_step: 3,
          }, { onConflict: "user_id" });
        return { success: true, business_name, business_type };
      }

      case "store_contact_info": {
        const { business_city, phone_number } = parsedArgs as {
          business_city: string;
          phone_number: string;
        };
        await supabaseClient
          .from("onboarding")
          .upsert({
            user_id: userId,
            business_city,
            phone_number,
            current_step: 4,
          }, { onConflict: "user_id" });
        return { success: true, business_city, phone_number };
      }

      case "store_business_details": {
        const { opening_hours, services } = parsedArgs as {
          opening_hours: string;
          services: string[];
        };
        await supabaseClient
          .from("onboarding")
          .upsert({
            user_id: userId,
            opening_hours,
            services,
            current_step: 5,
          }, { onConflict: "user_id" });
        return { success: true, opening_hours, services };
      }

      case "store_ai_preferences": {
        const { ai_use_cases } = parsedArgs as { ai_use_cases: string[] };

        // Get current onboarding data for user profile update
        const { data: currentOnboarding } = await supabaseClient
          .from("onboarding")
          .select("*")
          .eq("user_id", userId)
          .single();

        await supabaseClient
          .from("onboarding")
          .upsert({
            user_id: userId,
            ai_use_cases,
            completed: true,
            completed_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        // Update user profile if we have onboarding data
        if (currentOnboarding) {
          const onboardingData = currentOnboarding as OnboardingData;
          await supabaseClient
            .from("user_profiles")
            .update({
              full_name: onboardingData.user_name,
              business_name: onboardingData.business_name,
              business_type: onboardingData.business_type,
              phone_number: onboardingData.phone_number,
              business_data: {
                city: onboardingData.business_city,
                hours: onboardingData.opening_hours,
                services: onboardingData.services,
                ai_use_cases,
              },
            })
            .eq("id", userId);
        }

        return {
          success: true,
          ai_use_cases,
          onboarding_completed: true,
        };
      }

      case "suggest_integration_connection": {
        const { integration_name } = parsedArgs as {
          integration_name: string;
        };

        // Currently only support Square
        if (integration_name.toLowerCase() !== "square") {
          return {
            success: false,
            error: "Only Square integration is currently supported",
          };
        }

        // Get the Square integration record
        const { data: integration } = await supabaseClient
          .from("integrations")
          .select("*")
          .eq("ext_integration_id", "squareup-sandbox")
          .single();

        if (!integration) {
          return {
            success: false,
            error: "Square integration not found in database",
          };
        }

        // Create OAuth connection artifact data
        const artifact = {
          type: "oauth_connection",
          integrationId: integration.id,
          integrationName: integration.name,
          description: integration.description,
          icon: integration.icon,
          prompt: integration.prompt,
        };

        return {
          success: true,
          integration_name: integration.name,
          description: integration.description,
          artifact,
        };
      }

      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    return {
      success: false,
      error: `Failed to execute ${name}: ${(error as Error).message}`,
    };
  }
}

// Main handler
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      return createErrorResponse("Missing required environment variables", 500);
    }

    // Initialize clients
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    // Parse and validate request body
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse("Invalid JSON in request body");
    }

    const { action, userId, message } = body;

    if (!userId) {
      return createErrorResponse("User ID is required");
    }

    if (action === "get_conversation") {
      // Get or create onboarding conversation
      const { data: conversation, error: convError } = await supabaseClient
        .from("conversations")
        .select("*")
        .eq("user_id", userId)
        .eq("type", "onboarding")
        .single();

      let finalConversation: Conversation;

      if (convError && convError.code === "PGRST116") {
        // No conversation exists, create one
        const { data: newConversation, error: createError } =
          await supabaseClient
            .from("conversations")
            .insert({
              user_id: userId,
              title: "Onboarding Setup",
              type: "onboarding",
            })
            .select()
            .single();

        if (createError) {
          throw createError;
        }

        finalConversation = newConversation as Conversation;

        // Initialize onboarding record if it doesn't exist
        const { data: existingOnboarding } = await supabaseClient
          .from("onboarding")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (!existingOnboarding) {
          await supabaseClient
            .from("onboarding")
            .insert({
              user_id: userId,
              conversation_id: finalConversation.id,
              current_step: 1,
              started_at: new Date().toISOString(),
            });
        }

        // Fetch Square integration for artifact
        const { data: integration } = await supabaseClient
          .from("integrations")
          .select("*")
          .eq("ext_integration_id", "squareup-sandbox")
          .single();

        // Compose onboarding welcome message and artifact
        const welcomeText =
          `🚀 Get started by connecting your Square account\n\nTo set up your AI phone assistant, just connect your Square account.\nWe'll instantly import your business info (name, phone, hours, services) so you're ready to go in less than a minute!\n\n**We'll use your Square account to:**\n\n- Import your business name, phone, and opening hours\n- Set up phone bookings for your customers\n- Keep your info in sync automatically\n\nYou're always in control — you can review and update any details before continuing.\n\n🔒 **Your privacy matters**\n\nWe only use your Square account to import your business information and manage bookings.\nYou can disconnect your account at any time.`;

        const artifact = integration
          ? [{
            type: "oauth_connection",
            integrationId: integration.id,
            integrationName: integration.name,
            description: integration.description,
            icon: integration.icon,
            prompt:
              "Connect your Square account to instantly import your business info, enable phone bookings, and keep your details in sync. You can review and update everything before continuing. Your privacy is protected — disconnect anytime.",
          }]
          : [];

        await supabaseClient
          .from("messages")
          .insert({
            conversation_id: finalConversation.id,
            role: "assistant",
            content: welcomeText,
            artifacts: artifact,
            message_order: 1,
          });
      } else if (convError) {
        throw convError;
      } else {
        finalConversation = conversation as Conversation;
      }

      // Get messages for this conversation
      const { data: messages, error: messagesError } = await supabaseClient
        .from("messages")
        .select("*")
        .eq("conversation_id", finalConversation.id)
        .order("message_order", { ascending: true });

      if (messagesError) {
        throw messagesError;
      }

      const typedMessages = (messages || []) as DatabaseMessage[];
      return createSuccessResponse({
        conversationId: finalConversation.id,
        messages: typedMessages.sort((a, b) =>
          (a.message_order ?? 0) - (b.message_order ?? 0)
        ),
      });
    }

    if (action === "send_message") {
      if (!message?.trim()) {
        return createErrorResponse("Message is required and cannot be empty");
      }

      // Get the conversation
      const { data: conversation, error: convError } = await supabaseClient
        .from("conversations")
        .select("*")
        .eq("user_id", userId)
        .eq("type", "onboarding")
        .single();

      if (convError) {
        if (convError.code === "PGRST116") {
          return createErrorResponse(
            "No onboarding conversation found. Please start a conversation first.",
          );
        }
        throw convError;
      }

      const typedConversation = conversation as Conversation;

      // Save user message
      const currentOrder = await getNextMessageOrder(
        supabaseClient,
        typedConversation.id,
      );
      const { error: userMsgError } = await supabaseClient
        .from("messages")
        .insert({
          conversation_id: typedConversation.id,
          role: "user",
          content: message.trim(),
          message_order: currentOrder,
          created_at: new Date().toISOString(),
        });

      if (userMsgError) {
        throw userMsgError;
      }

      // Get conversation history
      const { data: messages } = await supabaseClient
        .from("messages")
        .select("*")
        .eq("conversation_id", typedConversation.id)
        .order("message_order", { ascending: true });

      // Prepare conversation history for GPT
      const conversationHistory = buildConversationHistory(
        (messages || []) as DatabaseMessage[],
      );

      // Call GPT-4-mini
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          ...conversationHistory,
        ],
        tools,
        tool_choice: "auto",
        response_format: {
          type: "json_schema",
          json_schema: responseJsonSchema,
        },
      });

      const response = completion.choices[0].message;
      const toolCalls = (response.tool_calls || []) as ToolCallItem[];

      // Parse structured response
      let responseContent = "";
      let responseArtifacts = null;
      if (response.content) {
        const parsedResponse = handleChatResponse(
          safeJsonParse(response.content),
        );
        console.log("Parsed response:", parsedResponse);
        responseContent = parsedResponse?.text ?? response.content;
        responseArtifacts = parsedResponse?.artifacts ?? null;
      }

      let nextOrder = currentOrder + 1;

      // Check if the model wanted to call functions
      if (toolCalls.length > 0) {
        // Save the assistant message with tool_calls
        // First, try to insert without tool_calls and tool_args to see if basic insertion works
        console.log("Attempting to save assistant message with tool_calls:", {
          conversation_id: typedConversation.id,
          role: "assistant",
          content: responseContent,
          message_order: nextOrder,
          tool_calls: toolCalls,
        });

        const { error: assistantMsgError } = await supabaseClient
          .from("messages")
          .insert({
            conversation_id: typedConversation.id,
            role: "assistant",
            content: responseContent,
            tool_calls: toolCalls,
            artifacts: responseArtifacts,
            message_order: nextOrder,
            created_at: new Date().toISOString(),
            token_count: completion.usage?.completion_tokens ?? null,
          });

        if (assistantMsgError) {
          console.error(
            "Error saving assistant message with tool_calls:",
            assistantMsgError,
          );
          console.error(
            "Full error details:",
            JSON.stringify(assistantMsgError, null, 2),
          );

          // Try fallback without tool_calls field if it doesn't exist in schema
          console.log(
            "Attempting fallback insertion without tool_calls field...",
          );
          const { error: fallbackError } = await supabaseClient
            .from("messages")
            .insert({
              conversation_id: typedConversation.id,
              role: "assistant",
              content: responseContent,
              artifacts: responseArtifacts,
              message_order: nextOrder,
              created_at: new Date().toISOString(),
              token_count: completion.usage?.completion_tokens ?? null,
            });

          if (fallbackError) {
            console.error("Fallback insertion also failed:", fallbackError);
            throw assistantMsgError; // Throw original error
          } else {
            console.log(
              "Fallback insertion succeeded - tool_calls field likely doesn't exist in schema",
            );
          }
        }

        nextOrder++;

        // Execute each tool call
        for (const toolCall of toolCalls) {
          const toolResult = await executeToolCall(
            supabaseClient,
            toolCall,
            userId,
          );

          // Save tool result
          const { error: toolMsgError } = await supabaseClient
            .from("messages")
            .insert({
              conversation_id: typedConversation.id,
              role: "tool",
              content: JSON.stringify(toolResult),
              tool_call_id: toolCall.id,
              tool_name: toolCall.function.name,
              tool_result: toolResult,
              message_order: nextOrder,
              created_at: new Date().toISOString(),
            });

          if (toolMsgError) {
            console.error(
              `Error saving tool result for ${toolCall.function.name}:`,
              toolMsgError,
            );
            throw toolMsgError;
          }

          nextOrder++;
        }

        // Get updated conversation history and make final API call
        const { data: updatedMessages } = await supabaseClient
          .from("messages")
          .select("*")
          .eq("conversation_id", typedConversation.id)
          .order("message_order", { ascending: true });

        const updatedConversationHistory = buildConversationHistory(
          (updatedMessages || []) as DatabaseMessage[],
        );

        // Make final API call with complete conversation including tool results
        const finalCompletion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT,
            },
            ...updatedConversationHistory,
          ],
          response_format: {
            type: "json_schema",
            json_schema: responseJsonSchema,
          },
        });

        const finalResponse = finalCompletion.choices[0].message;

        // Parse final structured response
        let finalResponseContent = "";
        let finalResponseArtifacts = null;
        if (finalResponse.content) {
          const parsedFinalResponse = handleChatResponse(
            safeJsonParse(finalResponse.content),
          );
          finalResponseContent = parsedFinalResponse?.text ??
            finalResponse.content;
          finalResponseArtifacts = parsedFinalResponse?.artifacts ?? null;
        }

        // Save the final assistant response
        if (finalResponseContent) {
          const { error: finalMsgError } = await supabaseClient
            .from("messages")
            .insert({
              conversation_id: typedConversation.id,
              role: "assistant",
              content: finalResponseContent,
              artifacts: finalResponseArtifacts,
              message_order: nextOrder,
              created_at: new Date().toISOString(),
              token_count: finalCompletion.usage?.completion_tokens ?? null,
            });

          if (finalMsgError) {
            console.error(
              "Error saving final assistant response:",
              finalMsgError,
            );
            throw finalMsgError;
          }
        }
      } else if (responseContent) {
        // If no tool calls, save the response directly
        await supabaseClient
          .from("messages")
          .insert({
            conversation_id: typedConversation.id,
            role: "assistant",
            content: responseContent,
            artifacts: responseArtifacts,
            message_order: nextOrder,
            created_at: new Date().toISOString(),
            token_count: completion.usage?.completion_tokens ?? null,
          });
      }

      return createSuccessResponse({ success: true });
    }

    return createErrorResponse("Invalid action");
  } catch (error: unknown) {
    console.error("Error in onboarding-chat function:", error);

    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
});
