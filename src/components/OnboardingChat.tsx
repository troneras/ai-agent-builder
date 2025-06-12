import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, ExternalLink } from 'lucide-react';
import Logo from './Logo';

interface OnboardingChatProps {
  onClose: () => void;
}

interface Message {
  type: 'user' | 'bot';
  content: string | React.ReactNode;
  timestamp: Date;
  id: string;
}

interface BusinessData {
  businessName?: string;
  businessType?: string;
  services?: string[];
  hours?: string;
  phoneStyle?: string;
}

const OnboardingChat: React.FC<OnboardingChatProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [businessData, setBusinessData] = useState<BusinessData>({});
  const [progress, setProgress] = useState(0);
  const [showPhoneNumber, setShowPhoneNumber] = useState(false);
  const [phoneNumber] = useState(`(555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`);
  const [messageIdCounter, setMessageIdCounter] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Start the conversation
    addBotMessage("👋 Hi! I'm excited to help you set up your phone assistant. Let's start simple - what's your business name?");
  }, []);

  const generateMessageId = () => {
    const id = `msg-${messageIdCounter}`;
    setMessageIdCounter(prev => prev + 1);
    return id;
  };

  const addBotMessage = (content: string | React.ReactNode, delay: number = 1000) => {
    setIsTyping(true);
    setTimeout(() => {
      const messageId = generateMessageId();
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some(msg => msg.id === messageId);
        if (messageExists) return prev;
        return [...prev, { type: 'bot', content, timestamp: new Date(), id: messageId }];
      });
      setIsTyping(false);
    }, delay);
  };

  const addUserMessage = (content: string) => {
    const messageId = generateMessageId();
    setMessages(prev => {
      // Check if message already exists to prevent duplicates
      const messageExists = prev.some(msg => msg.id === messageId);
      if (messageExists) return prev;
      return [...prev, { type: 'user', content, timestamp: new Date(), id: messageId }];
    });
  };

  const updateProgress = (step: number) => {
    setProgress((step / 5) * 100);
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim()) return;

    const userMessage = currentInput.trim();
    addUserMessage(userMessage);
    setCurrentInput('');

    // Process based on current step
    await processStep(userMessage);
  };

  const processStep = async (userMessage: string) => {
    switch (currentStep) {
      case 0: // Business name
        setBusinessData(prev => ({ ...prev, businessName: userMessage }));
        setCurrentStep(1);
        updateProgress(1);
        addBotMessage(`Great! Now, what type of business is ${userMessage}? For example: plumbing, hair salon, restaurant, auto repair, etc.`, 800);
        break;

      case 1: // Business type
        setBusinessData(prev => ({ ...prev, businessType: userMessage }));
        setCurrentStep(2);
        updateProgress(2);
        addBotMessage("Perfect! What are your main services that customers call about?", 500);
        setTimeout(() => {
          addBotMessage(
            <div className="space-y-2">
              <p className="mb-3">Here are some common ones for your business type:</p>
              <button 
                onClick={() => handleServiceSelection('Appointments & Scheduling')}
                className="block w-full text-left bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Select appointments and scheduling service"
              >
                📅 Appointments & Scheduling
              </button>
              <button 
                onClick={() => handleServiceSelection('Service Information & Pricing')}
                className="block w-full text-left bg-green-100 hover:bg-green-200 text-green-800 px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                aria-label="Select service information and pricing"
              >
                💰 Service Information & Pricing
              </button>
              <button 
                onClick={() => handleServiceSelection('Emergency Calls')}
                className="block w-full text-left bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Select emergency calls service"
              >
                🚨 Emergency Calls
              </button>
              <button 
                onClick={() => handleServiceSelection('General Questions')}
                className="block w-full text-left bg-purple-100 hover:bg-purple-200 text-purple-800 px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                aria-label="Select general questions service"
              >
                ❓ General Questions
              </button>
            </div>,
            800
          );
        }, 1000);
        break;

      case 2: // Services handled by buttons
        break;

      case 3: // Business hours
        setBusinessData(prev => ({ ...prev, hours: userMessage }));
        setCurrentStep(4);
        updateProgress(4);
        addBotMessage("Got it! One last thing - how do you like to talk to customers? Friendly and casual, or more professional?", 800);
        break;

      case 4: // Phone style
        setBusinessData(prev => ({ ...prev, phoneStyle: userMessage }));
        setCurrentStep(5);
        updateProgress(5);
        addBotMessage("Perfect! Now I'm setting up your phone assistant with everything you told me...", 800);
        setTimeout(() => {
          createPhoneAssistant();
        }, 1500);
        break;

      case 5: // Final step
        addBotMessage("🎉 Your phone assistant is ready! You can start using it right away.", 800);
        setTimeout(() => {
          showFinalInstructions();
        }, 1500);
        break;
    }
  };

  const handleServiceSelection = (service: string) => {
    addUserMessage(service);
    setBusinessData(prev => ({
      ...prev,
      services: [...(prev.services || []), service]
    }));
    setCurrentStep(3);
    updateProgress(3);
    
    addBotMessage(`Excellent! Your assistant will handle ${service.toLowerCase()}. What are your business hours? (Like "Monday-Friday 9am-5pm" or "24/7 for emergencies")`, 800);
  };

  const createPhoneAssistant = () => {
    addBotMessage(
      <div className="space-y-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">🤖 Creating Your Assistant...</h4>
          <div className="space-y-2 text-sm text-blue-700">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" aria-hidden="true"></div>
              <span>Setting up phone number</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" aria-hidden="true"></div>
              <span>Teaching about {businessData.businessType} services</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" aria-hidden="true"></div>
              <span>Programming {businessData.phoneStyle} conversation style</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true"></div>
              <span>Testing everything works...</span>
            </div>
          </div>
        </div>
      </div>,
      800
    );

    setTimeout(() => {
      setShowPhoneNumber(true);
      addBotMessage(
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-800 mb-2">📞 Your New Phone Number</h4>
          <div className="text-2xl font-bold text-green-800 mb-2" aria-label={`Phone number ${phoneNumber}`}>{phoneNumber}</div>
          <p className="text-sm text-green-700">This number is ready to take calls right now!</p>
        </div>,
        1000
      );
    }, 3000);
  };

  const showFinalInstructions = () => {
    addBotMessage(
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-800 mb-3">✅ You're All Set!</h4>
          <div className="space-y-2 text-sm text-green-700">
            <p><strong>Your phone number:</strong> {phoneNumber}</p>
            <p><strong>Business:</strong> {businessData.businessName}</p>
            <p><strong>Services:</strong> {businessData.services?.join(', ')}</p>
            <p><strong>Hours:</strong> {businessData.hours}</p>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">What happens next:</h4>
          <ul className="text-sm text-blue-700 space-y-1" role="list">
            <li role="listitem">• Give customers your new number</li>
            <li role="listitem">• Your assistant answers all calls</li>
            <li role="listitem">• You get text summaries of each call</li>
            <li role="listitem">• Appointments are added to your calendar</li>
          </ul>
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
      </div>,
      800
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-labelledby="onboarding-title" aria-modal="true">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Logo size="md" showText={false} />
            <div>
              <h2 id="onboarding-title" className="text-xl font-bold text-gray-900">Cutcall Setup</h2>
              <p className="text-sm text-gray-500">Let's get your business phone assistant ready</p>
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
              <span className="text-sm text-gray-500" aria-label={`${Math.round(progress)} percent complete`}>{Math.round(progress)}%</span>
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
                    : 'bg-gradient-to-r from-purple-500 to-blue-500'
                }`} aria-hidden="true">
                  {message.type === 'user' ? 
                    <User className="w-4 h-4 text-white" /> : 
                    <Logo size="sm" variant="white" showText={false} />
                  }
                </div>
                
                <div className={`rounded-2xl px-6 py-4 ${
                  message.type === 'user'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-50 text-gray-900'
                }`} role={message.type === 'user' ? 'note' : 'status'} aria-label={`${message.type === 'user' ? 'Your' : 'Assistant'} message`}>
                  {typeof message.content === 'string' ? (
                    <p className="leading-relaxed">{message.content}</p>
                  ) : (
                    message.content
                  )}
                  
                  <div className={`text-xs mt-2 ${
                    message.type === 'user' ? 'text-purple-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center" aria-hidden="true">
                  <Logo size="sm" variant="white" showText={false} />
                </div>
                <div className="bg-gray-50 rounded-2xl px-6 py-4" aria-label="Assistant is typing">
                  <div className="typing-indicator">
                    <div className="typing-dot" style={{ '--delay': '0ms' } as React.CSSProperties}></div>
                    <div className="typing-dot" style={{ '--delay': '150ms' } as React.CSSProperties}></div>
                    <div className="typing-dot" style={{ '--delay': '300ms' } as React.CSSProperties}></div>
                  </div>
                  <span className="sr-only">Assistant is typing a response</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex gap-4">
            <label htmlFor="message-input" className="sr-only">Type your answer</label>
            <textarea
              id="message-input"
              ref={inputRef}
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your answer..."
              className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={1}
              aria-describedby="input-help"
            />
            <div id="input-help" className="sr-only">Press Enter to send your message</div>
            <button
              onClick={handleSendMessage}
              disabled={!currentInput.trim() || isTyping}
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-3 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingChat;