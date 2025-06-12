import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface OnboardingData {
  user_name?: string
  business_name?: string
  business_type?: string
  business_city?: string
  full_address?: string
  phone_number?: string
  contact_email?: string
  website?: string
  opening_hours?: string
  services?: string[]
  ai_use_cases?: string[]
  onboarding_completed?: boolean
}

const SYSTEM_PROMPT = `You are Cutcall's friendly onboarding assistant. Your job is to help business owners set up their AI phone assistant by gathering essential information about their business.

CRITICAL RULES:
1. NEVER store any data without explicit user confirmation
2. Always ask "Does this look correct?" or "Should I save this information?" before storing
3. Only use store tools AFTER the user confirms the data is accurate
4. If user says "no" or corrects information, update your understanding but don't store until they confirm
5. Present web search results clearly and ask for confirmation before storing

CONVERSATION FLOW:
1. Get user's name for personalization
2. Get business name and type  
3. Get city/location
4. Use web search to find: opening hours, services, full address, phone, email, website
5. Present ALL found data clearly and confirm with user before storing
6. Ask about AI use cases (scheduling, quotes, customer service, etc.)
7. Complete onboarding when all info is gathered and confirmed

TOOL USAGE GUIDELINES:
- Always show friendly descriptions when using tools
- For web search: "🔍 Let me search for information about your business online..."
- For storing data: "💾 Great! I'll save that information to your profile."
- For completion: "✅ Perfect! Your phone assistant is ready to set up."

AI USE CASE EXPLANATIONS:
- **Appointment Scheduling**: "I can integrate with your Google Calendar to automatically find available slots and book appointments when customers call"
- **Quote/Budget Requests**: "I can collect customer requirements and generate detailed quotes, then email them directly to prospects"
- **Customer Support**: "I can handle common customer inquiries 24/7, escalating complex issues to you"
- **Lead Qualification**: "I can screen potential customers and collect their information before scheduling consultations"

PERSONALITY:
- Friendly and conversational
- Professional but not robotic
- Excited about helping their business grow
- Patient and understanding
- Use emojis and markdown for better readability

Remember: Confirmation is MANDATORY before storing any data!`

