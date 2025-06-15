import React, { useEffect, useState } from 'react';
import { 
  Phone, 
  Calendar, 
  Clock, 
  Shield, 
  BarChart3, 
  MessageSquare,
  Sparkles,
  CheckCircle,
  ArrowRight,
  CreditCard,
  Zap
} from 'lucide-react';

const FeaturesSection: React.FC = () => {
  const [visibleCards, setVisibleCards] = useState<number[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cardIndex = parseInt(entry.target.getAttribute('data-index') || '0');
            setVisibleCards(prev => {
              if (!prev.includes(cardIndex)) {
                return [...prev, cardIndex];
              }
              return prev;
            });
          }
        });
      },
      { threshold: 0.3 }
    );

    const cards = document.querySelectorAll('.feature-card');
    cards.forEach(card => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: CreditCard,
      title: "Square Integration",
      description: "Connect your Square account for instant setup. Import business info, accept payments, and sync everything automatically.",
      gradient: "from-blue-500 to-cyan-500",
      benefits: ["Instant business setup", "Accept phone payments", "Sync appointments"],
      featured: true
    },
    {
      icon: Phone,
      title: "Answer Every Call",
      description: "Your assistant picks up every call, even when you're with customers or after hours.",
      gradient: "from-green-500 to-emerald-500",
      benefits: ["Never miss a customer", "Works 24/7", "Sounds professional"]
    },
    {
      icon: Calendar,
      title: "Book Appointments",
      description: "Customers can schedule appointments instantly without waiting for callbacks.",
      gradient: "from-purple-500 to-pink-500",
      benefits: ["Real-time scheduling", "Sends confirmations", "Reduces no-shows"]
    },
    {
      icon: MessageSquare,
      title: "Answer Questions",
      description: "Provides information about your services, pricing, and availability automatically.",
      gradient: "from-orange-500 to-red-500",
      benefits: ["Service details", "Pricing info", "Business hours"]
    },
    {
      icon: Clock,
      title: "Save Your Time",
      description: "Stop dropping what you're doing to answer the phone. Focus on your work.",
      gradient: "from-indigo-500 to-purple-500",
      benefits: ["More productive days", "Less interruptions", "Better work quality"]
    },
    {
      icon: BarChart3,
      title: "Track Your Calls",
      description: "See how many calls you're getting, what customers want, and when you're busiest.",
      gradient: "from-teal-500 to-blue-500",
      benefits: ["Call summaries", "Customer insights", "Busy time reports"]
    }
  ];

  return (
    <section id="features" className="py-20 px-4 bg-white relative overflow-hidden" role="main" aria-labelledby="features-heading">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-blue-50" aria-hidden="true"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-6" role="status">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            What Your Assistant Does
          </div>
          
          <h2 id="features-heading" className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
            Everything You Need to
            <span className="gradient-text block">Grow Your Business</span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your phone assistant handles the calls so you can focus on what you do best.
            No more missed opportunities or interrupted work.
          </p>
        </div>

        {/* Square Integration Callout */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-3xl p-8 mb-16 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-md px-6 py-3 rounded-full mb-6">
              <CreditCard className="w-6 h-6" />
              <span className="font-semibold">Square Integration Included</span>
            </div>
            <h3 className="text-3xl font-bold mb-4">Setup in Under 2 Minutes</h3>
            <p className="text-xl text-blue-100 mb-6 max-w-2xl mx-auto">
              Connect your Square account and we'll automatically import your business information, 
              enable phone payments, and sync your appointment system.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
                <Zap className="w-8 h-8 mx-auto mb-2" />
                <h4 className="font-semibold mb-1">Instant Import</h4>
                <p className="text-sm text-blue-100">Business info, hours, services</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
                <CreditCard className="w-8 h-8 mx-auto mb-2" />
                <h4 className="font-semibold mb-1">Phone Payments</h4>
                <p className="text-sm text-blue-100">Accept payments over the phone</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
                <Calendar className="w-8 h-8 mx-auto mb-2" />
                <h4 className="font-semibold mb-1">Smart Booking</h4>
                <p className="text-sm text-blue-100">Sync with your calendar system</p>
              </div>
            </div>
            <div className="mt-6">
              <p className="text-blue-100 text-sm">
                <strong>Don't have Square?</strong> No problem! We'll help you create a free account in just 2 minutes.
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" role="list" aria-label="Phone assistant features">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isVisible = visibleCards.includes(index);
            
            return (
              <article
                key={index}
                data-index={index}
                className={`feature-card group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-500 border border-gray-100 hover:border-gray-200 focus-within:ring-4 focus-within:ring-purple-500/20 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                } ${feature.featured ? 'ring-2 ring-blue-200' : ''}`}
                style={{ 
                  transitionDelay: `${index * 150}ms`,
                  transform: isVisible ? 'translateY(0)' : 'translateY(40px)'
                }}
                role="listitem"
                tabIndex={0}
                aria-labelledby={`feature-title-${index}`}
                aria-describedby={`feature-desc-${index}`}
              >
                {feature.featured && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Featured Integration
                    </div>
                  </div>
                )}
                
                <div className="relative z-10">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.gradient} mb-6 group-hover:scale-110 transition-transform duration-300`} aria-hidden="true">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <h3 id={`feature-title-${index}`} className="text-xl font-bold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors">
                    {feature.title}
                  </h3>
                  
                  <p id={`feature-desc-${index}`} className="text-gray-600 mb-6 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  <ul className="space-y-2" role="list" aria-label={`${feature.title} benefits`}>
                    {feature.benefits.map((benefit, benefitIndex) => (
                      <li key={benefitIndex} className="flex items-center gap-2 text-sm text-gray-500" role="listitem">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" aria-hidden="true" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Hover effect background */}
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} aria-hidden="true"></div>
                
                {/* Animated border */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl" aria-hidden="true"></div>
              </article>
            );
          })}
        </div>
        
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-xl" role="status" aria-label="Call to action">
            <span>Ready to never miss another call?</span>
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;