import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';
import {
    PhoneCall,
    PhoneOff,
    Mic,
    MessageSquare,
    User,
    Bot,
    ArrowRight,
    Settings,
    LogOut
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import Logo from './Logo';

interface AgentTestScreenProps {
    onGoToDashboard: () => void;
    onSignOut: () => void;
}

interface ChatMessage {
    id: string;
    type: 'user' | 'agent' | 'system';
    content: string;
    timestamp: Date;
    source?: string;
    rawData?: { message: string; source: string };
}

const AgentTestScreen: React.FC<AgentTestScreenProps> = ({
    onGoToDashboard,
    onSignOut
}) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get agent ID from environment variable
    const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID;

    const conversation = useConversation({
        clientTools: {
            get_customer_info: async () => {
                addMessage('system', `👤 Retrieving customer information...`);
                addMessage('system', `✅ Customer info retrieved successfully`);
                return JSON.stringify({
                    success: true,
                    data: {
                        message: "Hello, how are you?",
                        customerStatus: "active"
                    },
                    action: "get_customer_info"
                });
            },
            findAvailableTimesForService: async ({ serviceId, variationId, startDate, endDate, merchantId, locationId, preferredTeamMemberId }) => {
                console.log("findAvailableTimesForService", serviceId, variationId, startDate, endDate, merchantId);

                // Add message to show function is being called
                addMessage('system', `🔍 Searching for available appointment times from ${startDate} to ${endDate}...`);

                try {
                    const { data, error } = await supabase.functions.invoke('booking', {
                        body: {
                            action: 'findAvailableTimesForService',
                            serviceId,
                            variationId,
                            merchantId,
                            startDate,
                            endDate,
                            locationId,
                            preferredTeamMemberId,
                        },
                    });

                    if (error) {
                        addMessage('system', `❌ Error searching for appointments: ${error.message}`);
                        throw new Error(error.message || 'Failed to find available times');
                    }

                    const availableTimes = data?.data;
                    if (!availableTimes || availableTimes.length === 0) {
                        addMessage('system', `📅 No appointments found for the selected dates (${startDate} to ${endDate})`);
                        return JSON.stringify({
                            success: false,
                            message: "No appointments available for the selected dates. Please try different dates.",
                            data: []
                        });
                    }

                    addMessage('system', `✅ Found ${availableTimes.length} available appointment slots`);

                    // Return the complete data structure for the agent
                    const response = {
                        success: true,
                        data: availableTimes,
                        action: "findAvailableTimesForService",
                        message: `Found ${availableTimes.length} available appointment slots from ${startDate} to ${endDate}`
                    };

                    console.log("response", response);
                    return JSON.stringify(response);

                } catch (error) {
                    console.error('Error finding available times:', error);
                    addMessage('system', `❌ Function call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    return JSON.stringify({
                        success: false,
                        message: `Error searching for available times: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        data: [],
                        action: "findAvailableTimesForService"
                    });
                }
            },
            bookAppointment: async ({ serviceId, variationId, serviceVariationVersion, merchantId, locationId, firstName, lastName, selectedTime, notes, email, phone, teamMemberId }) => {
                console.log("bookAppointment", serviceId, variationId, serviceVariationVersion, merchantId, locationId, firstName, lastName, selectedTime, notes);

                // Add message to show booking is being processed
                const appointmentTime = new Date(selectedTime).toLocaleString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });
                addMessage('system', `📅 Booking appointment for ${firstName} ${lastName} on ${appointmentTime}...`);

                try {
                    const { data, error } = await supabase.functions.invoke('booking', {
                        body: {
                            action: 'bookAppointment',
                            serviceId,
                            variationId,
                            serviceVariationVersion,
                            merchantId,
                            locationId,
                            firstName,
                            lastName,
                            selectedTime,
                            notes,
                            email,
                            phone,
                            teamMemberId,
                        },
                    });

                    if (error) {
                        addMessage('system', `❌ Booking failed: ${error.message}`);
                        throw new Error(error.message || 'Failed to book appointment');
                    }

                    const booking = data?.data;
                    if (!booking) {
                        addMessage('system', `❌ Booking failed: No booking data received from server`);
                        return JSON.stringify({
                            success: false,
                            message: "Booking failed: No booking data received from server",
                            data: null
                        });
                    }

                    const appointmentDate = new Date(booking.startTime);
                    const dateString = appointmentDate.toLocaleString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    });

                    addMessage('system', `✅ Appointment successfully booked! Confirmation ID: ${booking.bookingId}`);

                    const response = `Appointment successfully booked for ${firstName} ${lastName} on ${dateString}`;
                    console.log("response", response);
                    return response;

                } catch (error) {
                    console.error('Error booking appointment:', error);
                    addMessage('system', `❌ Booking function failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    return JSON.stringify({
                        success: false,
                        message: `Error booking appointment: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or contact support.`,
                        data: null,
                        action: "bookAppointment"
                    });
                }
            },
        },
        onConnect: () => {
            console.log('Connected to ElevenLabs');
            addMessage('system', 'Connected to your AI agent');
        },
        onDisconnect: () => {
            console.log('Disconnected from ElevenLabs');
            addMessage('system', 'Disconnected from agent');
        },
        onMessage: (message) => {
            console.log('Message received:', message);
            const role = String(message.source);
            console.log('Role:', role);

            // Handle messages based on source (role)
            if (role === 'agent') {
                addMessage('agent', message.message || 'Agent responded', role, message);
            } else if (role === 'user') {
                addMessage('user', message.message || 'You said something', role, message);
            } else {
                // Log any other sources to understand what we're receiving
                addMessage('system', `Message from ${role}: ${message.message}`, role, message);
            }
        },
        onError: (error) => {
            console.error('ElevenLabs error:', error);
            const errorMessage = typeof error === 'string' ? error : (error as Error).message || 'Unknown error';
            addMessage('system', `Error: ${errorMessage}`);
        },
    });

    const addMessage = useCallback((type: ChatMessage['type'], content: string, source?: string, rawData?: { message: string; source: string }) => {
        const newMessage: ChatMessage = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            type,
            content,
            timestamp: new Date(),
            source,
            rawData
        };
        setMessages(prev => [...prev, newMessage]);
    }, []);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const startConversation = useCallback(async () => {
        if (!agentId) {
            addMessage('system', 'ElevenLabs Agent ID not configured. Please set VITE_ELEVENLABS_AGENT_ID environment variable.');
            return;
        }

        try {
            // Request microphone permission
            await navigator.mediaDevices.getUserMedia({ audio: true });
            addMessage('system', 'Microphone access granted, starting conversation...');

            // Start the conversation with your agent
            await conversation.startSession({
                agentId: agentId,
            });

        } catch (error) {
            console.error('Failed to start conversation:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            addMessage('system', `Failed to start conversation: ${errorMessage}`);
        }
    }, [conversation, agentId, addMessage]);

    const stopConversation = useCallback(async () => {
        await conversation.endSession();
        addMessage('system', 'Conversation ended');
    }, [conversation, addMessage]);

    const getStatusColor = () => {
        switch (conversation.status) {
            case 'connected': return 'text-green-600 bg-green-100';
            case 'connecting': return 'text-yellow-600 bg-yellow-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getStatusText = () => {
        switch (conversation.status) {
            case 'connected': return 'Connected';
            case 'connecting': return 'Connecting...';
            default: return 'Disconnected';
        }
    };

    const formatTimestamp = (timestamp: Date) => {
        return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getMessageIcon = (type: ChatMessage['type']) => {
        switch (type) {
            case 'user': return <User className="w-4 h-4" />;
            case 'agent': return <Bot className="w-4 h-4" />;
            case 'system': return <Settings className="w-4 h-4" />;
            default: return <MessageSquare className="w-4 h-4" />;
        }
    };

    const getMessageStyle = (type: ChatMessage['type']) => {
        switch (type) {
            case 'user': return 'bg-blue-100 text-blue-900 ml-12';
            case 'agent': return 'bg-purple-100 text-purple-900 mr-12';
            case 'system': return 'bg-gray-100 text-gray-700 mx-8 text-center';
            default: return 'bg-gray-100 text-gray-700 mx-8';
        }
    };

    // Speaking Wave Component
    const SpeakingWave = () => {
        // Create unique wave heights for each bar
        const waveHeights = [12, 20, 16, 24, 18, 22, 14];

        return (
            <div className="flex items-center justify-center gap-1 p-2">
                <style>
                    {`
                        @keyframes wave-bounce {
                            0%, 100% { transform: scaleY(0.4); }
                            25% { transform: scaleY(1.2); }
                            50% { transform: scaleY(0.8); }
                            75% { transform: scaleY(1.0); }
                        }
                        .wave-bar {
                            animation: wave-bounce 1.2s ease-in-out infinite;
                            transform-origin: bottom;
                        }
                    `}
                </style>
                {waveHeights.map((height, i) => (
                    <div
                        key={i}
                        className="wave-bar bg-gradient-to-t from-green-400 to-green-200 rounded-full shadow-sm"
                        style={{
                            width: '3px',
                            height: `${height}px`,
                            animationDelay: `${i * 0.12}s`,
                        }}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600">
            {/* Header */}
            <header className="relative z-10 p-6">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Logo size="lg" variant="white" showText={true} />

                    <div className="flex items-center gap-4">
                        <button
                            onClick={onGoToDashboard}
                            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                        >
                            <ArrowRight className="w-4 h-4" />
                            Go to Dashboard
                        </button>

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
                            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="relative z-10 max-w-6xl mx-auto px-6 pb-12">
                {/* Hero Section */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                        Test Your
                        <span className="block text-white drop-shadow-lg" style={{
                            textShadow: '2px 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.3)'
                        }}>
                            AI Agent
                        </span>
                    </h1>

                    <p className="text-xl text-white/90 mb-8 leading-relaxed max-w-2xl mx-auto drop-shadow-md" style={{
                        textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
                    }}>
                        Have a conversation with your AI phone assistant to test how it responds to customer inquiries.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Configuration Panel */}
                    <div className="lg:col-span-1">
                        <div className="glass-morphism rounded-2xl p-6 sticky top-8">
                            <h3 className="text-xl font-semibold text-white mb-6">Agent Configuration</h3>

                            {/* Status */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-white/80 text-sm font-medium">Status:</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
                                        {getStatusText()}
                                    </span>
                                </div>

                                {conversation.status === 'connected' && (
                                    <div className="bg-white/10 rounded-lg p-4 text-center">
                                        {conversation.isSpeaking ? (
                                            <div>
                                                <div className="text-white/90 text-sm font-medium mb-3">
                                                    🎙️ Agent is speaking
                                                </div>
                                                <SpeakingWave />
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
                                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                                                Listening for your voice...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Controls */}
                            <div className="space-y-3">
                                <button
                                    onClick={startConversation}
                                    disabled={conversation.status === 'connected' || !agentId}
                                    className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${conversation.status === 'connected' || !agentId
                                        ? 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-50'
                                        : 'bg-green-500 hover:bg-green-600 text-white transform hover:scale-105'
                                        }`}
                                >
                                    <PhoneCall className="w-5 h-5" />
                                    Start Conversation
                                </button>

                                <button
                                    onClick={stopConversation}
                                    disabled={conversation.status !== 'connected'}
                                    className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${conversation.status !== 'connected'
                                        ? 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-50'
                                        : 'bg-red-500 hover:bg-red-600 text-white transform hover:scale-105'
                                        }`}
                                >
                                    <PhoneOff className="w-5 h-5" />
                                    End Conversation
                                </button>
                            </div>

                            {/* Instructions */}
                            <div className="mt-6 p-4 bg-white/10 rounded-lg">
                                <h4 className="text-white font-medium mb-2">How to test:</h4>
                                <ol className="text-white/80 text-sm space-y-1 list-decimal list-inside">
                                    <li>Click "Start Conversation" to begin</li>
                                    <li>Allow microphone access when prompted</li>
                                    <li>Speak naturally to test your agent</li>
                                    <li>Watch for the speaking wave when agent responds</li>
                                    <li>Monitor the chat for live interactions</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Chat Interface */}
                    <div className="lg:col-span-2">
                        <div className="glass-morphism rounded-2xl h-[600px] flex flex-col">
                            {/* Chat Header */}
                            <div className="p-6 border-b border-white/20">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-semibold text-white">Live Conversation</h3>
                                    <button
                                        onClick={() => setMessages([])}
                                        className="px-3 py-1 text-white/70 hover:text-white hover:bg-white/10 rounded text-sm transition-colors"
                                    >
                                        Clear Chat
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {messages.length === 0 ? (
                                    <div className="text-center text-white/60 py-12">
                                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>No messages yet. Start a conversation to see the interaction.</p>
                                    </div>
                                ) : (
                                    messages.map((message) => (
                                        <div key={message.id} className={`p-3 rounded-lg ${getMessageStyle(message.type)}`}>
                                            <div className="flex items-start gap-2">
                                                <div className="flex-shrink-0 mt-0.5">
                                                    {getMessageIcon(message.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium text-sm capitalize">
                                                            {message.type === 'agent' ? 'AI Agent' : message.type}
                                                        </span>
                                                        <span className="text-xs opacity-70">
                                                            {formatTimestamp(message.timestamp)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm break-words">{message.content}</p>

                                                    {/* Show raw data for debugging */}
                                                    {message.rawData && (
                                                        <details className="mt-2">
                                                            <summary className="text-xs cursor-pointer opacity-70 hover:opacity-100">
                                                                Show raw data
                                                            </summary>
                                                            <pre className="mt-1 text-xs bg-black/20 p-2 rounded overflow-x-auto">
                                                                {JSON.stringify(message.rawData, null, 2)}
                                                            </pre>
                                                        </details>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Status Bar */}
                            {conversation.status === 'connected' && (
                                <div className="p-4 border-t border-white/20 bg-white/5">
                                    <div className="flex items-center justify-between text-sm text-white/80">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${conversation.isSpeaking ? 'bg-green-400 animate-pulse' : 'bg-blue-400'}`}></div>
                                            {conversation.isSpeaking ? 'Agent is speaking...' : 'Listening for your voice...'}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mic className="w-4 h-4" />
                                            <span>Microphone active</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentTestScreen; 