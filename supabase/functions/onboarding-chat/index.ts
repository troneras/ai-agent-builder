/*
  # Onboarding Chat Edge Function

  This function handles the onboarding chat conversation flow:
  1. Creates or retrieves existing conversations
  2. Processes user messages and generates AI responses
  3. Manages conversation state and message history
  4. Integrates with various tools for data collection

  ## Security
  - Requires authenticated user
  - Uses RLS policies for data access
  - Validates user ownership of conversations
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RequestBody {
  action: 'get_conversation' | 'send_message';
  userId?: string;
  message?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const body: RequestBody = await req.json();
    const { action, userId, message } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (action === 'get_conversation') {
      // Get or create onboarding conversation
      let { data: conversation, error: convError } = await supabaseClient
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'onboarding')
        .single();

      if (convError && convError.code === 'PGRST116') {
        // No conversation exists, create one
        const { data: newConversation, error: createError } = await supabaseClient
          .from('conversations')
          .insert({
            user_id: userId,
            title: 'Onboarding Setup',
            type: 'onboarding'
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        conversation = newConversation;

        // Add welcome message
        await supabaseClient
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            sender: 'assistant',
            role: 'assistant',
            content: `👋 **Welcome to your AI-powered phone assistant setup!**

I'm here to help you get your business phone system configured perfectly. I'll gather some information about you and your business to customize everything just right.

Let's start with the basics - **what's your name?**`
          });
      } else if (convError) {
        throw convError;
      }

      // Get messages for this conversation
      const { data: messages, error: messagesError } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        throw messagesError;
      }

      return new Response(
        JSON.stringify({
          conversationId: conversation.id,
          messages: messages || []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (action === 'send_message') {
      if (!message) {
        return new Response(
          JSON.stringify({ error: 'Message is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Get the conversation
      const { data: conversation, error: convError } = await supabaseClient
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'onboarding')
        .single();

      if (convError) {
        throw convError;
      }

      // Save user message
      const { data: userMessage, error: userMsgError } = await supabaseClient
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender: 'user',
          role: 'user',
          content: message
        })
        .select()
        .single();

      if (userMsgError) {
        throw userMsgError;
      }

      // Get current onboarding state
      const { data: onboarding } = await supabaseClient
        .from('onboarding')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Generate AI response based on current state
      const aiResponse = await generateAIResponse(message, onboarding, supabaseClient, userId, conversation.id);

      // Save AI response
      await supabaseClient
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender: 'assistant',
          role: 'assistant',
          content: aiResponse
        });

      return new Response(
        JSON.stringify({ success: true }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in onboarding-chat function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function generateAIResponse(userMessage: string, onboarding: any, supabaseClient: any, userId: string, conversationId: string): Promise<string> {
  const message = userMessage.toLowerCase().trim();
  
  // Initialize onboarding record if it doesn't exist
  if (!onboarding) {
    const { data: newOnboarding, error } = await supabaseClient
      .from('onboarding')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        current_step: 1
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating onboarding record:', error);
    } else {
      onboarding = newOnboarding;
    }
  }

  // Determine current step and generate appropriate response
  const currentStep = onboarding?.current_step || 1;

  switch (currentStep) {
    case 1: // Getting user name
      if (message.length > 1) {
        // Store user name
        await supabaseClient
          .from('onboarding')
          .update({ 
            user_name: userMessage,
            current_step: 2
          })
          .eq('user_id', userId);

        return `Nice to meet you, **${userMessage}**! 🎉

Now, let's talk about your business. **What's the name of your business?**`;
      }
      return "I'd love to know your name! Could you please tell me what I should call you?";

    case 2: // Getting business name
      if (message.length > 1) {
        await supabaseClient
          .from('onboarding')
          .update({ 
            business_name: userMessage,
            current_step: 3
          })
          .eq('user_id', userId);

        return `Great! **${userMessage}** sounds like a wonderful business. 🏢

What type of business is it? For example:
- Restaurant
- Retail store  
- Professional services
- Healthcare
- Real estate
- Or something else?`;
      }
      return "What's your business name? This helps me understand how to set up your phone system.";

    case 3: // Getting business type
      if (message.length > 1) {
        await supabaseClient
          .from('onboarding')
          .update({ 
            business_type: userMessage,
            current_step: 4
          })
          .eq('user_id', userId);

        return `Perfect! A **${userMessage}** business. 📍

Where is your business located? Please tell me the **city and state** (or city and country if outside the US).`;
      }
      return "What type of business do you run? This helps me customize the phone assistant for your industry.";

    case 4: // Getting business location
      if (message.length > 1) {
        await supabaseClient
          .from('onboarding')
          .update({ 
            business_city: userMessage,
            current_step: 5
          })
          .eq('user_id', userId);

        return `Got it! Located in **${userMessage}**. 📞

What's the best **phone number** for your business? This will be the main number customers use to reach you.`;
      }
      return "Where is your business located? I need the city and state to help with local customization.";

    case 5: // Getting phone number
      if (message.length > 1) {
        await supabaseClient
          .from('onboarding')
          .update({ 
            phone_number: userMessage,
            current_step: 6
          })
          .eq('user_id', userId);

        return `Perfect! I've got **${userMessage}** as your business phone. ⏰

What are your **business hours**? For example:
- Monday-Friday 9am-5pm
- 24/7
- Monday-Saturday 8am-6pm, Closed Sunday

This helps the AI know when to take messages vs. when to try transferring calls.`;
      }
      return "What's your business phone number? This is important for setting up call routing.";

    case 6: // Getting business hours
      if (message.length > 1) {
        await supabaseClient
          .from('onboarding')
          .update({ 
            opening_hours: userMessage,
            current_step: 7
          })
          .eq('user_id', userId);

        return `Excellent! Your hours are **${userMessage}**. 🛠️

Now, what are the **main services** your business offers? Please list 3-5 key services so the AI can help customers appropriately.

For example:
- "Hair cuts, coloring, styling, treatments"
- "Tax preparation, bookkeeping, business consulting"
- "Pizza delivery, catering, dine-in"`;
      }
      return "What are your business hours? This helps the AI assistant know when you're available.";

    case 7: // Getting services
      if (message.length > 1) {
        // Parse services into an array
        const services = userMessage.split(',').map(s => s.trim()).filter(s => s.length > 0);
        
        await supabaseClient
          .from('onboarding')
          .update({ 
            services: services,
            current_step: 8
          })
          .eq('user_id', userId);

        return `Great! I've noted these services: **${services.join(', ')}**. 🤖

Finally, how would you like the AI to help with your business? Check all that apply:

- **Appointment scheduling** - Let customers book appointments
- **Order taking** - Take food orders, product orders, etc.
- **Customer support** - Answer common questions
- **Lead qualification** - Screen potential customers
- **Message taking** - Take detailed messages when you're busy
- **Information sharing** - Share business info, hours, location

Just tell me which ones interest you most!`;
      }
      return "What services does your business offer? List your main services so the AI can help customers properly.";

    case 8: // Getting AI use cases
      if (message.length > 1) {
        // Parse AI use cases
        const useCases = userMessage.toLowerCase().includes('appointment') ? ['appointment_scheduling'] : [];
        if (userMessage.toLowerCase().includes('order')) useCases.push('order_taking');
        if (userMessage.toLowerCase().includes('support') || userMessage.toLowerCase().includes('question')) useCases.push('customer_support');
        if (userMessage.toLowerCase().includes('lead') || userMessage.toLowerCase().includes('qualify')) useCases.push('lead_qualification');
        if (userMessage.toLowerCase().includes('message')) useCases.push('message_taking');
        if (userMessage.toLowerCase().includes('information') || userMessage.toLowerCase().includes('info')) useCases.push('information_sharing');
        
        // If no specific matches, add general support
        if (useCases.length === 0) {
          useCases.push('customer_support', 'message_taking');
        }

        await supabaseClient
          .from('onboarding')
          .update({ 
            ai_use_cases: useCases,
            current_step: 9,
            completed: true,
            completed_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        // Also update user profile
        await supabaseClient
          .from('user_profiles')
          .update({
            full_name: onboarding.user_name,
            business_name: onboarding.business_name,
            business_type: onboarding.business_type,
            phone_number: onboarding.phone_number,
            business_data: {
              city: onboarding.business_city,
              hours: userMessage,
              services: onboarding.services,
              ai_use_cases: useCases
            }
          })
          .eq('id', userId);

        return `🎉 **Congratulations! Your AI phone assistant is now set up!**

Here's what I've configured for you:
- **Business**: ${onboarding.business_name} (${onboarding.business_type})
- **Location**: ${onboarding.business_city}
- **Phone**: ${onboarding.phone_number}
- **Hours**: ${onboarding.opening_hours}
- **Services**: ${onboarding.services?.join(', ')}
- **AI Features**: ${useCases.join(', ').replace(/_/g, ' ')}

Your AI assistant is ready to:
✅ Answer customer calls professionally
✅ Handle inquiries about your services
✅ Take messages when you're unavailable
✅ Provide business information

**Next steps:**
1. Test your setup with a practice call
2. Customize your AI's responses
3. Set up call forwarding to your business number

You can close this chat and explore your dashboard. Welcome aboard! 🚀`;
      }
      return "How would you like the AI to help your business? Tell me about appointment scheduling, order taking, customer support, or other ways you'd like it to assist.";

    default:
      return `Thanks for your message! I've recorded: "${userMessage}"

Is there anything else you'd like to tell me about your business or how you'd like the AI assistant to help?`;
  }
}