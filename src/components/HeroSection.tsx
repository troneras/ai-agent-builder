import React, { useState, useEffect } from 'react';
import { MessageCircle, ArrowRight, Play } from 'lucide-react';
import Logo from './Logo';

interface HeroSectionProps {
  onStartBuilding: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onStartBuilding }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [demoMessages, setDemoMessages] = useState<Array<{ type: 'user' | 'bot'; content: string; id: string }>>([]);
  const [showTyping, setShowTyping] = useState(false);
  const [demoStarted, setDemoStarted] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    // Start demo conversation after hero loads
    const timer = setTimeout(() => {
      if (!demoStarted) {
        startDemoConversation();
        setDemoStarted(true);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [demoStarted]);

  const startDemoConversation = async () => {
    const conversation = [
      { type: 'bot' as const, content: "Hi! Thanks for calling Mike's Plumbing. How can I help you today?", id: 'msg-1' },
      { type: 'user' as const, content: "Hi, I need someone to fix a leaky faucet. Are you available this week?", id: 'msg-2' },
      { type: 'bot' as const, content: "Absolutely! I can schedule that for you. What's your address and when works best - morning or afternoon?", id: 'msg-3' },
      { type: 'user' as const, content: "123 Oak Street, and afternoon would be perfect", id: 'msg-4' },
      { type: 'bot' as const, content: "Perfect! I've got you scheduled for Thursday at 2 PM. You'll get a text reminder. Anything else I can help with?", id: 'msg-5' }
    ];

    for (let i = 0; i < conversation.length; i++) {
      if (i > 0) {
        setShowTyping(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setShowTyping(false);
      }

      setDemoMessages(prev => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some(msg => msg.id === conversation[i].id);
        if (messageExists) return prev;
        return [...prev, conversation[i]];
      });
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  };

  const handleDemoClick = () => {
    // For now, just scroll to testimonials where they can hear more examples
    const element = document.querySelector('#testimonials') as HTMLElement;
    if (element) {
      const headerHeight = 80;
      const elementPosition = element.offsetTop - headerHeight;

      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center px-4 py-20 pt-32 relative overflow-hidden" role="banner">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* Content */}
        <div className={`text-center lg:text-left transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Never Miss Another
            <span className="block text-white drop-shadow-lg" style={{
              textShadow: '2px 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.3)'
            }}>
              Customer Call
            </span>
            <span className="block text-white drop-shadow-lg" style={{
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }}>
              Again
            </span>
          </h1>

          <p className="text-xl lg:text-2xl text-white mb-8 leading-relaxed drop-shadow-md" style={{
            textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
          }}>
            Your AI phone assistant answers calls, schedules appointments, and helps customers
            even when you're busy or closed.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <button
              onClick={onStartBuilding}
              className="bg-white text-purple-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/50"
              aria-label="Start building your phone assistant"
            >
              Start Building
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              onClick={handleDemoClick}
              className="glass-morphism text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-white/30 flex items-center justify-center gap-2"
              aria-label="Hear what your assistant sounds like"
            >
              <Play className="w-5 h-5" aria-hidden="true" />
              Hear Demo
            </button>
          </div>

          <div className="flex items-center justify-center lg:justify-start gap-8 text-white/90" role="list" aria-label="Key benefits">
            <div className="flex items-center gap-2" role="listitem">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" aria-hidden="true"></div>
              <span className="drop-shadow-sm" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>No Monthly Fees</span>
            </div>
            <div className="flex items-center gap-2" role="listitem">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" aria-hidden="true"></div>
              <span className="drop-shadow-sm" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>Works 24/7</span>
            </div>
            <div className="flex items-center gap-2" role="listitem">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" aria-hidden="true"></div>
              <span className="drop-shadow-sm" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>Ready Today</span>
            </div>
          </div>
        </div>

        {/* Demo Chat Interface */}
        <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
          <div className="glass-morphism rounded-2xl p-6 max-w-md mx-auto" role="region" aria-label="Demo phone conversation">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/20">
              <Logo size="sm" variant="white" showText={false} />
              <div>
                <div className="text-white font-semibold">Your Phone Assistant</div>
                <div className="text-white/60 text-sm">Always available</div>
              </div>
              <div className="ml-auto" aria-label="Online status">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Online"></div>
              </div>
            </div>

            <div className="space-y-4 h-80 overflow-y-auto" role="log" aria-label="Conversation messages" aria-live="polite">
              {demoMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-2xl ${message.type === 'user'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/20 text-white backdrop-blur-sm'
                      }`}
                    role={message.type === 'user' ? 'note' : 'status'}
                    aria-label={`${message.type === 'user' ? 'Customer' : 'Assistant'} message`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {showTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-2xl" aria-label="Assistant is typing">
                    <div className="typing-indicator">
                      <div className="typing-dot" style={{ '--delay': '0ms' } as React.CSSProperties}></div>
                      <div className="typing-dot" style={{ '--delay': '150ms' } as React.CSSProperties}></div>
                      <div className="typing-dot" style={{ '--delay': '300ms' } as React.CSSProperties}></div>
                    </div>
                    <span className="sr-only">Assistant is typing a response</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-3">
                <MessageCircle className="w-4 h-4 text-white/60" aria-hidden="true" />
                <span className="text-white/60 text-sm">This is how your assistant talks to customers</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;