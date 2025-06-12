import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, ExternalLink, Bot, Search, Save, CheckCircle } from 'lucide-react';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAuth } from '../hooks/useAuth';
import Logo from './Logo';

interface OnboardingChatProps {
  onClose: () => void;
}

interface Message {
  type: 'user' | 'assistant' | 'system' | 'tool';
  content: string | React.ReactNode;
  timestamp: Date;
  id: string;
  toolName?: string;
}

const OnboardingChat: React.FC<OnboardingChatProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { profile, refetch } = useUserProfile(user);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [messageIdCounter, setMessageIdCounter] = useState(0);
  const [isToolExecuting, setIsToolExecuting] = useState(false);
  const [currentToolName, setCurrentToolName] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Start with a welcome message
    addAssistantMessage("👋 Hi! I'm your Cutcall setup assistant. I'm here to help you get your AI phone assistant ready for your business. Let's start with something simple - what's your name?");
  }, []);

  const generateMessageId = () => {
    const id = `msg-${messageIdCounter}`;
    setMessageIdCounter(prev => prev + 1);
    return id;
  };

  const addMessage = (type: Message['type'], content: string | React.ReactNode, toolName?: string) => {
    const messageId = generateMessageId();
    setMessages(prev => {
      const messageExists = prev.some(msg => msg.id === messageId);
      if (messageExists) return prev;
      return [...prev, { type, content, timestamp: new Date(), id: messageId, toolName }];
    });
  };

  const addUserMessage = (content: string) => {
    addMessage('user', content);
  };

  const addAssistantMessage = (content: string | React.ReactNode) => {
    addMessage('assistant', content);
  };

  const addToolMessage = (content: string, toolName: string) => {
    addMessage('tool', content, toolName);
  };

  const getToolIcon = (toolName: string) => {
    if (toolName === 'web_search_tool') return <Search className="w-4 h-4" />;
    if (toolName.startsWith('store_')) return <Save className="w-4 h-4" />;
    if (toolName === 'complete_onboarding') return <CheckCircle className="w-4 h-4" />;
    return <Bot className="w-4 h-4" />;
  };

  const getToolDescription = (toolName: string) => {
    switch (toolName) {
      case 'web_search_tool':
        return 'Searching for your business information online...';
      case 'store_user_name':
        return 'Saving your name to your profile...';
      case 'store_business_name':
        return 'Saving your business name...';
      case 'store_business_type':
        return 'Saving your business type...';
      case 'store_business_city':
        return 'Saving your business location...';
      case 'store_business_address':
        return 'Saving your business address...';
      case 'store_business_phone':
        return 'Saving your phone number...';
      case 'store_business_email':
        return 'Saving your email address...';
      case 'store_business_hours':
        return 'Saving your business hours...';
      case 'store_business_services':
        return 'Saving your services list...';
      case 'store_business_website':
        return 'Saving your website information...';
      case 'store_ai_use_cases':
        return 'Saving your AI preferences...';
      case 'complete_onboarding':
        return 'Completing your setup...';
      default:
        return 'Processing...';
    }
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || isTyping || !user) return;

    const userMessage = currentInput.trim();
    addUserMessage(userMessage);
    setCurrentInput('');
    setIsTyping(true);

    try {
      // Abort any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboarding-chat`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.filter(m => m.type === 'user' || m.type === 'assistant').map(m => ({
              role: m.type === 'user' ? 'user' : 'assistant',
              content: typeof m.content === 'string' ? m.content : ''
            })),
            { role: 'user', content: userMessage }
          ],
          userId: user.id
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let assistantMessage = '';
      let currentMessageId = generateMessageId();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.content) {
                // Stream assistant message content
                assistantMessage += data.content;
                
                // Update the current message
                setMessages(prev => {
                  const newMessages = [...prev];
                  const existingIndex = newMessages.findIndex(m => m.id === currentMessageId);
                  
                  if (existingIndex >= 0) {
                    newMessages[existingIndex] = {
                      ...newMessages[existingIndex],
                      content: assistantMessage
                    };
                  } else {
                    newMessages.push({
                      type: 'assistant',
                      content: assistantMessage,
                      timestamp: new Date(),
                      id: currentMessageId
                    });
                  }
                  
                  return newMessages;
                });
              } else if (data.tool_result && data.tool_name) {
                // Handle tool execution result
                setIsToolExecuting(false);
                setCurrentToolName('');
                addToolMessage(data.tool_result, data.tool_name);
                
                // Refresh profile data after tool execution
                if (data.tool_name.startsWith('store_') || data.tool_name === 'complete_onboarding') {
                  refetch();
                }
                
                // If onboarding is complete, show completion UI
                if (data.tool_name === 'complete_onboarding') {
                  setTimeout(() => {
                    addAssistantMessage(
                      <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-semibold text-green-800 mb-2">🎉 Setup Complete!</h4>
                          <p className="text-sm text-green-700">
                            Your AI phone assistant is now configured and ready to help your business!
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <button 
                            onClick={() => window.open('#', '_blank')}
                            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            aria-label="View dashboard in new tab"
                          >
                            View Dashboard <ExternalLink className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button 
                            onClick={onClose}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                            aria-label="Close setup dialog"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    );
                  }, 1000);
                }
              } else if (data.error) {
                console.error('Stream error:', data.error);
                addAssistantMessage(`❌ Sorry, I encountered an error: ${data.error}`);
              }
            } catch (parseError) {
              console.error('Parse error:', parseError);
            }
          }
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      
      console.error('Chat error:', error);
      addAssistantMessage('❌ Sorry, I encountered an error. Please try again.');
    } finally {
      setIsTyping(false);
      setIsToolExecuting(false);
      setCurrentToolName('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Calculate progress based on profile data
  const calculateProgress = () => {
    if (!profile?.onboarding_data) return 0;
    
    const data = profile.onboarding_data;
    const fields = [
      'user_name', 'business_name', 'business_type', 'business_city',
      'full_address', 'phone_number', 'contact_email', 'opening_hours',
      'services', 'ai_use_cases'
    ];
    
    const completedFields = fields.filter(field => data[field]).length;
    return Math.round((completedFields / fields.length) * 100);
  };

  const progress = calculateProgress();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-labelledby="onboarding-title" aria-modal="true">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Logo size="md" showText={false} />
            <div>
              <h2 id="onboarding-title" className="text-xl font-bold text-gray-900">AI-Powered Setup</h2>
              <p className="text-sm text-gray-500">Let our AI assistant help you configure your phone assistant</p>
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
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === 'user' 
                    ? 'bg-purple-500' 
                    : message.type === 'tool'
                    ? 'bg-blue-500'
                    : 'bg-gradient-to-r from-purple-500 to-blue-500'
                }`} aria-hidden="true">
                  {message.type === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : message.type === 'tool' ? (
                    getToolIcon(message.toolName || '')
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                
                <div className={`rounded-2xl px-6 py-4 ${
                  message.type === 'user'
                    ? 'bg-purple-500 text-white'
                    : message.type === 'tool'
                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                    : 'bg-gray-50 text-gray-900'
                }`} role={message.type === 'user' ? 'note' : 'status'} aria-label={`${message.type === 'user' ? 'Your' : message.type === 'tool' ? 'Tool' : 'Assistant'} message`}>
                  
                  {message.type === 'tool' && message.toolName && (
                    <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                      {getToolIcon(message.toolName)}
                      {getToolDescription(message.toolName)}
                    </div>
                  )}
                  
                  {typeof message.content === 'string' ? (
                    <div 
                      className="leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: message.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          .replace(/\n/g, '<br>')
                      }}
                    />
                  ) : (
                    message.content
                  )}
                  
                  <div className={`text-xs mt-2 ${
                    message.type === 'user' ? 'text-purple-100' : 
                    message.type === 'tool' ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {(isTyping || isToolExecuting) && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center" aria-hidden="true">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-50 rounded-2xl px-6 py-4" aria-label="Assistant is working">
                  {isToolExecuting ? (
                    <div className="flex items-center gap-2 text-blue-600">
                      {getToolIcon(currentToolName)}
                      <span className="text-sm">{getToolDescription(currentToolName)}</span>
                      <div className="typing-indicator ml-2">
                        <div className="typing-dot" style={{ '--delay': '0ms' } as React.CSSProperties}></div>
                        <div className="typing-dot" style={{ '--delay': '150ms' } as React.CSSProperties}></div>
                        <div className="typing-dot" style={{ '--delay': '300ms' } as React.CSSProperties}></div>
                      </div>
                    </div>
                  ) : (
                    <div className="typing-indicator">
                      <div className="typing-dot" style={{ '--delay': '0ms' } as React.CSSProperties}></div>
                      <div className="typing-dot" style={{ '--delay': '150ms' } as React.CSSProperties}></div>
                      <div className="typing-dot" style={{ '--delay': '300ms' } as React.CSSProperties}></div>
                    </div>
                  )}
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
              disabled={isTyping || isToolExecuting}
            />
            <div id="input-help" className="sr-only">Press Enter to send your message</div>
            <button
              onClick={handleSendMessage}
              disabled={!currentInput.trim() || isTyping || isToolExecuting}
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-3 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-500 text-center">
            Powered by AI • Your data is secure and private
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingChat;