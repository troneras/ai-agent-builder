import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  tool_call_id?: string
  name?: string
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
  thread_id?: string
  conversation_history?: ChatMessage[]
}

const SYSTEM_PROMPT = `You are Cutcall's friendly onboarding assistant. Your job is to help business owners set up their AI phone assistant by gathering essential information about their business.

CRITICAL RULES:
1. NEVER store any data without explicit user confirmation
2. Always ask "Does this look correct?" or "Should I save this information?" before storing
3. Only use store tools AFTER the user confirms the data is accurate
4. If user says "no" or corrects information, update your understanding but don't store until they confirm
5. After using web_search_tool, ALWAYS generate a response presenting the findings and asking for confirmation
6. After any tool execution, continue the conversation naturally - don't stop responding

CONVERSATION FLOW:
1. Get user's name for personalization
2. Get business name and type  
3. Get city/location
4. Use web search to find: opening hours, services, full address, phone, email, website
5. Present ALL found data clearly and confirm with user before storing
6. Ask about AI use cases (scheduling, quotes, customer service, etc.)
7. Complete onboarding when all info is gathered and confirmed

TOOL USAGE GUIDELINES:
- After web search: Present findings in a friendly way and ask for confirmation
- For storing data: Confirm what was saved and continue the conversation
- For completion: Celebrate and explain next steps
- ALWAYS continue the conversation after tool execution

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

CONVERSATION RESTORATION:
- If this is a restored conversation, acknowledge it briefly and continue naturally
- Review what information has already been collected
- Ask what the user would like to continue with or update

Remember: Confirmation is MANDATORY before storing any data! Always continue the conversation after tool execution.`

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
    }),
  })

  if (!response.ok) {
    throw new Error(`Search API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

async function getCurrentProfileData(supabase: any, userId: string): Promise<OnboardingData> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('onboarding_data')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return {}
    }

    return data?.onboarding_data || {}
  } catch (err) {
    console.error('Profile fetch error:', err)
    return {}
  }
}

async function updateUserProfile(supabase: any, userId: string, updates: Partial<OnboardingData>) {
  try {
    // Get current data first
    const currentData = await getCurrentProfileData(supabase, userId)
    const mergedData = { ...currentData, ...updates }

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        onboarding_data: mergedData,
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

async function saveConversationHistory(supabase: any, userId: string, threadId: string, messages: ChatMessage[]) {
  try {
    const updates = {
      thread_id: threadId,
      conversation_history: messages
    }
    
    return await updateUserProfile(supabase, userId, updates)
  } catch (err) {
    console.error('Error saving conversation:', err)
    return { success: false, error: 'Failed to save conversation' }
  }
}

async function restoreConversationHistory(supabase: any, threadId: string): Promise<{ messages: ChatMessage[], userId?: string }> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('onboarding_data, id')
      .contains('onboarding_data', { thread_id: threadId })
      .single()

    if (error || !data) {
      console.error('Error restoring conversation:', error)
      return { messages: [] }
    }

    const conversationHistory = data.onboarding_data?.conversation_history || []
    return { 
      messages: conversationHistory,
      userId: data.id
    }
  } catch (err) {
    console.error('Conversation restore error:', err)
    return { messages: [] }
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

async function handleToolCall(toolCall: any, supabase: any, userId: string) {
  const { name, arguments: args } = toolCall.function
  const parsedArgs = JSON.parse(args)

  let toolResult = ''
  let updates: Partial<OnboardingData> = {}

  try {
    switch (name) {
      case 'store_user_name':
        updates.user_name = parsedArgs.user_name
        await updateUserProfile(supabase, userId, updates)
        toolResult = `Stored user name: ${parsedArgs.user_name}`
        break

      case 'store_business_name':
        updates.business_name = parsedArgs.business_name
        await updateUserProfile(supabase, userId, updates)
        toolResult = `Stored business name: ${parsedArgs.business_name}`
        break

      case 'store_business_type':
        updates.business_type = parsedArgs.business_type
        await updateUserProfile(supabase, userId, updates)
        toolResult = `Stored business type: ${parsedArgs.business_type}`
        break

      case 'store_business_city':
        updates.business_city = parsedArgs.business_city
        await updateUserProfile(supabase, userId, updates)
        toolResult = `Stored business location: ${parsedArgs.business_city}`
        break

      case 'store_business_address':
        updates.full_address = parsedArgs.full_address
        await updateUserProfile(supabase, userId, updates)
        toolResult = `Stored business address: ${parsedArgs.full_address}`
        break

      case 'store_business_phone':
        updates.phone_number = parsedArgs.phone_number
        await updateUserProfile(supabase, userId, updates)
        toolResult = `Stored phone number: ${parsedArgs.phone_number}`
        break

      case 'store_business_email':
        updates.contact_email = parsedArgs.contact_email
        await updateUserProfile(supabase, userId, updates)
        toolResult = `Stored email address: ${parsedArgs.contact_email}`
        break

      case 'store_business_hours':
        updates.opening_hours = parsedArgs.opening_hours
        await updateUserProfile(supabase, userId, updates)
        toolResult = `Stored business hours: ${parsedArgs.opening_hours}`
        break

      case 'store_business_services':
        updates.services = parsedArgs.services
        await updateUserProfile(supabase, userId, updates)
        toolResult = `Stored services: ${parsedArgs.services.join(', ')}`
        break

      case 'store_business_website':
        updates.website = parsedArgs.website
        await updateUserProfile(supabase, userId, updates)
        toolResult = `Stored website: ${parsedArgs.website}`
        break

      case 'store_ai_use_cases':
        updates.ai_use_cases = parsedArgs.ai_use_cases
        await updateUserProfile(supabase, userId, updates)
        toolResult = `Stored AI preferences: ${parsedArgs.ai_use_cases.join(', ')}`
        break

      case 'web_search_tool':
        const searchQuery = `Find detailed information about "${parsedArgs.business_name}" ${parsedArgs.business_type} business in ${parsedArgs.city}. Include: full address, phone number, email, website, operating hours, and services offered.`
        const searchResults = await callSearchModel(searchQuery)
        toolResult = `Found business information: ${searchResults}`
        break

      case 'complete_onboarding':
        const currentData = await getCurrentProfileData(supabase, userId)
        const finalData = { ...currentData, onboarding_completed: true }
        await completeUserOnboarding(supabase, userId, finalData)
        toolResult = `Onboarding completed successfully. Summary: ${parsedArgs.summary}`
        break

      default:
        toolResult = `Unknown tool: ${name}`
    }
  } catch (error) {
    console.error(`Tool execution error for ${name}:`, error)
    toolResult = `Error executing ${name}: ${error.message}`
  }

  return toolResult
}

async function processStreamWithToolCalls(
  response: Response, 
  controller: ReadableStreamDefaultController,
  supabase: any,
  userId: string,
  conversationMessages: ChatMessage[]
) {
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  if (!reader) {
    controller.close()
    return conversationMessages
  }

  let buffer = ''
  let currentToolCalls: any[] = []
  let assistantMessage = ''
  let hasContent = false

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
            assistantMessage += delta.content
            hasContent = true
            const chunk = `data: ${JSON.stringify({ content: delta.content })}\n\n`
            controller.enqueue(new TextEncoder().encode(chunk))
          }

          // Check if tool calls are complete
          if (parsed.choices?.[0]?.finish_reason === 'tool_calls' && currentToolCalls.length > 0) {
            // Add assistant message with tool calls to conversation
            conversationMessages.push({
              role: 'assistant',
              content: assistantMessage || null,
            })

            // Execute tool calls and add to conversation
            const toolMessages: ChatMessage[] = []
            
            for (const toolCall of currentToolCalls) {
              if (toolCall.function.name && toolCall.function.arguments) {
                // Send tool start notification to frontend
                const toolStartChunk = `data: ${JSON.stringify({ 
                  tool_name: toolCall.function.name 
                })}\n\n`
                controller.enqueue(new TextEncoder().encode(toolStartChunk))

                const toolResult = await handleToolCall(toolCall, supabase, userId)

                // Add tool result to conversation
                toolMessages.push({
                  role: 'tool',
                  content: toolResult,
                  tool_call_id: toolCall.id,
                  name: toolCall.function.name
                })

                // Send tool completion notification to frontend
                const toolChunk = `data: ${JSON.stringify({ 
                  tool_result: `✅ ${toolCall.function.name} completed`,
                  tool_name: toolCall.function.name 
                })}\n\n`
                controller.enqueue(new TextEncoder().encode(toolChunk))
              }
            }

            conversationMessages.push(...toolMessages)

            // Now call OpenAI again to get the assistant's response to the tool results
            const followUpMessages: ChatMessage[] = [
              { role: 'system', content: SYSTEM_PROMPT },
              ...conversationMessages
            ]

            const followUpResponse = await callOpenAI(followUpMessages, true)
            
            // Recursively process the follow-up response
            conversationMessages = await processStreamWithToolCalls(
              followUpResponse, 
              controller, 
              supabase, 
              userId, 
              conversationMessages
            )

            return conversationMessages
          }
        } catch (parseError) {
          console.error('Parse error:', parseError)
        }
      }
    }
  }

  // If we had content but no tool calls, add the assistant message
  if (hasContent) {
    conversationMessages.push({
      role: 'assistant',
      content: assistantMessage
    })
  }

  return conversationMessages
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const { action, messages, threadId, userId } = await req.json()

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

    // Handle different actions
    switch (action) {
      case 'save_thread_id':
        if (!threadId) {
          return new Response(
            JSON.stringify({ error: 'Thread ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const saveResult = await updateUserProfile(supabase, userId, { thread_id: threadId })
        return new Response(
          JSON.stringify({ success: saveResult.success }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'restore_conversation':
        if (!threadId) {
          return new Response(
            JSON.stringify({ error: 'Thread ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { messages: restoredMessages } = await restoreConversationHistory(supabase, threadId)
        return new Response(
          JSON.stringify({ messages: restoredMessages }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'chat':
        if (!messages || !threadId) {
          return new Response(
            JSON.stringify({ error: 'Messages and thread ID are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Save conversation history
        await saveConversationHistory(supabase, userId, threadId, messages)

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
            try {
              let conversationMessages = [...messages]
              
              // Process the stream with tool call handling
              conversationMessages = await processStreamWithToolCalls(
                response,
                controller,
                supabase,
                userId,
                conversationMessages
              )

              // Save the final conversation state
              await saveConversationHistory(supabase, userId, threadId, conversationMessages)

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

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

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