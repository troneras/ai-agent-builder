import React, { useEffect, useState } from 'react';
import { Star, Quote, CheckCircle, Users, TrendingUp, Clock, Play } from 'lucide-react';

const TestimonialsSection: React.FC = () => {
  const [visibleCards, setVisibleCards] = useState<number[]>([]);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

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

    const cards = document.querySelectorAll('.testimonial-card');
    cards.forEach(card => observer.observe(card));

    // Auto-cycle through testimonials
    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % testimonials.length);
    }, 5000);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  const handleDemoClick = () => {
    // Placeholder for demo functionality
    alert('Demo call feature coming soon! For now, you can see how the assistant works in the chat simulation above.');
  };

  const testimonials = [
    {
      name: "Sarah Martinez",
      business: "Martinez Hair Studio",
      location: "Austin, TX",
      rating: 5,
      quote: "I used to miss so many calls when I was with clients. Now my assistant books appointments even when I'm busy cutting hair. My bookings went up 40% in the first month!",
      avatar: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
      results: "40% more bookings",
      timeUsing: "6 months"
    },
    {
      name: "Mike Thompson",
      business: "Thompson Plumbing",
      location: "Denver, CO", 
      rating: 5,
      quote: "Emergency calls come in at all hours. My assistant handles them perfectly - gets the details, schedules the visit, and texts me right away. Customers love how professional it sounds.",
      avatar: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
      results: "24/7 availability",
      timeUsing: "8 months"
    },
    {
      name: "Lisa Chen",
      business: "Paws & Claws Grooming",
      location: "Seattle, WA",
      rating: 5,
      quote: "Setting this up was so easy! Now pet owners can book grooming appointments anytime. The assistant knows all our services and pricing. It's like having a receptionist who never takes a break.",
      avatar: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
      results: "Zero missed calls",
      timeUsing: "4 months"
    },
    {
      name: "Carlos Rodriguez",
      business: "Rodriguez Auto Repair",
      location: "Phoenix, AZ",
      rating: 5,
      quote: "My customers can call anytime to check on their car or schedule service. The assistant explains our services better than I do! It's helped me focus on fixing cars instead of answering phones.",
      avatar: "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
      results: "More time for work",
      timeUsing: "1 year"
    },
    {
      name: "Jennifer Walsh",
      business: "Clean Sweep Cleaning",
      location: "Miami, FL",
      rating: 5,
      quote: "I run a cleaning business and I'm always at client locations. My assistant handles all the scheduling and gives quotes over the phone. My business has grown so much I had to hire more cleaners!",
      avatar: "https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
      results: "Business doubled",
      timeUsing: "10 months"
    },
    {
      name: "David Kim",
      business: "Kim's Landscaping",
      location: "Portland, OR",
      rating: 5,
      quote: "Landscaping season gets crazy busy. My assistant handles all the calls for estimates and scheduling. Customers get answers right away instead of waiting for me to call back. Game changer!",
      avatar: "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
      results: "Faster responses",
      timeUsing: "7 months"
    }
  ];

  const stats = [
    {
      icon: Users,
      number: "2,500+",
      label: "Happy Business Owners",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: TrendingUp,
      number: "35%",
      label: "Average Revenue Increase",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Clock,
      number: "24/7",
      label: "Always Available",
      color: "from-purple-500 to-pink-500"
    }
  ];

  return (
    <section id="testimonials" className="py-20 px-4 bg-gradient-to-br from-gray-50 to-blue-50 relative overflow-hidden" role="main" aria-labelledby="testimonials-heading">
      <div className="absolute inset-0 bg-white/50" aria-hidden="true"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6" role="status">
            <CheckCircle className="w-4 h-4" aria-hidden="true" />
            Customer Success Stories
          </div>
          
          <h2 id="testimonials-heading" className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
            Are You the One Always Hanging Up
            <span className="gradient-text block">to Get Back to Work?</span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            See how small business owners like you solved the problem of missed calls and interruptions.
          </p>

          {/* Demo CTA */}
          <div className="flex justify-center mb-8">
            <button
              onClick={handleDemoClick}
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-300 flex items-center gap-2 shadow-xl hover:shadow-2xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500/50"
              aria-label="Listen to a demo call"
            >
              <Play className="w-5 h-5" aria-hidden="true" />
              Listen to a Demo Call
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-8 mb-16" role="list" aria-label="Success statistics">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const isVisible = visibleCards.includes(index + 100); // Offset to avoid conflicts
            
            return (
              <div
                key={index}
                data-index={index + 100}
                className={`testimonial-card text-center transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
                role="listitem"
              >
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
                  <div className={`inline-flex p-4 rounded-xl bg-gradient-to-r ${stat.color} mb-4`} aria-hidden="true">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-4xl font-bold text-gray-900 mb-2" aria-label={`${stat.number} ${stat.label}`}>
                    {stat.number}
                  </div>
                  <div className="text-gray-600 font-medium">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Featured Testimonial */}
        <div className="mb-16">
          <div className="bg-white rounded-3xl p-8 lg:p-12 shadow-xl border border-gray-100 max-w-4xl mx-auto" role="region" aria-labelledby="featured-testimonial">
            <div className="flex items-center gap-4 mb-6">
              <img 
                src={testimonials[activeTestimonial].avatar}
                alt={`${testimonials[activeTestimonial].name} profile`}
                className="w-16 h-16 rounded-full object-cover border-4 border-purple-100"
              />
              <div>
                <div className="font-bold text-xl text-gray-900">{testimonials[activeTestimonial].name}</div>
                <div className="text-purple-600 font-medium">{testimonials[activeTestimonial].business}</div>
                <div className="text-gray-500 text-sm">{testimonials[activeTestimonial].location}</div>
              </div>
              <div className="ml-auto">
                <div className="flex gap-1 mb-2" role="img" aria-label={`${testimonials[activeTestimonial].rating} out of 5 stars`}>
                  {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                  ))}
                </div>
                <div className="text-sm text-gray-500">Using for {testimonials[activeTestimonial].timeUsing}</div>
              </div>
            </div>
            
            <div className="relative">
              <Quote className="absolute -top-2 -left-2 w-8 h-8 text-purple-200" aria-hidden="true" />
              <blockquote className="text-xl lg:text-2xl text-gray-700 leading-relaxed pl-6" id="featured-testimonial">
                {testimonials[activeTestimonial].quote}
              </blockquote>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                <TrendingUp className="w-4 h-4" aria-hidden="true" />
                Result: {testimonials[activeTestimonial].results}
              </div>
            </div>
          </div>
          
          {/* Testimonial Navigation */}
          <div className="flex justify-center mt-8 gap-2" role="tablist" aria-label="Select testimonial">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveTestimonial(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  activeTestimonial === index 
                    ? 'bg-purple-500 w-8' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                role="tab"
                aria-selected={activeTestimonial === index}
                aria-label={`View testimonial from ${testimonials[index].name}`}
              />
            ))}
          </div>
        </div>

        {/* Testimonial Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" role="list" aria-label="Customer testimonials">
          {testimonials.slice(0, 6).map((testimonial, index) => {
            const isVisible = visibleCards.includes(index + 200); // Offset to avoid conflicts
            
            return (
              <article
                key={index}
                data-index={index + 200}
                className={`testimonial-card bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-500 border border-gray-100 hover:border-purple-200 group ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
                role="listitem"
              >
                <div className="flex items-center gap-3 mb-4">
                  <img 
                    src={testimonial.avatar}
                    alt={`${testimonial.name} profile`}
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-100 group-hover:border-purple-200 transition-colors"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-purple-600">{testimonial.business}</div>
                  </div>
                  <div className="flex gap-1" role="img" aria-label={`${testimonial.rating} out of 5 stars`}>
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                    ))}
                  </div>
                </div>
                
                <blockquote className="text-gray-600 leading-relaxed mb-4 line-clamp-4">
                  "{testimonial.quote}"
                </blockquote>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{testimonial.location}</span>
                  <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                    {testimonial.results}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;