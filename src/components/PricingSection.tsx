import React, { useEffect, useState } from 'react';
import { Check, Zap, Star, ArrowRight, Phone, MessageSquare, Calendar, Play, CreditCard } from 'lucide-react';

interface PricingSectionProps {
  onStartBuilding: () => void;
}

const PricingSection: React.FC<PricingSectionProps> = ({ onStartBuilding }) => {
  const [visibleCards, setVisibleCards] = useState<number[]>([]);
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null);

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

    const cards = document.querySelectorAll('.pricing-card');
    cards.forEach(card => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  const handleDemoClick = () => {
    // Placeholder for demo functionality
    alert('Demo call feature coming soon! For now, you can see how the assistant works in the chat simulation above.');
  };

  const plans = [
    {
      name: "Starter",
      description: "Perfect for small businesses just getting started",
      price: "29",
      period: "month",
      popular: false,
      features: [
        "Up to 100 calls per month",
        "Square integration included",
        "Basic appointment scheduling",
        "Email call summaries",
        "Business hours availability",
        "Standard voice quality",
        "Email support"
      ],
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50",
      icon: Phone,
      cta: "Connect Square & Start"
    },
    {
      name: "Professional",
      description: "Most popular for growing service businesses",
      price: "79",
      period: "month",
      popular: true,
      features: [
        "Up to 500 calls per month",
        "Square integration included",
        "Advanced appointment scheduling",
        "Phone payment processing",
        "SMS & email notifications",
        "24/7 availability",
        "Premium voice quality",
        "Custom business information",
        "Call analytics dashboard",
        "Priority support"
      ],
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-50",
      icon: MessageSquare,
      cta: "Connect Square & Activate"
    },
    {
      name: "Enterprise",
      description: "For established businesses with high call volume",
      price: "199",
      period: "month",
      popular: false,
      features: [
        "Unlimited calls",
        "Square integration included",
        "Multi-location support",
        "Advanced payment processing",
        "Advanced integrations",
        "Custom voice training",
        "Dedicated account manager",
        "API access",
        "Advanced analytics",
        "White-label options",
        "24/7 phone support"
      ],
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-50 to-emerald-50",
      icon: Star,
      cta: "Connect Square & Get Enterprise"
    }
  ];

  const features = [
    {
      icon: CreditCard,
      title: "Square Integration",
      description: "Connect your Square account for instant setup and payment processing"
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "Automatically books appointments in your calendar"
    },
    {
      icon: MessageSquare,
      title: "Instant Summaries",
      description: "Get text summaries of every call within minutes"
    }
  ];

  return (
    <section id="pricing" className="py-20 px-4 bg-gradient-to-br from-gray-50 to-blue-50 relative overflow-hidden" role="main" aria-labelledby="pricing-heading">
      <div className="absolute inset-0 bg-white/30" aria-hidden="true"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-6" role="status">
            <Zap className="w-4 h-4" aria-hidden="true" />
            Simple, Transparent Pricing
          </div>
          
          <h2 id="pricing-heading" className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
            Choose Your
            <span className="gradient-text block">Perfect Plan</span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Start with any plan and upgrade as your business grows. 
            Square integration included in all plans. No setup fees, no long-term contracts.
          </p>

          <div className="flex justify-center">
            <div className="bg-white rounded-2xl p-2 shadow-lg border border-gray-200">
              <div className="flex items-center gap-4 text-sm">
                <span className="px-4 py-2 text-gray-600">Monthly</span>
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-lg font-medium">
                  Save 20% with Annual
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Square Integration Highlight */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-3xl p-8 mb-16 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-md px-6 py-3 rounded-full mb-4">
              <CreditCard className="w-6 h-6" />
              <span className="font-semibold">Square Integration Included in All Plans</span>
            </div>
            <h3 className="text-2xl font-bold mb-4">No Extra Fees for Square Integration</h3>
            <p className="text-blue-100 mb-6">
              Every plan includes full Square integration at no additional cost. Import your business info, 
              accept payments, and sync appointments automatically.
            </p>
            <div className="text-sm text-blue-100">
              <strong>Don't have Square?</strong> We'll help you create a free account in just 2 minutes!
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16" role="list" aria-label="Pricing plans">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            const isVisible = visibleCards.includes(index);
            const isHovered = hoveredPlan === index;
            
            return (
              <article
                key={index}
                data-index={index}
                className={`pricing-card relative transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                } ${plan.popular ? 'lg:scale-105 lg:-mt-4' : ''} ${
                  isHovered ? 'scale-105' : ''
                }`}
                style={{ transitionDelay: `${index * 200}ms` }}
                onMouseEnter={() => setHoveredPlan(index)}
                onMouseLeave={() => setHoveredPlan(null)}
                role="listitem"
                tabIndex={0}
                aria-labelledby={`plan-title-${index}`}
                aria-describedby={`plan-desc-${index}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
                      Most Popular
                    </div>
                  </div>
                )}
                
                <div className={`relative bg-white rounded-3xl p-8 shadow-xl border-2 transition-all duration-300 h-full ${
                  plan.popular 
                    ? 'border-purple-200 shadow-purple-100/50' 
                    : 'border-gray-100 hover:border-gray-200'
                } ${isHovered ? 'shadow-2xl' : ''}`}>
                  
                  {/* Background gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${plan.bgGradient} opacity-0 group-hover:opacity-50 rounded-3xl transition-opacity duration-300`} aria-hidden="true"></div>
                  
                  <div className="relative z-10">
                    {/* Icon */}
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${plan.gradient} mb-6 ${isHovered ? 'animate-float' : ''}`} aria-hidden="true">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    
                    {/* Plan name and description */}
                    <h3 id={`plan-title-${index}`} className="text-2xl font-bold text-gray-900 mb-2">
                      {plan.name}
                    </h3>
                    <p id={`plan-desc-${index}`} className="text-gray-600 mb-6">
                      {plan.description}
                    </p>
                    
                    {/* Price */}
                    <div className="mb-8">
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold text-gray-900">${plan.price}</span>
                        <span className="text-gray-500">/{plan.period}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Square integration included
                      </div>
                    </div>
                    
                    {/* CTA Button */}
                    <button
                      onClick={onStartBuilding}
                      className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 mb-8 focus:outline-none focus:ring-4 ${
                        plan.popular
                          ? `bg-gradient-to-r ${plan.gradient} text-white hover:shadow-xl hover:scale-105 focus:ring-purple-500/50`
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500/50'
                      }`}
                      aria-label={`${plan.cta} with ${plan.name} plan`}
                    >
                      {plan.cta}
                      <ArrowRight className="w-5 h-5 inline-block ml-2" aria-hidden="true" />
                    </button>
                    
                    {/* Features */}
                    <ul className="space-y-4" role="list" aria-label={`${plan.name} plan features`}>
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-3" role="listitem">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Features highlight */}
        <div className="grid md:grid-cols-3 gap-8 mb-16" role="list" aria-label="Key features">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isVisible = visibleCards.includes(index + 100);
            
            return (
              <div
                key={index}
                data-index={index + 100}
                className={`pricing-card text-center transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
                role="listitem"
              >
                <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
                  <div className="inline-flex p-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 mb-4" aria-hidden="true">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ or guarantee section */}
        <div className="text-center">
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 max-w-2xl mx-auto" role="region" aria-labelledby="guarantee-heading">
            <h3 id="guarantee-heading" className="text-2xl font-bold text-gray-900 mb-4">
              Say Goodbye to Missed Calls. Connect Square & Start Today.
            </h3>
            <p className="text-gray-600 mb-6">
              Try any plan risk-free for 30 days. If you're not completely satisfied, 
              we'll refund every penny. No questions asked.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onStartBuilding}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-300 flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500/50"
                aria-label="Connect Square & Start"
              >
                <CreditCard className="w-5 h-5" aria-hidden="true" />
                Connect Square & Start
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </button>
              
              <button
                onClick={handleDemoClick}
                className="bg-white border-2 border-purple-500 text-purple-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-purple-50 transition-all duration-300 flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-purple-500/50"
                aria-label="Hear what your assistant would sound like"
              >
                <Play className="w-5 h-5" aria-hidden="true" />
                Hear What It Sounds Like
              </button>
            </div>
            
            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-500" role="list" aria-label="Trial benefits">
              <span role="listitem">✨ No credit card required</span>
              <span role="listitem">🚀 Setup in 2 minutes</span>
              <span role="listitem">💳 Square integration included</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;