const tools = [
  {
    type: "function",
    function: {
      name: "store_user_name",
      description: "Store the user's name after confirmation",
      parameters: {
        type: "object",
        properties: {
          user_name: { type: "string", description: "The user's full name" }
        },
        required: ["user_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "store_business_name",
      description: "Store business name after confirmation",
      parameters: {
        type: "object",
        properties: {
          business_name: { type: "string", description: "The business name" }
        },
        required: ["business_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "store_business_type",
      description: "Store business type/industry after confirmation",
      parameters: {
        type: "object",
        properties: {
          business_type: { type: "string", description: "Type of business (e.g., restaurant, salon, plumbing)" }
        },
        required: ["business_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "store_business_city",
      description: "Store business city/location after confirmation",
      parameters: {
        type: "object",
        properties: {
          business_city: { type: "string", description: "City where the business is located" }
        },
        required: ["business_city"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "store_business_address",
      description: "Store complete business address after confirmation",
      parameters: {
        type: "object",
        properties: {
          full_address: { type: "string", description: "Complete business address" }
        },
        required: ["full_address"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "store_business_phone",
      description: "Store business phone number after confirmation",
      parameters: {
        type: "object",
        properties: {
          phone_number: { type: "string", description: "Business phone number" }
        },
        required: ["phone_number"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "store_business_email",
      description: "Store business email address after confirmation",
      parameters: {
        type: "object",
        properties: {
          contact_email: { type: "string", description: "Business email address" }
        },
        required: ["contact_email"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "store_business_hours",
      description: "Store business operating hours after confirmation",
      parameters: {
        type: "object",
        properties: {
          opening_hours: { type: "string", description: "Business operating hours" }
        },
        required: ["opening_hours"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "store_business_services",
      description: "Store list of business services after confirmation",
      parameters: {
        type: "object",
        properties: {
          services: { 
            type: "array", 
            items: { type: "string" },
            description: "List of services offered by the business" 
          }
        },
        required: ["services"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "store_business_website",
      description: "Store business website URL after confirmation",
      parameters: {
        type: "object",
        properties: {
          website: { type: "string", description: "Business website URL" }
        },
        required: ["website"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "store_ai_use_cases",
      description: "Store selected AI functionality preferences after confirmation",
      parameters: {
        type: "object",
        properties: {
          ai_use_cases: { 
            type: "array", 
            items: { type: "string" },
            description: "List of AI use cases the user wants to implement" 
          }
        },
        required: ["ai_use_cases"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "web_search_tool",
      description: "Search for business information online using GPT-4o-mini-search-preview",
      parameters: {
        type: "object",
        properties: {
          business_name: { type: "string", description: "Name of the business to search for" },
          business_type: { type: "string", description: "Type of business" },
          city: { type: "string", description: "City where the business is located" }
        },
        required: ["business_name", "business_type", "city"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "complete_onboarding",
      description: "Complete the onboarding process and mark it as finished",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Summary of the completed onboarding" }
        },
        required: ["summary"]
      }
    }
  }
]

async function callOpenAI(messages: ChatMessage[], stream: boolean = true) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      tools,
      tool_choice: 'auto',
      stream,
      temperature: 0.7,
      max_tokens: 1000
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  return response
}

async function callSearchModel(query: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-search-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a business information researcher. Search for and return detailed information about the specified business including: full address, phone number, email, website, operating hours, and services offered. Format the response as structured data.'
        },
        {
          role: 'user',
          content: query
        }
      ],
      temperature: 0.3,
      max_tokens: 800
    }),
  })

  if (!response.ok) {
    throw new Error(`Search API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

async function updateUserProfile(supabase: any, userId: string, updates: Partial<OnboardingData>) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        onboarding_data: updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()

    if (error) {
      console.error('Database update error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Profile update error:', err)
    return { success: false, error: 'Failed to update profile' }
  }
}

async function completeUserOnboarding(supabase: any, userId: string, finalData: OnboardingData) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        onboarding_completed: true,
        onboarding_step: -1,
        onboarding_data: finalData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()

    if (error) {
      console.error('Onboarding completion error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Onboarding completion error:', err)
    return { success: false, error: 'Failed to complete onboarding' }
  }
}

async function handleToolCall(toolCall: any, supabase: any, userId: string, currentData: OnboardingData) {
  const { name, arguments: args } = toolCall.function
  const parsedArgs = JSON.parse(args)

  let toolResult = ''
  let updatedData = { ...currentData }

  try {
    switch (name) {
      case 'store_user_name':
        updatedData.user_name = parsedArgs.user_name
        await updateUserProfile(supabase, userId, updatedData)
        toolResult = `💾 Stored user name: ${parsedArgs.user_name}`
        break

      case 'store_business_name':
        updatedData.business_name = parsedArgs.business_name
        await updateUserProfile(supabase, userId, updatedData)
        toolResult = `💾 Stored business name: ${parsedArgs.business_name}`
        break

      case 'store_business_type':
        updatedData.business_type = parsedArgs.business_type
        await updateUserProfile(supabase, userId, updatedData)
        toolResult = `💾 Stored business type: ${parsedArgs.business_type}`
        break

      case 'store_business_city':
        updatedData.business_city = parsedArgs.business_city
        await updateUserProfile(supabase, userId, updatedData)
        toolResult = `💾 Stored business city: ${parsedArgs.business_city}`
        break

      case 'store_business_address':
        updatedData.full_address = parsedArgs.full_address
        await updateUserProfile(supabase, userId, updatedData)
        toolResult = `💾 Stored business address: ${parsedArgs.full_address}`
        break

      case 'store_business_phone':
        updatedData.phone_number = parsedArgs.phone_number
        await updateUserProfile(supabase, userId, updatedData)
        toolResult = `💾 Stored business phone: ${parsedArgs.phone_number}`
        break

      case 'store_business_email':
        updatedData.contact_email = parsedArgs.contact_email
        await updateUserProfile(supabase, userId, updatedData)
        toolResult = `💾 Stored business email: ${parsedArgs.contact_email}`
        break

      case 'store_business_hours':
        updatedData.opening_hours = parsedArgs.opening_hours
        await updateUserProfile(supabase, userId, updatedData)
        toolResult = `💾 Stored business hours: ${parsedArgs.opening_hours}`
        break

      case 'store_business_services':
        updatedData.services = parsedArgs.services
        await updateUserProfile(supabase, userId, updatedData)
        toolResult = `💾 Stored business services: ${parsedArgs.services.join(', ')}`
        break

      case 'store_business_website':
        updatedData.website = parsedArgs.website
        await updateUserProfile(supabase, userId, updatedData)
        toolResult = `💾 Stored business website: ${parsedArgs.website}`
        break

      case 'store_ai_use_cases':
        updatedData.ai_use_cases = parsedArgs.ai_use_cases
        await updateUserProfile(supabase, userId, updatedData)
        toolResult = `💾 Stored AI use cases: ${parsedArgs.ai_use_cases.join(', ')}`
        break

      case 'web_search_tool':
        const searchQuery = `Find detailed information about "${parsedArgs.business_name}" ${parsedArgs.business_type} business in ${parsedArgs.city}. Include: full address, phone number, email, website, operating hours, and services offered.`
        const searchResults = await callSearchModel(searchQuery)
        toolResult = `🔍 **Search Results for ${parsedArgs.business_name}:**\n\n${searchResults}\n\n*Please review this information and let me know if it's accurate before I save it to your profile.*`
        break

      case 'complete_onboarding':
        updatedData.onboarding_completed = true
        await completeUserOnboarding(supabase, userId, updatedData)
        toolResult = `✅ **Onboarding Complete!**\n\n${parsedArgs.summary}\n\nYour AI phone assistant is now ready to be configured!`
        break

      default:
        toolResult = `❌ Unknown tool: ${name}`
    }
  } catch (error) {
    console.error(`Tool execution error for ${name}:`, error)
    toolResult = `❌ Error executing ${name}: ${error.message}`
  }

  return { toolResult, updatedData }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const { messages, userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get current user profile data
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('onboarding_data')
      .eq('id', userId)
      .single()

    let currentData: OnboardingData = profile?.onboarding_data || {}

    // Prepare messages with system prompt
    const fullMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ]

    // Call OpenAI API with streaming
    const response = await callOpenAI(fullMessages, true)

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          controller.close()
          return
        }

        try {
          let buffer = ''
          let currentToolCalls: any[] = []
          let toolCallIndex = 0

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue

                try {
                  const parsed = JSON.parse(data)
                  const delta = parsed.choices?.[0]?.delta

                  if (delta?.tool_calls) {
                    // Handle tool calls
                    for (const toolCall of delta.tool_calls) {
                      if (!currentToolCalls[toolCall.index]) {
                        currentToolCalls[toolCall.index] = {
                          id: toolCall.id,
                          type: toolCall.type,
                          function: { name: '', arguments: '' }
                        }
                      }

                      if (toolCall.function?.name) {
                        currentToolCalls[toolCall.index].function.name += toolCall.function.name
                      }
                      if (toolCall.function?.arguments) {
                        currentToolCalls[toolCall.index].function.arguments += toolCall.function.arguments
                      }
                    }
                  } else if (delta?.content) {
                    // Stream regular content
                    const chunk = `data: ${JSON.stringify({ content: delta.content })}\n\n`
                    controller.enqueue(new TextEncoder().encode(chunk))
                  }

                  // Check if tool calls are complete
                  if (parsed.choices?.[0]?.finish_reason === 'tool_calls' && currentToolCalls.length > 0) {
                    // Execute tool calls
                    for (const toolCall of currentToolCalls) {
                      if (toolCall.function.name && toolCall.function.arguments) {
                        const { toolResult, updatedData } = await handleToolCall(
                          toolCall, 
                          supabase, 
                          userId, 
                          currentData
                        )
                        currentData = updatedData

                        // Send tool result to client
                        const toolChunk = `data: ${JSON.stringify({ 
                          tool_result: toolResult,
                          tool_name: toolCall.function.name 
                        })}\n\n`
                        controller.enqueue(new TextEncoder().encode(toolChunk))
                      }
                    }
                    currentToolCalls = []
                  }
                } catch (parseError) {
                  console.error('Parse error:', parseError)
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error)
          const errorChunk = `data: ${JSON.stringify({ error: error.message })}\n\n`
          controller.enqueue(new TextEncoder().encode(errorChunk))
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})