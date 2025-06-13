import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, Bot, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useOnboarding } from '../hooks/useOnboarding';
import { supabase } from '../lib/supabase';
import { Message } from '../types/user';
import Logo from './Logo';

interface OnboardingChatProps {
  onComplete: () => void;
  onSignOut: () => void;
  locale?: string;
}

const OnboardingChat: React.FC<OnboardingChatProps> = ({ onComplete, onSignOut, locale = 'en' }) => {
  const { user } = useAuth();
  const { onboarding, refetch: refetchOnboarding } = useOnboarding(user);

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const optimisticMessageIdRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user) {
      loadConversation();
    }

    return () => {
      // Cleanup realtime subscription
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.unsubscribe();
      }
    };
  }, [user]);

  useEffect(() => {
    if (conversationId) {
      setupRealtimeSubscription();
    }
  }, [conversationId]);

  // Check if onboarding is completed and trigger completion
  useEffect(() => {
    if (onboarding?.completed) {
      onComplete();
    }
  }, [onboarding?.completed, onComplete]);

  const loadConversation = async () => {
    if (!user) return;

    try {
      setIsLoadingConversation(true);
      setConnectionError(null);

      // Validate environment variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase configuration. Please check your environment variables.');
      }

      const apiUrl = `${supabaseUrl}/functions/v1/onboarding-chat`;

      console.log('Attempting to connect to:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_conversation',
          userId: user.id,
          locale: locale
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Response Error:', response.status, errorText);
        throw new Error(`API Error (${response.status}): ${errorText || 'Failed to load conversation'}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setConversationId(data.conversationId);
      setMessages(data.messages || []);

    } catch (error) {
      console.error('Error loading conversation:', error);

      let errorMessage = 'Failed to connect to the chat service.';

      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setConnectionError(errorMessage);

      // Add error message to chat
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        conversation_id: 'error',
        sender: 'system',
        role: 'system',
        content: `❌ **Connection Error**: ${errorMessage}\n\nPlease try refreshing the page or contact support if the problem persists.`,
        metadata: {},
        created_at: new Date().toISOString()
      };
      setMessages([errorMsg]);

    } finally {
      setIsLoadingConversation(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!conversationId || realtimeChannelRef.current) return;

    console.log('Setting up realtime subscription for conversation:', conversationId);

    realtimeChannelRef.current = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('New message received:', payload);
          const newMessage = payload.new as Message;

          setMessages(prev => {
            // Check if this is a user message that should replace an optimistic message
            if (newMessage.role === 'user' && optimisticMessageIdRef.current) {
              const optimisticMessage = prev.find(m => m.id === optimisticMessageIdRef.current);

              if (optimisticMessage && optimisticMessage.content === newMessage.content) {
                // Clear the optimistic message reference
                optimisticMessageIdRef.current = null;

                // Replace the optimistic message with the real one
                return prev.map(msg =>
                  msg.id === optimisticMessage.id ? newMessage : msg
                );
              }
            }

            // Avoid duplicates for non-optimistic messages
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev;
            }

            return [...prev, newMessage];
          });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || isSubmitting || !user) return;

    // If there's a connection error, try to reconnect first
    if (connectionError) {
      await loadConversation();
      if (connectionError) return; // Still has error, don't proceed
    }

    if (!conversationId) return;

    const userMessage = currentInput.trim();
    setCurrentInput('');
    setIsSubmitting(true);

    // Create optimistic message with unique ID
    const optimisticId = `optimistic-${Date.now()}-${Math.random()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      conversation_id: conversationId,
      sender: 'user',
      role: 'user',
      content: userMessage,
      metadata: {},
      created_at: new Date().toISOString()
    };

    // Store reference to optimistic message
    optimisticMessageIdRef.current = optimisticId;

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboarding-chat`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send_message',
          message: userMessage,
          userId: user.id,
          locale: locale
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send message (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Refresh onboarding data
      refetchOnboarding();

    } catch (error) {
      console.error('Error sending message:', error);

      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticId));
      optimisticMessageIdRef.current = null;

      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        conversation_id: conversationId,
        sender: 'system',
        role: 'system',
        content: `❌ **Failed to send message**: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again.`,
        metadata: {},
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRetryConnection = () => {
    setConnectionError(null);
    loadConversation();
  };

  // Calculate progress based on onboarding data
  const calculateProgress = () => {
    if (!onboarding) return 0;

    const fields = [
      'user_name', 'business_name', 'business_type', 'business_city',
      'full_address', 'phone_number', 'contact_email', 'opening_hours',
      'services', 'ai_use_cases'
    ];

    const completedFields = fields.filter(field => {
      const value = onboarding[field as keyof typeof onboarding];
      return value && (Array.isArray(value) ? value.length > 0 : true);
    }).length;

    return Math.round((completedFields / fields.length) * 100);
  };

  const progress = calculateProgress();

  // Filter messages to hide all tool messages from users
  const filteredMessages = Array.isArray(messages) ? messages.filter((message) => {
    // Hide all tool messages - users don't need to see internal AI processing
    return message.role !== 'tool';
  }) : [];

  // Show loading state while loading conversation
  if (isLoadingConversation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your conversation...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Logo size="md" showText={false} />
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI-Powered Setup</h2>
              <p className="text-sm text-gray-500">
                {connectionError ? (
                  <span className="text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Connection Error
                  </span>
                ) : conversationId ? (
                  `Conversation: ${conversationId.slice(-8)}`
                ) : (
                  'Setting up your phone assistant'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-32 bg-gray-200 rounded-full h-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Setup progress">
                <div
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-500" aria-label={`${progress} percent complete`}>{progress}%</span>
            </div>

            <button
              onClick={onSignOut}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              aria-label="Sign out"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Connection Error Banner */}
        {connectionError && (
          <div className="bg-red-50 border-b border-red-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Connection Error</span>
              </div>
              <button
                onClick={handleRetryConnection}
                className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-md text-sm font-medium transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4" role="log" aria-label="Setup conversation" aria-live="polite">
          {(filteredMessages || []).map((message, idx) => {
            if (!message || typeof message !== 'object') return null;
            const role = message.role || 'assistant';
            const id = message.id || `msg-${idx}`;
            const content = typeof message.content === 'string' ? message.content : '';
            const createdAt = message.created_at ? new Date(message.created_at) : new Date();

            return (
              <div
                key={id}
                className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[80%] ${role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${role === 'user'
                    ? 'bg-purple-500'
                    : role === 'system'
                      ? 'bg-red-500'
                      : 'bg-gradient-to-r from-purple-500 to-blue-500'
                    } ${id.startsWith('optimistic-') ? 'opacity-70' : ''}`} aria-hidden="true">
                    {role === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : role === 'system' ? (
                      <AlertCircle className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>

                  <div className={`rounded-2xl px-6 py-4 ${role === 'user'
                    ? 'bg-purple-500 text-white'
                    : role === 'system'
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-gray-50 text-gray-900'
                    } ${id.startsWith('optimistic-') ? 'opacity-70' : ''}`} role={role === 'user' ? 'note' : 'status'} aria-label={`${role === 'user' ? 'Your' : role === 'system' ? 'System' : 'Assistant'} message`}>

                    <div
                      className="leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          .replace(/\n/g, '<br>')
                      }}
                    />

                    <div className={`text-xs mt-2 ${role === 'user' ? 'text-purple-100' :
                      role === 'system' ? 'text-red-600' : 'text-gray-500'
                      }`}>
                      {createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {id.startsWith('optimistic-') && <span className="ml-1">⏳</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {isSubmitting && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center" aria-hidden="true">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-50 rounded-2xl px-6 py-4" aria-label="Assistant is working">
                  <div className="typing-indicator">
                    <div className="typing-dot" style={{ '--delay': '0ms' } as React.CSSProperties}></div>
                    <div className="typing-dot" style={{ '--delay': '150ms' } as React.CSSProperties}></div>
                    <div className="typing-dot" style={{ '--delay': '300ms' } as React.CSSProperties}></div>
                  </div>
                  <span className="sr-only">Assistant is working on your request</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex gap-4">
            <label htmlFor="message-input" className="sr-only">Type your message</label>
            <textarea
              id="message-input"
              ref={inputRef}
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={connectionError ? "Fix connection to send messages..." : "Type your message..."}
              className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={1}
              aria-describedby="input-help"
              disabled={isSubmitting || !conversationId || !!connectionError}
            />
            <div id="input-help" className="sr-only">Press Enter to send your message</div>
            <button
              onClick={handleSendMessage}
              disabled={!currentInput.trim() || isSubmitting || !conversationId || !!connectionError}
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-3 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-2 text-xs text-gray-500 text-center">
            {connectionError ? (
              <span className="text-red-500">Connection error - please retry</span>
            ) : conversationId ? (
              `Conversation ID: ${conversationId} • Powered by AI • Real-time messaging enabled`
            ) : (
              'Powered by AI • Real-time messaging enabled'
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingChat;