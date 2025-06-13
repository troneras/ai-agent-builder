import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, ExternalLink, Bot, Search, Save, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useOnboarding } from '../hooks/useOnboarding';
import { supabase } from '../lib/supabase';
import { Message } from '../types/user';
import Logo from './Logo';

interface OnboardingChatProps {
  onClose: () => void;
}

const OnboardingChat: React.FC<OnboardingChatProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { onboarding, refetch: refetchOnboarding } = useOnboarding(user);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user) {
      loadConversation();
      setupRealtimeSubscription();
    }
  }, [user]);

  const loadConversation = async () => {
    if (!user) return;

    try {
      setIsLoadingConversation(true);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboarding-chat`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_conversation',
          userId: user.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }

      const data = await response.json();
      setConversationId(data.conversationId);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!conversationId) return;

    const subscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
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
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || isSubmitting || !user || !conversationId) return;

    const userMessage = currentInput.trim();
    setCurrentInput('');
    setIsSubmitting(true);

    // Add user message optimistically
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender: 'user',
      role: 'user',
      content: userMessage,
      metadata: {},
      created_at: new Date().toISOString()
    };
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
          userId: user.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Remove optimistic message since real one will come via realtime
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));

      // Refresh onboarding data
      refetchOnboarding();

    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        conversation_id: conversationId,
        sender: 'system',
        role: 'system',
        content: '❌ Failed to send message. Please try again.',
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

  const getToolIcon = (toolName: string) => {
    if (toolName === 'web_search_tool') return <Search className="w-4 h-4" />;
    if (toolName?.startsWith('store_')) return <Save className="w-4 h-4" />;
    if (toolName === 'complete_onboarding') return <CheckCircle className="w-4 h-4" />;
    return <Bot className="w-4 h-4" />;
  };

  const getToolDescription = (toolName: string) => {
    switch (toolName) {
      case 'web_search_tool':
        return 'Searching for your business information online...';
      case 'store_user_info':
        return 'Saving your personal information...';
      case 'store_business_info':
        return 'Saving your business information...';
      case 'store_contact_info':
        return 'Saving your contact details...';
      case 'store_business_details':
        return 'Saving your business details...';
      case 'store_ai_preferences':
        return 'Saving your AI preferences...';
      case 'complete_onboarding':
        return 'Completing your setup...';
      default:
        return 'Processing...';
    }
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

  // Show loading state while loading conversation
  if (isLoadingConversation) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-labelledby="onboarding-title" aria-modal="true">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Logo size="md" showText={false} />
            <div>
              <h2 id="onboarding-title" className="text-xl font-bold text-gray-900">AI-Powered Setup</h2>
              <p className="text-sm text-gray-500">
                {conversationId ? `Conversation: ${conversationId.slice(-8)}` : 'Setting up your phone assistant'}
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
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              aria-label="Close setup dialog"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4" role="log" aria-label="Setup conversation" aria-live="polite">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.sender === 'user' 
                    ? 'bg-purple-500' 
                    : message.sender === 'tool'
                    ? 'bg-blue-500'
                    : message.sender === 'system'
                    ? 'bg-green-500'
                    : 'bg-gradient-to-r from-purple-500 to-blue-500'
                }`} aria-hidden="true">
                  {message.sender === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : message.sender === 'tool' ? (
                    getToolIcon(message.tool_name || '')
                  ) : message.sender === 'system' ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                
                <div className={`rounded-2xl px-6 py-4 ${
                  message.sender === 'user'
                    ? 'bg-purple-500 text-white'
                    : message.sender === 'tool'
                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                    : message.sender === 'system'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-gray-50 text-gray-900'
                }`} role={message.sender === 'user' ? 'note' : 'status'} aria-label={`${message.sender === 'user' ? 'Your' : message.sender === 'tool' ? 'Tool' : message.sender === 'system' ? 'System' : 'Assistant'} message`}>
                  
                  {message.sender === 'tool' && message.tool_name && (
                    <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                      {getToolIcon(message.tool_name)}
                      {getToolDescription(message.tool_name)}
                    </div>
                  )}
                  
                  <div 
                    className="leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: message.content
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/\n/g, '<br>')
                    }}
                  />
                  
                  <div className={`text-xs mt-2 ${
                    message.sender === 'user' ? 'text-purple-100' : 
                    message.sender === 'tool' ? 'text-blue-600' : 
                    message.sender === 'system' ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
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
              placeholder="Type your message..."
              className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={1}
              aria-describedby="input-help"
              disabled={isSubmitting || !conversationId}
            />
            <div id="input-help" className="sr-only">Press Enter to send your message</div>
            <button
              onClick={handleSendMessage}
              disabled={!currentInput.trim() || isSubmitting || !conversationId}
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-3 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-500 text-center">
            {conversationId ? `Conversation ID: ${conversationId} • ` : ''}Powered by AI • Your data is secure and private
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingChat;