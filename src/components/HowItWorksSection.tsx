import React, { useEffect, useState } from 'react';
import { MessageSquare, Settings, Phone, ArrowRight, CheckCircle, Play } from 'lucide-react';

interface HowItWorksSectionProps {
  onStartBuilding: () => void;
}

const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ onStartBuilding }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const stepIndex = parseInt(entry.target.getAttribute('data-step') || '0');
            setVisibleSteps(prev => {
              if (!prev.includes(stepIndex)) {
                return [...prev, stepIndex];
              }
              return prev;
            });
          }
        });
      },
      { threshold: 0.5 }
    );

    const steps = document.querySelectorAll('.step-card');
    steps.forEach(step => observer.observe(step));

    // Auto-cycle through steps
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % 3);
    }, 3000);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  const handleDemoClick = () => {
    // For now, just scroll to testimonials where they can hear more examples
    const element = document.querySelector('#testimonials');
    if (element) {
      const headerHeight = 80;
      const elementPosition = element.offsetTop - headerHeight;
      
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  const steps = [
    {
      icon: MessageSquare,
      title: "Tell Us About Your Business",
      description: "We'll ask a few simple questions about your business, services, and how you want your assistant to sound.",
      details: [
        "What services you offer",
        "Your business hours", 
        "How you like to talk to customers",
        "Your pricing and policies"
      ],
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50"
    },
    {
      icon: Settings,
      title: "We Set Everything Up",
      description: "Our system creates your phone assistant and teaches it everything about your business automatically.",
      details: [
        "Creates your phone number",
        "Learns your services and pricing",
        "Sets up appointment booking",
        "Tests everything works perfectly"
      ],
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-50"
    },
    {
      icon: Phone,
      title: "Start Taking Calls",
      description: "Your assistant is ready to answer calls immediately. You can listen to calls and make changes anytime.",
      details: [
        "Answers calls right away",
        "Books appointments automatically",
        "Sends you call summaries",
        "Gets smarter over time"
      ],
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50"
    }
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 bg-gray-900 relative overflow-hidden" role="main" aria-labelledby="how-it-works-heading">
      {/* Animated background */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 id="how-it-works-heading" className="text-4xl lg:text-6xl font-bold text-white mb-6">
            How It
            <span className="gradient-text"> Works</span>
          </h2>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Get your phone assistant up and running in just a few minutes. 
            No complicated setup or technical knowledge needed.
          </p>
          
          <div className="flex justify-center">
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-full px-6 py-3 text-white/80" role="status" aria-label="Setup time estimate">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" aria-hidden="true"></div>
              <span className="text-sm">Most customers are ready in under 10 minutes</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-16" role="list" aria-label="Setup process steps">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isVisible = visibleSteps.includes(index);
            const isActive = activeStep === index;
            
            return (
              <article
                key={index}
                data-step={index}
                className={`step-card relative transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                } ${isActive ? 'scale-105' : 'scale-100'}`}
                style={{ transitionDelay: `${index * 200}ms` }}
                onMouseEnter={() => setActiveStep(index)}
                role="listitem"
                tabIndex={0}
                aria-labelledby={`step-title-${index}`}
                aria-describedby={`step-desc-${index}`}
                onFocus={() => setActiveStep(index)}
              >
                {/* Step number and connector */}
                <div className="flex items-center mb-8">
                  <div className={`relative w-12 h-12 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center text-white font-bold text-lg ${isActive ? 'animate-pulse-slow' : ''}`} aria-label={`Step ${index + 1}`}>
                    {index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block flex-1 h-px bg-gradient-to-r from-white/30 to-transparent ml-4" aria-hidden="true"></div>
                  )}
                </div>
                
                <div className={`glass-morphism-dark rounded-2xl p-8 h-full transition-all duration-300 ${isActive ? 'bg-white/15 border-white/30' : 'hover:bg-white/10'} focus-within:ring-4 focus-within:ring-white/30`}>
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${step.color} mb-6 ${isActive ? 'animate-float' : ''}`} aria-hidden="true">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <h3 id={`step-title-${index}`} className="text-2xl font-bold text-white mb-4">
                    {step.title}
                  </h3>
                  
                  <p id={`step-desc-${index}`} className="text-gray-300 mb-6 leading-relaxed">
                    {step.description}
                  </p>
                  
                  <ul className="space-y-3" role="list" aria-label={`${step.title} details`}>
                    {step.details.map((detail, detailIndex) => (
                      <li key={detailIndex} className="flex items-center gap-3 text-gray-400" role="listitem">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" aria-hidden="true" />
                        <span className="text-sm">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
        
        {/* CTA Section */}
        <div className="text-center">
          <div className="glass-morphism-dark rounded-2xl p-8 max-w-2xl mx-auto" role="region" aria-labelledby="cta-heading">
            <h3 id="cta-heading" className="text-2xl font-bold text-white mb-4">
              Say Goodbye to Missed Calls
            </h3>
            <p className="text-gray-300 mb-6">
              Join hundreds of small businesses who never miss a customer call anymore.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onStartBuilding}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-300 flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500/50"
                aria-label="Activate your assistant now"
              >
                Activate Your Assistant Now
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </button>
              
              <button 
                onClick={handleDemoClick}
                className="glass-morphism-dark text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-white/30 flex items-center justify-center gap-2" 
                aria-label="Hear what your assistant would sound like"
              >
                <Play className="w-5 h-5" aria-hidden="true" />
                Hear What It Would Sound Like
              </button>
            </div>
            
            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-400" role="list" aria-label="Additional benefits">
              <span role="listitem">✨ No setup fees</span>
              <span role="listitem">🚀 Ready in minutes</span>
              <span role="listitem">💬 Always available</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;