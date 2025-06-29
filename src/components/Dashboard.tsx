import React, { useState, useEffect } from 'react';
import {
  Phone,
  Calendar,
  MessageSquare,
  Settings,
  BarChart3,
  Clock,
  User,
  Building,
  MapPin,
  Mail,
  Edit3,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  PhoneCall,
  Users,
  Star,
  Play,
  Pause,
  Volume2,
  Download,
  Eye,
  Filter,
  Search,
  RefreshCw,
  Crown,
  Zap,
  LogOut,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import { useOnboarding } from '../hooks/useOnboarding';
import { supabase } from '../lib/supabase';
import Logo from './Logo';

interface DashboardProps {
  onBackToLanding: () => void;
  onSignOut: () => void;
  onGoToAgentTest: () => void;
}

interface CallRecord {
  id: string;
  caller_number: string;
  caller_name?: string;
  duration: number;
  status: 'answered' | 'missed' | 'voicemail';
  summary: string;
  appointment_booked?: boolean;
  created_at: string;
  recording_url?: string;
}

interface BusinessStats {
  total_calls: number;
  answered_calls: number;
  missed_calls: number;
  appointments_booked: number;
  avg_call_duration: number;
  customer_satisfaction: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onBackToLanding, onSignOut, onGoToAgentTest }) => {
  const { user } = useAuth();
  const { profile, updateProfile } = useUserProfile(user);
  const { onboarding } = useOnboarding(user);

  const [activeTab, setActiveTab] = useState<'overview' | 'calls' | 'settings' | 'billing'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    business_name: '',
    business_type: '',
    phone_number: '',
    full_name: ''
  });
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [stats, setStats] = useState<BusinessStats>({
    total_calls: 0,
    answered_calls: 0,
    missed_calls: 0,
    appointments_booked: 0,
    avg_call_duration: 0,
    customer_satisfaction: 0
  });
  const [loading, setLoading] = useState(true);
  const [callFilter, setCallFilter] = useState<'all' | 'answered' | 'missed' | 'appointments'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [playingCall, setPlayingCall] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setEditForm({
        business_name: profile.business_name || '',
        business_type: profile.business_type || '',
        phone_number: profile.phone_number || '',
        full_name: profile.full_name || ''
      });
    }
  }, [profile]);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Simulate loading call data and stats
      // In a real app, this would fetch from your backend
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data for demonstration
      const mockCalls: CallRecord[] = [
        {
          id: '1',
          caller_number: '+1 (555) 123-4567',
          caller_name: 'Sarah Johnson',
          duration: 180,
          status: 'answered',
          summary: 'Customer called to book a haircut and blowout appointment for next Tuesday at 2 PM. Confirmed availability and sent confirmation text.',
          appointment_booked: true,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          recording_url: '#'
        },
        {
          id: '2',
          caller_number: '+1 (555) 987-6543',
          caller_name: 'Emma Rodriguez',
          duration: 95,
          status: 'answered',
          summary: 'Customer inquired about pricing for balayage highlights and deep conditioning treatment. Provided quote and available time slots.',
          appointment_booked: false,
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          recording_url: '#'
        },
        {
          id: '3',
          caller_number: '+1 (555) 456-7890',
          caller_name: 'Jessica Martinez',
          duration: 0,
          status: 'missed',
          summary: 'Missed call - customer hung up before assistant could answer. Likely calling about hair coloring services.',
          appointment_booked: false,
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '4',
          caller_number: '+1 (555) 321-0987',
          caller_name: 'Lisa Chen',
          duration: 240,
          status: 'answered',
          summary: 'Customer rescheduled her keratin treatment from Thursday to Friday. Updated calendar and sent new confirmation with prep instructions.',
          appointment_booked: true,
          created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          recording_url: '#'
        },
        {
          id: '5',
          caller_number: '+1 (555) 654-3210',
          caller_name: 'Amanda Williams',
          duration: 320,
          status: 'answered',
          summary: 'New customer inquiry about wedding hair styling packages. Scheduled consultation for next week and collected bridal party details.',
          appointment_booked: true,
          created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          recording_url: '#'
        }
      ];

      const mockStats: BusinessStats = {
        total_calls: 47,
        answered_calls: 42,
        missed_calls: 5,
        appointments_booked: 23,
        avg_call_duration: 156,
        customer_satisfaction: 4.8
      };

      setCalls(mockCalls);
      setStats(mockStats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    try {
      const { error } = await updateProfile({
        business_name: editForm.business_name,
        business_type: editForm.business_type,
        phone_number: editForm.phone_number,
        full_name: editForm.full_name
      });

      if (error) {
        console.error('Error updating profile:', error);
        return;
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const getSubscriptionBadge = () => {
    if (!profile) return null;

    const { subscription_status, subscription_plan, trial_ends_at } = profile;

    if (subscription_status === 'trial') {
      const trialEnd = trial_ends_at ? new Date(trial_ends_at) : null;
      const daysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

      return (
        <div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
          <Clock className="w-4 h-4" />
          {daysLeft > 0 ? `${daysLeft} days left in trial` : 'Trial expired'}
        </div>
      );
    }

    if (subscription_status === 'active') {
      const planColors = {
        starter: 'bg-blue-100 text-blue-700',
        professional: 'bg-purple-100 text-purple-700',
        enterprise: 'bg-green-100 text-green-700'
      };

      return (
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${planColors[subscription_plan]}`}>
          <Crown className="w-4 h-4" />
          {subscription_plan.charAt(0).toUpperCase() + subscription_plan.slice(1)} Plan
        </div>
      );
    }

    return null;
  };

  const filteredCalls = calls.filter(call => {
    const matchesFilter = callFilter === 'all' ||
      (callFilter === 'answered' && call.status === 'answered') ||
      (callFilter === 'missed' && call.status === 'missed') ||
      (callFilter === 'appointments' && call.appointment_booked);

    const matchesSearch = searchTerm === '' ||
      call.caller_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.caller_number.includes(searchTerm) ||
      call.summary.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Logo size="lg" showText={true} />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-medium">
                <AlertCircle className="w-4 h-4" />
                Sample Data
              </div>

              <button
                onClick={onBackToLanding}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to landing page"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Site</span>
              </button>

              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-semibold text-sm">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">{user?.email}</div>
                </div>
              </div>

              <button
                onClick={onSignOut}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'overview'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  Overview
                </button>

                <button
                  onClick={() => setActiveTab('calls')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'calls'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <Phone className="w-5 h-5" />
                  Call History
                </button>

                <button
                  onClick={onGoToAgentTest}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Zap className="w-5 h-5" />
                  Test Agent
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'settings'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <Settings className="w-5 h-5" />
                  Settings
                </button>

                <button
                  onClick={() => setActiveTab('billing')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'billing'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <Crown className="w-5 h-5" />
                  Billing
                </button>
              </nav>

              {/* Quick Stats */}
              <div className="mt-8 p-4 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-3">Today's Activity</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Calls Answered</span>
                    <span className="font-medium">8</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Appointments</span>
                    <span className="font-medium">3</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Avg Duration</span>
                    <span className="font-medium">2:34</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Welcome Section */}
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">
                        Welcome back, {profile?.full_name || 'there'}! 👋
                      </h2>
                      <p className="text-purple-100 mb-4">
                        Your phone assistant has been busy. Here's what's happening with your business.
                      </p>
                      <button
                        onClick={onGoToAgentTest}
                        className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-all transform hover:scale-105 font-semibold border border-white/30"
                      >
                        <Phone className="w-5 h-5" />
                        Configure Your Phone Number
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">{stats.total_calls}</div>
                      <div className="text-purple-200">Total Calls This Month</div>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <PhoneCall className="w-6 h-6 text-green-600" />
                      </div>
                      <span className="text-sm text-green-600 font-medium">+12%</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.answered_calls}</div>
                    <div className="text-gray-600">Calls Answered</div>
                  </div>

                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="w-6 h-6 text-blue-600" />
                      </div>
                      <span className="text-sm text-blue-600 font-medium">+8%</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.appointments_booked}</div>
                    <div className="text-gray-600">Appointments Booked</div>
                  </div>

                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Clock className="w-6 h-6 text-purple-600" />
                      </div>
                      <span className="text-sm text-purple-600 font-medium">+5%</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{formatDuration(stats.avg_call_duration)}</div>
                    <div className="text-gray-600">Avg Call Duration</div>
                  </div>

                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Star className="w-6 h-6 text-yellow-600" />
                      </div>
                      <span className="text-sm text-yellow-600 font-medium">+0.2</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.customer_satisfaction}</div>
                    <div className="text-gray-600">Customer Rating</div>
                  </div>
                </div>

                {/* Recent Calls */}
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Recent Calls</h3>
                      <button
                        onClick={() => setActiveTab('calls')}
                        className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                      >
                        View All
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {calls.slice(0, 5).map((call) => (
                      <div key={call.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${call.status === 'answered' ? 'bg-green-100' :
                              call.status === 'missed' ? 'bg-red-100' : 'bg-gray-100'
                              }`}>
                              <Phone className={`w-4 h-4 ${call.status === 'answered' ? 'text-green-600' :
                                call.status === 'missed' ? 'text-red-600' : 'text-gray-600'
                                }`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">
                                  {call.caller_name || 'Unknown Caller'}
                                </span>
                                <span className="text-gray-500">•</span>
                                <span className="text-gray-500">{call.caller_number}</span>
                                {call.appointment_booked && (
                                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                                    Appointment Booked
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600 text-sm line-clamp-2">{call.summary}</p>
                            </div>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <div>{formatTimeAgo(call.created_at)}</div>
                            {call.duration > 0 && (
                              <div className="mt-1">{formatDuration(call.duration)}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'calls' && (
              <div className="space-y-6">
                {/* Filters and Search */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search calls..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <select
                      value={callFilter}
                      onChange={(e) => setCallFilter(e.target.value as any)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">All Calls</option>
                      <option value="answered">Answered</option>
                      <option value="missed">Missed</option>
                      <option value="appointments">Appointments</option>
                    </select>
                  </div>

                  <button
                    onClick={loadDashboardData}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>

                {/* Calls List */}
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="divide-y divide-gray-200">
                    {filteredCalls.map((call) => (
                      <div key={call.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className={`p-3 rounded-lg ${call.status === 'answered' ? 'bg-green-100' :
                              call.status === 'missed' ? 'bg-red-100' : 'bg-gray-100'
                              }`}>
                              <Phone className={`w-5 h-5 ${call.status === 'answered' ? 'text-green-600' :
                                call.status === 'missed' ? 'text-red-600' : 'text-gray-600'
                                }`} />
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-semibold text-gray-900">
                                  {call.caller_name || 'Unknown Caller'}
                                </span>
                                <span className="text-gray-500">•</span>
                                <span className="text-gray-600">{call.caller_number}</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${call.status === 'answered' ? 'bg-green-100 text-green-700' :
                                  call.status === 'missed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                  }`}>
                                  {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                                </span>
                                {call.appointment_booked && (
                                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                                    Appointment Booked
                                  </span>
                                )}
                              </div>

                              <p className="text-gray-600 mb-3">{call.summary}</p>

                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span>{formatTimeAgo(call.created_at)}</span>
                                {call.duration > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>Duration: {formatDuration(call.duration)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {call.recording_url && (
                              <button
                                onClick={() => setPlayingCall(playingCall === call.id ? null : call.id)}
                                className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Play recording"
                              >
                                {playingCall === call.id ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            <button
                              className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {call.recording_url && (
                              <button
                                className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Download recording"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Business Information */}
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
                      {!isEditing ? (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsEditing(false)}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveProfile}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            <Save className="w-4 h-4" />
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.full_name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
                            <User className="w-5 h-5 text-gray-400" />
                            <span>{profile?.full_name || 'Not set'}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Business Name
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.business_name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, business_name: e.target.value }))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
                            <Building className="w-5 h-5 text-gray-400" />
                            <span>{profile?.business_name || 'Not set'}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Business Type
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.business_type}
                            onChange={(e) => setEditForm(prev => ({ ...prev, business_type: e.target.value }))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
                            <MapPin className="w-5 h-5 text-gray-400" />
                            <span>{profile?.business_type || 'Not set'}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={editForm.phone_number}
                            onChange={(e) => setEditForm(prev => ({ ...prev, phone_number: e.target.value }))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
                            <Phone className="w-5 h-5 text-gray-400" />
                            <span>{profile?.phone_number || 'Not set'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assistant Settings */}
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Assistant Settings</h3>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Assistant Active</h4>
                        <p className="text-gray-600 text-sm">Your phone assistant is currently answering calls</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-green-600 font-medium">Online</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Call Recording</h4>
                        <p className="text-gray-600 text-sm">Record calls for quality and training purposes</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">SMS Notifications</h4>
                        <p className="text-gray-600 text-sm">Get text alerts for important calls</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-6">
                {/* Current Plan */}
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-xl font-bold text-gray-900">
                            {profile?.subscription_plan?.charAt(0).toUpperCase() + profile?.subscription_plan?.slice(1)} Plan
                          </h4>
                          {getSubscriptionBadge()}
                        </div>
                        <p className="text-gray-600">
                          {profile?.subscription_status === 'trial'
                            ? 'You are currently on a free trial'
                            : 'Your subscription is active'
                          }
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {profile?.subscription_status === 'trial' ? '$0' : '$79'}
                        </div>
                        <div className="text-gray-600">per month</div>
                      </div>
                    </div>

                    {profile?.subscription_status === 'trial' && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                          <div>
                            <h5 className="font-medium text-orange-800">Trial Ending Soon</h5>
                            <p className="text-orange-700 text-sm">
                              Your trial ends in {profile.trial_ends_at ? Math.ceil((new Date(profile.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0} days.
                              Upgrade to continue using your phone assistant.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300">
                      {profile?.subscription_status === 'trial' ? 'Upgrade Now' : 'Manage Subscription'}
                    </button>
                  </div>
                </div>

                {/* Usage This Month */}
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Usage This Month</h3>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Calls Handled</span>
                      <span className="font-medium">{stats.total_calls} / 500</span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${(stats.total_calls / 500) * 100}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>9.4% of monthly limit used</span>
                      <span>Resets in 18 days</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;