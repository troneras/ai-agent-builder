import React, { useState } from 'react';
import { 
  CreditCard, 
  Calendar, 
  BarChart3, 
  Shield, 
  Clock, 
  CheckCircle, 
  ArrowRight, 
  ExternalLink,
  Zap,
  Users,
  TrendingUp,
  Star,
  LogOut,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import Logo from './Logo';

interface SquareConnectionPageProps {
  onConnected: () => void;
  onSkipped: () => void;
  onSignOut: () => void;
}

const SquareConnectionPage: React.FC<SquareConnectionPageProps> = ({ 
  onConnected, 
  onSkipped, 
  onSignOut 
}) => {
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const handleConnectSquare = async () => {
    if (!user || isConnecting) return;

    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Get Square integration
      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('*')
        .eq('ext_integration_id', 'squareup-sandbox')
        .single();

      if (integrationError || !integration) {
        throw new Error('Square integration not found');
      }

      // Create session token
      const { data, error } = await supabase.functions.invoke('nango-oauth', {
        body: {
          action: 'create_session',
          integrationId: integration.id,
          userId: user.id,
        }
      });

      if (error) {
        throw new Error(`Failed to create session: ${error.message}`);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const { sessionToken } = data;
      if (!sessionToken) {
        throw new Error('No session token received');
      }

      // Import Nango frontend SDK
      const { default: Nango } = await import('@nangohq/frontend');
      const nango = new Nango();

      // Open Connect UI
      const connect = nango.openConnectUI({
        onEvent: (event: { type: string; payload?: unknown }) => {
          console.log('Nango event:', event);

          if (event.type === 'close') {
            setIsConnecting(false);
          } else if (event.type === 'connect') {
            setIsConnecting(false);
            onConnected();
          } else if (event.type === 'error') {
            console.error('OAuth error:', event.payload);
            setConnectionError('Connection failed. Please try again.');
            setIsConnecting(false);
          }
        },
      });

      connect.setSessionToken(sessionToken);

    } catch (error) {
      console.error('Error connecting to Square:', error);
      setConnectionError(error instanceof Error ? error.message : 'Unknown error occurred');
      setIsConnecting(false);
    }
  };

  const benefits = [
    {
      icon: Clock,
      title: "Instant Setup",
      description: "Import your business info in seconds instead of typing everything manually",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Calendar,
      title: "Smart Booking",
      description: "Customers can book appointments directly through your phone system",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: CreditCard,
      title: "Payment Ready",
      description: "Accept payments over the phone with secure Square processing",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: BarChart3,
      title: "Business Insights",
      description: "Get analytics on calls, bookings, and customer interactions",
      color: "from-orange-500 to-red-500"
    }
  ];

  const features = [
    "Automatically import business name, phone, and hours",
    "Enable phone-based appointment booking",
    "Accept payments through your phone assistant",
    "Sync customer data and transaction history",
    "Get detailed analytics and reporting",
    "Keep everything in sync automatically"
  ];

  const testimonials = [
    {
      name: "Sarah Martinez",
      business: "Martinez Hair Studio",
      quote: "Connecting Square was the best decision! Now customers can book and pay over the phone. My revenue increased 40% in the first month.",
      rating: 5
    },
    {
      name: "Mike Thompson", 
      business: "Thompson Plumbing",
      quote: "The Square integration made everything seamless. Customers can schedule emergency calls and pay instantly. It's like having a full-time receptionist.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600">
      {/* Header */}
      <header className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo size="lg" variant="white" showText={true} />
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg">
              <div className="w-8 h-8 bg-white/20 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <div className="text-sm text-white">{user?.email}</div>
              </div>
            </div>

            <button
              onClick={onSignOut}
              className="flex items-center gap-2 px-4 py-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Step 1 of 2: Connect Your Business
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Connect Your
            <span className="block text-white drop-shadow-lg" style={{ 
              textShadow: '2px 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.3)' 
            }}>
              Square Account
            </span>
          </h1>
          
          <p className="text-xl lg:text-2xl text-white/90 mb-8 leading-relaxed max-w-3xl mx-auto drop-shadow-md" style={{ 
            textShadow: '1px 1px 2px rgba(0,0,0,0.7)' 
          }}>
            Import your business information instantly and unlock powerful phone-based booking and payment features.
          </p>

          {/* Main CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button
              onClick={handleConnectSquare}
              disabled={isConnecting}
              className="bg-white text-purple-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? (
                <>
                  <div className="w-5 h-5 border-2 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Connect Square Account
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            
            <a
              href="https://squareup.com/signup?affiliate_id=cutcall"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-morphism text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-white/30 flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              Create Square Account
            </a>
          </div>

          {/* Error Message */}
          {connectionError && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-8 max-w-md mx-auto">
              <p className="text-red-100 text-sm">{connectionError}</p>
            </div>
          )}

          {/* Skip Option */}
          <button
            onClick={onSkipped}
            className="text-white/70 hover:text-white text-sm underline transition-colors"
          >
            Skip for now (manual setup)
          </button>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className="glass-morphism rounded-2xl p-6 text-center hover:bg-white/20 transition-all duration-300"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${benefit.color} mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
                <p className="text-white/80 text-sm">{benefit.description}</p>
              </div>
            );
          })}
        </div>

        {/* Features Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <h2 className="text-3xl font-bold text-white mb-6">
              Why Connect Square?
            </h2>
            <p className="text-white/90 text-lg mb-6">
              Square integration transforms your phone assistant into a complete business solution. 
              Instead of manually entering all your business details, we'll import everything instantly.
            </p>
            
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3 text-white/90">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-morphism rounded-2xl p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Setup in Seconds</h3>
              <p className="text-white/80">
                Connect once, and we'll handle the rest. Your phone assistant will be ready 
                to take calls, book appointments, and process payments immediately.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">2min</div>
                <div className="text-white/70 text-sm">Setup Time</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">24/7</div>
                <div className="text-white/70 text-sm">Available</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">100%</div>
                <div className="text-white/70 text-sm">Secure</div>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            What Business Owners Say
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="glass-morphism rounded-2xl p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <blockquote className="text-white/90 mb-4 italic">
                  "{testimonial.quote}"
                </blockquote>
                <div>
                  <div className="font-semibold text-white">{testimonial.name}</div>
                  <div className="text-white/70 text-sm">{testimonial.business}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Privacy */}
        <div className="glass-morphism rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-4">Your Data is Safe</h3>
          <p className="text-white/90 mb-6 max-w-2xl mx-auto">
            We use bank-level encryption and only access the minimum data needed to set up your phone assistant. 
            You can disconnect your Square account at any time, and we never store your payment information.
          </p>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm text-white/80">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              256-bit SSL Encryption
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              SOC 2 Type II Compliant
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              GDPR Compliant
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              Disconnect Anytime
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SquareConnectionPage;