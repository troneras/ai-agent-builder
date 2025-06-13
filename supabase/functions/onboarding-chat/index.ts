import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          type?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender: string;
          role: string;
          type?: string;
          content?: string;
          tool_name?: string;
          tool_call_id?: string;
          tool_args?: any;
          tool_result?: any;
          metadata?: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender: string;
          role: string;
          type?: string;
          content?: string;
          tool_name?: string;
          tool_call_id?: string;
          tool_args?: any;
          tool_result?: any;
          metadata?: any;
          created_at?: string;
        };
      };
      onboarding: {
        Row: {
          id: string;
          user_id: string;
          conversation_id?: string;
          completed: boolean;
          current_step: number;
          user_name?: string;
          business_name?: string;
          business_type?: string;
          business_city?: string;
          full_address?: string;
          phone_number?: string;
          contact_email?: string;
          website?: string;
          opening_hours?: string;
          services?: string[];
          ai_use_cases?: string[];
          started_at: string;
          completed_at?: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          conversation_id?: string;
          completed?: boolean;
          current_step?: number;
          user_name?: string;
          business_name?: string;
          business_type?: string;
          business_city?: string;
          full_address?: string;
          phone_number?: string;
          contact_email?: string;
          website?: string;
          opening_hours?: string;
          services?: string[];
          ai_use_cases?: string[];
          started_at?: string;
          completed_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Parse request body
    const { action, userId, message } = await req.json();

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
      let { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'onboarding')
        .single();

      if (convError && convError.code === 'PGRST116') {
        // No conversation exists, create one
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({
            user_id: userId,
            title: 'Onboarding Setup',
            type: 'onboarding'
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating conversation:', createError);
          return new Response(
            JSON.stringify({ error: 'Failed to create conversation' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        conversation = newConversation;

        // Create initial welcome message
        const welcomeMessage = `👋 **Welcome to CutCall!** I'm your AI assistant, and I'm here to help you set up your phone answering service.

I'll guide you through a quick setup process to understand your business and customize your AI phone assistant. This will only take a few minutes!

Let's start with some basic information about you and your business. **What's your name?**`;

        await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            sender: 'assistant',
            role: 'assistant',
            content: welcomeMessage,
            metadata: {}
          });
      } else if (convError) {
        console.error('Error fetching conversation:', convError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch conversation' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Get messages for the conversation
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch messages' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
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
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'onboarding')
        .single();

      if (convError) {
        console.error('Error fetching conversation:', convError);
        return new Response(
          JSON.stringify({ error: 'Conversation not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Save user message
      const { error: userMessageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender: 'user',
          role: 'user',
          content: message,
          metadata: {}
        });

      if (userMessageError) {
        console.error('Error saving user message:', userMessageError);
        return new Response(
          JSON.stringify({ error: 'Failed to save message' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Get current onboarding state
      let { data: onboarding, error: onboardingError } = await supabase
        .from('onboarding')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (onboardingError && onboardingError.code === 'PGRST116') {
        // Create onboarding record if it doesn't exist
        const { data: newOnboarding, error: createOnboardingError } = await supabase
          .from('onboarding')
          .insert({
            user_id: userId,
            conversation_id: conversation.id,
            current_step: 0
          })
          .select()
          .single();

        if (createOnboardingError) {
          console.error('Error creating onboarding:', createOnboardingError);
        } else {
          onboarding = newOnboarding;
        }
      }

      // Generate AI response based on current step and user input
      let aiResponse = '';
      let toolCalls: any[] = [];

      if (!onboarding?.user_name) {
        // Step 1: Get user name
        aiResponse = `Nice to meet you, **${message}**! I'll remember that.

Now, let's talk about your business. **What's the name of your business?**`;
        
        toolCalls.push({
          name: 'store_user_info',
          arguments: { user_name: message }
        });
      } else if (!onboarding?.business_name) {
        // Step 2: Get business name
        aiResponse = `Great! **${message}** sounds like a wonderful business.

What type of business is ${message}? For example: restaurant, dental office, law firm, retail store, etc.`;
        
        toolCalls.push({
          name: 'store_business_info',
          arguments: { business_name: message }
        });
      } else if (!onboarding?.business_type) {
        // Step 3: Get business type
        aiResponse = `Perfect! A ${message} - that's exactly the kind of business that can benefit greatly from an AI phone assistant.

Where is your business located? Please provide the **city and state** (or city and country if outside the US).`;
        
        toolCalls.push({
          name: 'store_business_info',
          arguments: { business_type: message }
        });
      } else if (!onboarding?.business_city) {
        // Step 4: Get business location
        aiResponse = `Excellent! ${message} is a great location.

Could you provide your **full business address**? This helps me understand your local market and customize responses for your customers.`;
        
        toolCalls.push({
          name: 'store_business_info',
          arguments: { business_city: message }
        });
      } else if (!onboarding?.full_address) {
        // Step 5: Get full address
        aiResponse = `Thank you! I've noted your address.

What's the best **phone number** for your business? This will be the number customers call to reach your AI assistant.`;
        
        toolCalls.push({
          name: 'store_contact_info',
          arguments: { full_address: message }
        });
      } else if (!onboarding?.phone_number) {
        // Step 6: Get phone number
        aiResponse = `Perfect! I've saved your phone number.

What's your business **email address**? This is where you'll receive notifications and summaries from your AI assistant.`;
        
        toolCalls.push({
          name: 'store_contact_info',
          arguments: { phone_number: message }
        });
      } else if (!onboarding?.contact_email) {
        // Step 7: Get email
        aiResponse = `Great! I've got your email address.

What are your **business hours**? For example: "Monday-Friday 9AM-6PM, Saturday 10AM-4PM, Closed Sunday"`;
        
        toolCalls.push({
          name: 'store_contact_info',
          arguments: { contact_email: message }
        });
      } else if (!onboarding?.opening_hours) {
        // Step 8: Get business hours
        aiResponse = `Excellent! I've noted your business hours.

Now, tell me about your **main services or products**. What do you offer to your customers? (You can list multiple items separated by commas)`;
        
        toolCalls.push({
          name: 'store_business_details',
          arguments: { opening_hours: message }
        });
      } else if (!onboarding?.services || onboarding.services.length === 0) {
        // Step 9: Get services
        const services = message.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
        aiResponse = `Perfect! I understand you offer: ${services.join(', ')}.

Finally, how would you like your AI assistant to help your business? Choose any that apply:

• **Answer common questions** about your services, hours, and location
• **Schedule appointments** and manage your calendar
• **Take messages** when you're unavailable
• **Provide quotes** for your services
• **Handle customer support** inquiries
• **Screen calls** and filter out spam

Just tell me which ones interest you most!`;
        
        toolCalls.push({
          name: 'store_business_details',
          arguments: { services }
        });
      } else {
        // Step 10: Get AI use cases and complete onboarding
        const aiUseCases = message.toLowerCase().includes('answer') ? ['answer_questions'] : [];
        if (message.toLowerCase().includes('schedule') || message.toLowerCase().includes('appointment')) {
          aiUseCases.push('schedule_appointments');
        }
        if (message.toLowerCase().includes('message') || message.toLowerCase().includes('take messages')) {
          aiUseCases.push('take_messages');
        }
        if (message.toLowerCase().includes('quote') || message.toLowerCase().includes('pricing')) {
          aiUseCases.push('provide_quotes');
        }
        if (message.toLowerCase().includes('support') || message.toLowerCase().includes('customer')) {
          aiUseCases.push('customer_support');
        }
        if (message.toLowerCase().includes('screen') || message.toLowerCase().includes('spam')) {
          aiUseCases.push('screen_calls');
        }

        aiResponse = `🎉 **Congratulations!** Your AI phone assistant setup is complete!

Here's what I've configured for **${onboarding.business_name}**:

**Business Details:**
• Type: ${onboarding.business_type}
• Location: ${onboarding.business_city}
• Hours: ${onboarding.opening_hours}
• Services: ${onboarding.services?.join(', ')}

**AI Capabilities:** ${aiUseCases.join(', ').replace(/_/g, ' ')}

Your AI assistant is now ready to handle calls for your business! It knows your business details, hours, services, and is configured to help with the specific tasks you requested.

**Next Steps:**
1. Your phone number will be activated within 24 hours
2. You'll receive setup confirmation via email
3. You can customize responses anytime from your dashboard

Welcome to the future of customer service! 🚀`;

        toolCalls.push({
          name: 'store_ai_preferences',
          arguments: { ai_use_cases: aiUseCases }
        });
        
        toolCalls.push({
          name: 'complete_onboarding',
          arguments: {}
        });
      }

      // Execute tool calls
      for (const toolCall of toolCalls) {
        // Save tool call message
        const { error: toolMessageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            sender: 'tool',
            role: 'tool',
            type: 'tool_call',
            tool_name: toolCall.name,
            tool_args: toolCall.arguments,
            content: `Executing ${toolCall.name}...`,
            metadata: {}
          });

        if (toolMessageError) {
          console.error('Error saving tool message:', toolMessageError);
        }

        // Execute the tool
        try {
          if (toolCall.name === 'store_user_info') {
            await supabase
              .from('onboarding')
              .upsert({
                user_id: userId,
                conversation_id: conversation.id,
                user_name: toolCall.arguments.user_name,
                current_step: 1
              });
          } else if (toolCall.name === 'store_business_info') {
            const updateData: any = { user_id: userId };
            if (toolCall.arguments.business_name) {
              updateData.business_name = toolCall.arguments.business_name;
              updateData.current_step = 2;
            }
            if (toolCall.arguments.business_type) {
              updateData.business_type = toolCall.arguments.business_type;
              updateData.current_step = 3;
            }
            if (toolCall.arguments.business_city) {
              updateData.business_city = toolCall.arguments.business_city;
              updateData.current_step = 4;
            }
            
            await supabase
              .from('onboarding')
              .upsert(updateData);
          } else if (toolCall.name === 'store_contact_info') {
            const updateData: any = { user_id: userId };
            if (toolCall.arguments.full_address) {
              updateData.full_address = toolCall.arguments.full_address;
              updateData.current_step = 5;
            }
            if (toolCall.arguments.phone_number) {
              updateData.phone_number = toolCall.arguments.phone_number;
              updateData.current_step = 6;
            }
            if (toolCall.arguments.contact_email) {
              updateData.contact_email = toolCall.arguments.contact_email;
              updateData.current_step = 7;
            }
            
            await supabase
              .from('onboarding')
              .upsert(updateData);
          } else if (toolCall.name === 'store_business_details') {
            const updateData: any = { user_id: userId };
            if (toolCall.arguments.opening_hours) {
              updateData.opening_hours = toolCall.arguments.opening_hours;
              updateData.current_step = 8;
            }
            if (toolCall.arguments.services) {
              updateData.services = toolCall.arguments.services;
              updateData.current_step = 9;
            }
            
            await supabase
              .from('onboarding')
              .upsert(updateData);
          } else if (toolCall.name === 'store_ai_preferences') {
            await supabase
              .from('onboarding')
              .upsert({
                user_id: userId,
                ai_use_cases: toolCall.arguments.ai_use_cases,
                current_step: 10
              });
          } else if (toolCall.name === 'complete_onboarding') {
            await supabase
              .from('onboarding')
              .upsert({
                user_id: userId,
                completed: true,
                completed_at: new Date().toISOString()
              });
          }
        } catch (error) {
          console.error(`Error executing ${toolCall.name}:`, error);
        }
      }

      // Save AI response
      const { error: aiMessageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender: 'assistant',
          role: 'assistant',
          content: aiResponse,
          metadata: {}
        });

      if (aiMessageError) {
        console.error('Error saving AI message:', aiMessageError);
        return new Response(
          JSON.stringify({ error: 'Failed to save AI response' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

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
    console.error('Edge function error:', error);
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