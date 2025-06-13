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

const SYSTEM_PROMPT = `You are Cutcall's friendly onboarding assistant. Your job is to help business owners set up their AI phone assistant by gathering essential information about their business.

CRITICAL RULES:
1. NEVER store any data without explicit user confirmation
2. Always ask "Does this look correct?" or "Should I save this information?" before storing
3. Only use store tools AFTER the user confirms the data is accurate
4. If user says "no" or corrects information, update your understanding but don't store until they confirm
5. After using web_search_tool, ALWAYS generate a response presenting the findings and asking for confirmation
6. After ANY tool execution, you MUST continue the conversation naturally - never stop responding
7. ALWAYS provide a follow-up message after tool execution to guide the user

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
- MANDATORY: ALWAYS continue the conversation after tool execution with helpful guidance

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

Remember: Confirmation is MANDATORY before storing any data! Always continue the conversation after tool execution with clear next steps.`

const tools = [
  {
    type: "function",
    function: {
      name: "store_user_info",
      description: "Store the user's personal information after confirmation",
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
      name: "store_business_info",
      description: "Store business name and type after confirmation",
      parameters: {
        type: "object",
        properties: {
          business_name: { type: "string", description: "The business name" },
          business_type: { type: "string", description: "Type of business (e.g., restaurant, salon, plumbing)" },
          business_city: { type: "string", description: "City where the business is located" }
        },
        required: ["business_name", "business_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "store_contact_info",
      description: "Store business contact information after confirmation",
      parameters: {
        type: "object",
        properties: {
          phone_number: { type: "string", description: "Business phone number" },
          contact_email: { type: "string", description: "Business email address" },
          full_address: { type: "string", description: "Complete business address" },
          website: { type: "string", description: "Business website URL" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "store_business_details",
      description: "Store business hours and services after confirmation",
      parameters: {
        type: "object",
        properties: {
          opening_hours: { type: "string", description: "Business operating hours" },
          services: { 
            type: "array", 
            items: { type: "string" },
            description: "List of services offered by the business" 
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "store_ai_preferences",
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

async function callOpenAI(messages: ChatMessage[], stream: boolean = false) {
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

async function addMessageToConversation(
  supabase: any, 
  conversationId: string, 
  sender: string, 
  role: string, 
  content: string, 
  type: string = 'message',
  toolName?: string, 
  toolCallId?: string, 
  toolArgs?: any,
  toolResult?: any,
  metadata?: any
) {
  try {
    const messageData: any = {
      conversation_id: conversationId,
      sender,
      role,
      content,
      type,
      metadata: metadata || {}
    }

    if (toolName) messageData.tool_name = toolName
    if (toolCallId) messageData.tool_call_id = toolCallId
    if (toolArgs) messageData.tool_args = toolArgs
    if (toolResult) messageData.tool_result = toolResult

    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()

    if (error) {
      console.error('Error adding message:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Message insert error:', err)
    return null
  }
}

async function addToolCall(
  supabase: any,
  conversationId: string,
  messageId: string,
  name: string,
  arguments: any,
  result?: any,
  status: string = 'pending',
  errorMessage?: string
) {
  try {
    const { data, error } = await supabase
      .from('tool_calls')
      .insert({
        conversation_id: conversationId,
        message_id: messageId,
        name,
        arguments,
        result,
        status,
        error_message: errorMessage
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding tool call:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Tool call insert error:', err)
    return null
  }
}

async function getConversationMessages(supabase: any, conversationId: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Messages fetch error:', err)
    return []
  }
}

async function updateOnboardingData(supabase: any, userId: string, updates: any) {
  try {
    const { data, error } = await supabase
      .from('onboarding')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()

    if (error) {
      console.error('Onboarding update error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Onboarding update error:', err)
    return { success: false, error: 'Failed to update onboarding' }
  }
}

async function updateUserProfile(supabase: any, userId: string, updates: any) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()

    if (error) {
      console.error('Profile update error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Profile update error:', err)
    return { success: false, error: 'Failed to update profile' }
  }
}

async function completeOnboarding(supabase: any, userId: string) {
  try {
    const { data, error } = await supabase
      .from('onboarding')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
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

async function handleToolCall(toolCall: any, supabase: any, userId: string, conversationId: string) {
  const { name, arguments: args } = toolCall.function
  const parsedArgs = JSON.parse(args)

  let toolResult = ''
  let status = 'pending'

  try {
    switch (name) {
      case 'store_user_info':
        await updateUserProfile(supabase, userId, { 
          full_name: parsedArgs.user_name 
        })
        await updateOnboardingData(supabase, userId, { 
          user_name: parsedArgs.user_name 
        })
        toolResult = `✅ Stored your name: ${parsedArgs.user_name}`
        status = 'success'
        break

      case 'store_business_info':
        await updateUserProfile(supabase, userId, { 
          business_name: parsedArgs.business_name,
          business_type: parsedArgs.business_type
        })
        await updateOnboardingData(supabase, userId, { 
          business_name: parsedArgs.business_name,
          business_type: parsedArgs.business_type,
          business_city: parsedArgs.business_city
        })
        toolResult = `✅ Stored business info: ${parsedArgs.business_name} (${parsedArgs.business_type})`
        if (parsedArgs.business_city) {
          toolResult += ` in ${parsedArgs.business_city}`
        }
        status = 'success'
        break

      case 'store_contact_info':
        const contactUpdates: any = {}
        const onboardingContactUpdates: any = {}
        
        if (parsedArgs.phone_number) {
          contactUpdates.phone_number = parsedArgs.phone_number
          onboardingContactUpdates.phone_number = parsedArgs.phone_number
        }
        if (parsedArgs.contact_email) {
          onboardingContactUpdates.contact_email = parsedArgs.contact_email
        }
        if (parsedArgs.full_address) {
          onboardingContactUpdates.full_address = parsedArgs.full_address
        }
        if (parsedArgs.website) {
          onboardingContactUpdates.website = parsedArgs.website
        }

        if (Object.keys(contactUpdates).length > 0) {
          await updateUserProfile(supabase, userId, contactUpdates)
        }
        await updateOnboardingData(supabase, userId, onboardingContactUpdates)
        
        const contactItems = []
        if (parsedArgs.phone_number) contactItems.push(`phone: ${parsedArgs.phone_number}`)
        if (parsedArgs.contact_email) contactItems.push(`email: ${parsedArgs.contact_email}`)
        if (parsedArgs.full_address) contactItems.push(`address: ${parsedArgs.full_address}`)
        if (parsedArgs.website) contactItems.push(`website: ${parsedArgs.website}`)
        
        toolResult = `✅ Stored contact info: ${contactItems.join(', ')}`
        status = 'success'
        break

      case 'store_business_details':
        await updateOnboardingData(supabase, userId, {
          opening_hours: parsedArgs.opening_hours,
          services: parsedArgs.services
        })
        
        const detailItems = []
        if (parsedArgs.opening_hours) detailItems.push(`hours: ${parsedArgs.opening_hours}`)
        if (parsedArgs.services) detailItems.push(`services: ${parsedArgs.services.join(', ')}`)
        
        toolResult = `✅ Stored business details: ${detailItems.join(', ')}`
        status = 'success'
        break

      case 'store_ai_preferences':
        await updateOnboardingData(supabase, userId, { 
          ai_use_cases: parsedArgs.ai_use_cases 
        })
        toolResult = `✅ Stored AI preferences: ${parsedArgs.ai_use_cases.join(', ')}`
        status = 'success'
        break

      case 'web_search_tool':
        const searchQuery = `Find detailed information about "${parsedArgs.business_name}" ${parsedArgs.business_type} business in ${parsedArgs.city}. Include: full address, phone number, email, website, operating hours, and services offered.`
        const searchResults = await callSearchModel(searchQuery)
        toolResult = `🔍 Found business information: ${searchResults}`
        status = 'success'
        break

      case 'complete_onboarding':
        await completeOnboarding(supabase, userId)
        toolResult = `🎉 Onboarding completed successfully! Your AI phone assistant is now ready to help your business.`
        status = 'success'
        break

      default:
        toolResult = `❌ Unknown tool: ${name}`
        status = 'error'
    }

  } catch (error) {
    console.error(`Tool execution error for ${name}:`, error)
    toolResult = `❌ Error executing ${name}: ${error.message}`
    status = 'error'
  }

  // Add tool message to conversation
  const toolMessage = await addMessageToConversation(
    supabase,
    conversationId,
    'tool',
    'tool',
    toolResult,
    'tool_result',
    name,
    toolCall.id,
    parsedArgs,
    { result: toolResult, status }
  )

  // Add tool call record for traceability
  if (toolMessage) {
    await addToolCall(
      supabase,
      conversationId,
      toolMessage.id,
      name,
      parsedArgs,
      { result: toolResult },
      status,
      status === 'error' ? toolResult : undefined
    )
  }

  return toolResult
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const { action, message, userId } = await req.json()

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
      case 'get_conversation':
        // Get or create onboarding conversation
        const { data: conversationId, error: convError } = await supabase
          .rpc('get_or_create_onboarding_conversation', { p_user_id: userId })

        if (convError) {
          console.error('Error getting conversation:', convError)
          return new Response(
            JSON.stringify({ error: 'Failed to get conversation' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get conversation messages
        const messages = await getConversationMessages(supabase, conversationId)

        return new Response(
          JSON.stringify({ 
            conversationId,
            messages: messages.map(msg => ({
              id: msg.id,
              conversation_id: msg.conversation_id,
              sender: msg.sender,
              role: msg.role,
              content: msg.content,
              tool_name: msg.tool_name,
              tool_call_id: msg.tool_call_id,
              metadata: msg.metadata,
              created_at: msg.created_at
            }))
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'send_message':
        if (!message) {
          return new Response(
            JSON.stringify({ error: 'Message is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get conversation ID
        const { data: convId, error: getConvError } = await supabase
          .rpc('get_or_create_onboarding_conversation', { p_user_id: userId })

        if (getConvError) {
          console.error('Error getting conversation:', getConvError)
          return new Response(
            JSON.stringify({ error: 'Failed to get conversation' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Add user message to conversation
        await addMessageToConversation(supabase, convId, 'user', 'user', message)

        // Get conversation history for OpenAI
        const conversationMessages = await getConversationMessages(supabase, convId)
        
        // Convert to OpenAI format (exclude tool messages for simplicity)
        const openAIMessages: ChatMessage[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...conversationMessages
            .filter(msg => msg.sender !== 'tool')
            .map(msg => ({
              role: msg.role as 'user' | 'assistant' | 'system',
              content: msg.content
            }))
        ]

        // Call OpenAI
        const response = await callOpenAI(openAIMessages, false)
        const data = await response.json()

        if (data.choices && data.choices[0]) {
          const choice = data.choices[0]
          
          if (choice.message.tool_calls) {
            // Handle tool calls
            let assistantContent = choice.message.content || ''
            
            // Add assistant message if there's content
            if (assistantContent) {
              await addMessageToConversation(supabase, convId, 'assistant', 'assistant', assistantContent)
            }

            // Execute tool calls
            for (const toolCall of choice.message.tool_calls) {
              await handleToolCall(toolCall, supabase, userId, convId)
            }

            // CRITICAL: Always get follow-up response after tool execution
            const updatedMessages = await getConversationMessages(supabase, convId)
            const updatedOpenAIMessages: ChatMessage[] = [
              { role: 'system', content: SYSTEM_PROMPT + '\n\nIMPORTANT: You just executed a tool. You MUST now provide a helpful follow-up response to guide the user on what to do next. Present any findings clearly and ask for confirmation or next steps.' },
              ...updatedMessages
                .filter(msg => msg.sender !== 'tool')
                .map(msg => ({
                  role: msg.role as 'user' | 'assistant' | 'system',
                  content: msg.content
                }))
            ]

            // Force the agent to continue the conversation
            const followUpResponse = await callOpenAI(updatedOpenAIMessages, false)
            const followUpData = await followUpResponse.json()

            if (followUpData.choices && followUpData.choices[0] && followUpData.choices[0].message.content) {
              await addMessageToConversation(
                supabase, 
                convId, 
                'assistant', 
                'assistant', 
                followUpData.choices[0].message.content
              )
            } else {
              // Fallback: Add a generic follow-up message if the agent doesn't respond
              await addMessageToConversation(
                supabase,
                convId,
                'assistant',
                'assistant',
                "I've completed that task! How does this information look? Should I save it or would you like to make any changes?"
              )
            }

          } else if (choice.message.content) {
            // Regular assistant response
            await addMessageToConversation(supabase, convId, 'assistant', 'assistant', choice.message.content)
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

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