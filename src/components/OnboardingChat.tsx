import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, Bot, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useOnboarding } from '../hooks/useOnboarding';
import { supabase } from '../lib/supabase';
import { Message, OptionChoiceArtifact, OAuthConnectionArtifact } from '../types/user';
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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const scrollToBottom = (smooth: boolean = true) => {
    if (messagesContainerRef.current) {
      // Use requestAnimationFrame to ensure DOM updates are complete
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          const container = messagesContainerRef.current;
          if (smooth) {
            container.scrollTo({
              top: container.scrollHeight,
              behavior: 'smooth'
            });
          } else {
            container.scrollTop = container.scrollHeight;
          }
        }
      });
    }
  };

  useEffect(() => {
    // Only use smooth scroll for non-optimistic updates
    const hasOptimisticMessage = messages.some(msg => msg.id.startsWith('optimistic-'));
    scrollToBottom(!hasOptimisticMessage);
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

      console.log('Loading conversation for user:', user.id);

      const { data, error } = await supabase.functions.invoke('onboarding-chat', {
        body: {
          action: 'get_conversation',
          userId: user.id,
          locale: locale
        }
      });

      if (error) {
        console.error('Function invoke error:', error);
        throw new Error(`Failed to load conversation: ${error.message}`);
      }

      if (data?.error) {
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
            // Avoid duplicates
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

    // Temporarily disable optimistic messages to fix chat functionality
    // TODO: Re-implement optimistic messages properly later

    try {
      const { data, error } = await supabase.functions.invoke('onboarding-chat', {
        body: {
          action: 'send_message',
          message: userMessage,
          userId: user.id,
          locale: locale
        }
      });

      if (error) {
        throw new Error(`Failed to send message: ${error.message}`);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Refresh onboarding data
      refetchOnboarding();

    } catch (error) {
      console.error('Error sending message:', error);

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

  // Handle artifact option selection
  const handleOptionChoice = async (option: { label: string; value: string }) => {
    if (!user || isSubmitting || !conversationId || connectionError) return;

    setCurrentInput(option.value);
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('onboarding-chat', {
        body: {
          action: 'send_message',
          message: option.value,
          userId: user.id,
          locale: locale
        }
      });

      if (error) {
        throw new Error(`Failed to send message: ${error.message}`);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Clear the input after successful send
      setCurrentInput('');

      // Refresh onboarding data
      refetchOnboarding();

    } catch (error) {
      console.error('Error sending option choice:', error);

      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        conversation_id: conversationId,
        sender: 'system',
        role: 'system',
        content: `❌ **Failed to send selection**: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again.`,
        metadata: {},
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render option choice artifact
  const renderOptionChoiceArtifact = (artifact: OptionChoiceArtifact) => {
    return (
      <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
        <p className="text-sm text-gray-700 mb-3">{artifact.prompt}</p>
        <div className="flex flex-wrap gap-2">
          {artifact.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleOptionChoice(option)}
              className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isSubmitting}
            >
              {option.label}
            </button>
          ))}
        </div>
        {artifact.allowFreeText && (
          <p className="text-xs text-gray-500 mt-2">
            You can also type your own response in the input below.
          </p>
        )}
      </div>
    );
  };

  // Handle OAuth connection initiation
  const handleOAuthConnection = async (artifact: OAuthConnectionArtifact) => {
    console.log('🚀 [OAuth] Starting OAuth connection process', {
      integrationName: artifact.integrationName,
      integrationId: artifact.integrationId,
      userId: user?.id,
      isSubmitting,
      timestamp: new Date().toISOString()
    });

    if (!user || isSubmitting) {
      console.warn('⚠️ [OAuth] Cannot proceed - missing user or already submitting', {
        hasUser: !!user,
        isSubmitting,
        userId: user?.id
      });
      return;
    }

    setIsSubmitting(true);
    console.log('✅ [OAuth] Set submitting state to true');

    try {
      console.log('📡 [OAuth] Invoking nango-oauth function', {
        action: 'create_session',
        integrationId: artifact.integrationId,
        userId: user.id,
      });

      const { data, error } = await supabase.functions.invoke('nango-oauth', {
        body: {
          action: 'create_session',
          integrationId: artifact.integrationId,
          userId: user.id,
        }
      });

      console.log('📨 [OAuth] Supabase function response', {
        hasData: !!data,
        hasError: !!error,
        dataKeys: data ? Object.keys(data) : [],
        data: data ? JSON.stringify(data, null, 2) : null,
        error: error ? JSON.stringify(error, null, 2) : null,
        responseType: typeof data,
        dataLength: data && typeof data === 'object' ? Object.keys(data).length : 0
      });

      if (error) {
        console.error('❌ [OAuth] Supabase function returned error', error);
        throw new Error(`Failed to create session: ${error.message}`);
      }

      if (data?.error) {
        console.error('❌ [OAuth] Function data contains error', data.error);
        throw new Error(data.error);
      }

      const { sessionToken } = data;
      console.log('🎫 [OAuth] Session token received', {
        hasSessionToken: !!sessionToken,
        sessionTokenLength: sessionToken?.length,
        sessionTokenPreview: sessionToken ? `${sessionToken.substring(0, 10)}...` : null
      });

      if (!sessionToken) {
        throw new Error('No session token received from server');
      }

      console.log('📦 [OAuth] Importing Nango frontend SDK...');
      // Import Nango frontend SDK dynamically
      const { default: Nango } = await import('@nangohq/frontend');
      console.log('✅ [OAuth] Nango SDK imported successfully');

      console.log('🔧 [OAuth] Creating Nango instance...');
      const nango = new Nango();
      console.log('✅ [OAuth] Nango instance created', {
        nangoMethods: Object.getOwnPropertyNames(nango).filter(prop => typeof nango[prop as keyof typeof nango] === 'function')
      });

      // Check browser environment
      console.log('🌐 [OAuth] Browser environment check', {
        userAgent: navigator.userAgent,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        windowLocation: window.location.origin,
        hasLocalStorage: typeof localStorage !== 'undefined',
        hasSessionStorage: typeof sessionStorage !== 'undefined',
        popupBlocker: 'Will be tested when opening popup'
      });

      console.log('🪟 [OAuth] Opening Nango Connect UI...');
      const connect = nango.openConnectUI({
        onEvent: (event: { type: string; payload?: unknown }) => {
          console.log('🎯 [OAuth] Nango event received', {
            type: event.type,
            payload: event.payload,
            timestamp: new Date().toISOString()
          });

          if (event.type === 'close') {
            console.log('🔐 [OAuth] OAuth modal closed by user');
            setIsSubmitting(false);
          } else if (event.type === 'connect') {
            console.log('🎉 [OAuth] OAuth connection successful!');
            // The webhook will handle sending a message to chat
            setIsSubmitting(false);
          } else if (event.type === 'error') {
            console.error('❌ [OAuth] OAuth error event', event.payload);
            setIsSubmitting(false);
          } else if (event.type === 'loaded') {
            console.log('📋 [OAuth] OAuth UI loaded');
          } else if (event.type === 'provider_selected') {
            console.log('🎯 [OAuth] Provider selected', event.payload);
          } else {
            console.log('ℹ️ [OAuth] Unknown event type', event.type, event.payload);
          }
        },
      });

      console.log('✅ [OAuth] Connect UI opened, setting session token...');
      connect.setSessionToken(sessionToken);
      console.log('🎫 [OAuth] Session token set successfully');

      // Test popup functionality
      console.log('🧪 [OAuth] Testing popup capabilities...');
      try {
        const testPopup = window.open('', '_blank', 'width=1,height=1');
        if (testPopup) {
          console.log('✅ [OAuth] Popup test successful - browser allows popups');
          testPopup.close();
        } else {
          console.warn('⚠️ [OAuth] Popup test failed - popup may be blocked');
        }
      } catch (popupError) {
        console.error('❌ [OAuth] Popup test error', popupError);
      }

      // Additional debug info with multiple checkpoints
      setTimeout(() => {
        console.log('⏰ [OAuth] 2-second checkpoint - UI should be initializing');
      }, 2000);

      setTimeout(() => {
        console.log('⏰ [OAuth] 5-second checkpoint - OAuth provider should be visible');

        // Check for any error elements or hidden modals
        const nangoModal = document.querySelector('[data-nango-modal]') || document.querySelector('.nango-modal') || document.querySelector('#nango-modal');
        const anyModal = document.querySelector('[role="dialog"]') || document.querySelector('.modal');

        console.log('🔍 [OAuth] DOM inspection', {
          nangoModal: nangoModal ? 'found' : 'not found',
          anyModal: anyModal ? 'found' : 'not found',
          bodyChildren: document.body.children.length,
          documentTitle: document.title,
          visibilityState: document.visibilityState,
          hasFocus: document.hasFocus()
        });

        if (nangoModal) {
          console.log('👀 [OAuth] Nango modal found', {
            visible: nangoModal.getBoundingClientRect().width > 0,
            display: window.getComputedStyle(nangoModal).display,
            visibility: window.getComputedStyle(nangoModal).visibility,
            zIndex: window.getComputedStyle(nangoModal).zIndex
          });
        }
      }, 5000);

      setTimeout(() => {
        console.log('⏰ [OAuth] 10-second checkpoint - final status check');
      }, 10000);

    } catch (error) {
      console.error('💥 [OAuth] Error in OAuth flow', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        integrationName: artifact.integrationName,
        integrationId: artifact.integrationId,
        timestamp: new Date().toISOString()
      });

      // Add error message to chat
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        conversation_id: conversationId!,
        sender: 'system',
        role: 'system',
        content: `❌ **Failed to start ${artifact.integrationName} connection**: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or contact support if the problem persists.`,
        metadata: {},
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsSubmitting(false);
    }
  };

  // Render OAuth connection artifact
  const renderOAuthConnectionArtifact = (artifact: OAuthConnectionArtifact) => {
    return (
      <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12">
            <img
              src={`/icons/${artifact.icon || 'default'}.svg`}
              alt={`${artifact.integrationName} icon`}
              className="w-full h-full rounded-lg"
              onError={(e) => {
                // Fallback to a default icon if the specific icon fails to load
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Connect to {artifact.integrationName}
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              {artifact.description}
            </p>
            <button
              onClick={() => handleOAuthConnection(artifact)}
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting...
                </>
              ) : (
                <>
                  Connect {artifact.integrationName}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Filter messages to hide all tool messages from users
  const filteredMessages = Array.isArray(messages) ? messages.filter((message) => {
    // Hide all tool messages - users don't need to see internal AI processing
    if (message.role === 'tool') return false;

    // Hide messages with empty or invalid content
    if (!message.content || typeof message.content !== 'string' || message.content.trim() === '') return false;

    // Hide messages without proper structure
    if (!message || typeof message !== 'object') return false;

    return true;
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
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0" role="log" aria-label="Setup conversation" aria-live="polite">
          {filteredMessages.map((message, idx) => {
            const role = message.role || 'assistant';
            const id = message.id || `msg-${idx}`;
            const content = message.content;
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

                    {/* Render artifacts if present */}
                    {message.artifacts && message.artifacts.length > 0 && (
                      <div className="mt-3">
                        {message.artifacts.map((artifact, artifactIndex) => {
                          if (artifact.type === 'option_choice') {
                            return (
                              <div key={artifactIndex}>
                                {renderOptionChoiceArtifact(artifact)}
                              </div>
                            );
                          } else if (artifact.type === 'oauth_connection') {
                            return (
                              <div key={artifactIndex}>
                                {renderOAuthConnectionArtifact(artifact)}
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}

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