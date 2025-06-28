import React, { useState, useEffect } from 'react';
import {
    Building2,
    MapPin,
    Package,
    CheckCircle,
    AlertCircle,
    Clock,
    RefreshCw,
    ArrowRight,
    Store,
    AlertTriangle,
    Sparkles
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import Logo from './Logo';

interface ImportTask {
    id: string;
    task_type: 'merchant' | 'locations' | 'catalog';
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
    progress_message?: string;
    error_message?: string;
    data?: any;
    retry_count: number;
    max_retries: number;
    created_at: string;
    updated_at: string;
}

interface BusinessImportScreenProps {
    connectionId: string;
    onComplete: () => void;
    onSignOut: () => void;
}

const BusinessImportScreen: React.FC<BusinessImportScreenProps> = ({
    connectionId,
    onComplete,
    onSignOut
}) => {
    const { user } = useAuth();
    const [importTasks, setImportTasks] = useState<ImportTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasStarted, setHasStarted] = useState(false);

    // Task definitions with their display info
    const taskDefinitions = [
        {
            type: 'merchant' as const,
            title: 'Business Information',
            description: 'Importing your business name, location, and basic details',
            icon: Building2,
            color: 'from-blue-500 to-cyan-500'
        },
        {
            type: 'locations' as const,
            title: 'Store Locations',
            description: 'Importing your business locations, hours, and contact info',
            icon: MapPin,
            color: 'from-green-500 to-emerald-500'
        },
        {
            type: 'catalog' as const,
            title: 'Services & Products',
            description: 'Importing your catalog of services and products',
            icon: Package,
            color: 'from-purple-500 to-pink-500'
        }
    ];

    // Initialize import tasks on component mount
    useEffect(() => {
        if (!user || !connectionId) return;

        const initializeImport = async () => {
            try {
                // Check if tasks already exist
                const { data: existingTasks } = await supabase
                    .from('import_tasks')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('connection_id', connectionId);

                if (existingTasks && existingTasks.length > 0) {
                    setImportTasks(existingTasks);
                    setHasStarted(true);
                } else {
                    // Create initial tasks
                    const tasksToCreate = taskDefinitions.map(task => ({
                        user_id: user.id,
                        connection_id: connectionId,
                        task_type: task.type,
                        status: 'pending' as const,
                        progress_message: `Preparing to import ${task.title.toLowerCase()}...`
                    }));

                    const { data: createdTasks, error } = await supabase
                        .from('import_tasks')
                        .insert(tasksToCreate)
                        .select();

                    if (error) {
                        console.error('Error creating import tasks:', error);
                    } else if (createdTasks) {
                        setImportTasks(createdTasks);
                        setHasStarted(true);

                        // Trigger the import processor to start processing tasks
                        try {
                            const { error: processError } = await supabase.functions.invoke('import-processor', {
                                body: {
                                    action: 'process_all_pending',
                                    userId: user.id
                                }
                            });

                            if (processError) {
                                console.error('Error triggering import processor:', processError);
                            } else {
                                console.log('Import processor triggered successfully');
                            }
                        } catch (error) {
                            console.error('Error invoking import processor:', error);
                        }
                    }
                }
            } catch (error) {
                console.error('Error initializing import:', error);
            } finally {
                setLoading(false);
            }
        };

        initializeImport();
    }, [user, connectionId]);

    // Subscribe to real-time updates
    useEffect(() => {
        if (!user || !connectionId) return;

        const subscription = supabase
            .channel('import_tasks_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'import_tasks',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('Import task update:', payload);

                    const updatedTask = payload.new as ImportTask;

                    setImportTasks(prev => {
                        const index = prev.findIndex(task => task.id === updatedTask.id);
                        if (index >= 0) {
                            const updated = [...prev];
                            updated[index] = updatedTask;
                            return updated;
                        }
                        return prev;
                    });
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user, connectionId]);

    // Check if all tasks are completed
    useEffect(() => {
        if (importTasks.length === 0) return;

        const allCompleted = importTasks.every(task => task.status === 'completed');
        if (allCompleted) {
            // Small delay to show the completion state
            setTimeout(() => {
                onComplete();
            }, 2000);
        }
    }, [importTasks, onComplete]);

    const handleRetryTask = async (taskId: string) => {
        try {
            const { error } = await supabase
                .from('import_tasks')
                .update({
                    status: 'pending',
                    error_message: null,
                    progress_message: 'Retrying import...'
                })
                .eq('id', taskId);

            if (error) {
                console.error('Error retrying task:', error);
            }
        } catch (error) {
            console.error('Error retrying task:', error);
        }
    };

    const getTaskStatus = (task: ImportTask) => {
        switch (task.status) {
            case 'completed':
                return { icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-500/20' };
            case 'failed':
                return { icon: AlertCircle, color: 'text-red-400', bgColor: 'bg-red-500/20' };
            case 'processing':
            case 'retrying':
                return { icon: RefreshCw, color: 'text-blue-400', bgColor: 'bg-blue-500/20', spin: true };
            default:
                return { icon: Clock, color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
        }
    };

    const getProgressPercentage = () => {
        if (importTasks.length === 0) return 0;
        const completed = importTasks.filter(task => task.status === 'completed').length;
        return (completed / importTasks.length) * 100;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600">
            {/* Header */}
            <header className="relative z-10 p-6">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
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
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="relative z-10 max-w-4xl mx-auto px-6 pb-12">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                        <Sparkles className="w-4 h-4" />
                        Step 2 of 2: Importing Your Business Data
                    </div>

                    <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                        Setting Up Your
                        <span className="block text-white drop-shadow-lg" style={{
                            textShadow: '2px 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.3)'
                        }}>
                            Phone Assistant
                        </span>
                    </h1>

                    <p className="text-xl text-white/90 mb-8 leading-relaxed max-w-2xl mx-auto drop-shadow-md" style={{
                        textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
                    }}>
                        We're importing your business information from Square to personalize your AI phone assistant.
                    </p>

                    {/* Progress Bar */}
                    <div className="max-w-md mx-auto mb-8">
                        <div className="flex items-center justify-between text-sm text-white/80 mb-2">
                            <span>Import Progress</span>
                            <span>{Math.round(getProgressPercentage())}%</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-3">
                            <div
                                className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${getProgressPercentage()}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Import Tasks */}
                <div className="space-y-6">
                    {taskDefinitions.map((taskDef, index) => {
                        const task = importTasks.find(t => t.task_type === taskDef.type);
                        const status = task ? getTaskStatus(task) : { icon: Clock, color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
                        const Icon = taskDef.icon;
                        const StatusIcon = status.icon;

                        return (
                            <div
                                key={taskDef.type}
                                className="glass-morphism rounded-2xl p-6 hover:bg-white/20 transition-all duration-300"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Task Icon */}
                                    <div className={`flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-r ${taskDef.color} flex items-center justify-center`}>
                                        <Icon className="w-8 h-8 text-white" />
                                    </div>

                                    {/* Task Info */}
                                    <div className="flex-1">
                                        <h3 className="text-xl font-semibold text-white mb-1">{taskDef.title}</h3>
                                        <p className="text-white/80 mb-2">{taskDef.description}</p>

                                        {task && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <StatusIcon
                                                    className={`w-4 h-4 ${status.color} ${status.spin ? 'animate-spin' : ''}`}
                                                />
                                                <span className="text-white/90">
                                                    {task.progress_message || 'Waiting...'}
                                                </span>
                                                {task.status === 'failed' && (
                                                    <button
                                                        onClick={() => handleRetryTask(task.id)}
                                                        className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white text-xs transition-colors"
                                                    >
                                                        Retry
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Status Badge */}
                                    <div className={`flex-shrink-0 w-12 h-12 rounded-full ${status.bgColor} flex items-center justify-center`}>
                                        <StatusIcon
                                            className={`w-6 h-6 ${status.color} ${status.spin ? 'animate-spin' : ''}`}
                                        />
                                    </div>
                                </div>

                                {/* Error Message */}
                                {task?.status === 'failed' && task.error_message && (
                                    <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-red-100 text-sm font-medium mb-1">Import Failed</p>
                                                <p className="text-red-200 text-sm">{task.error_message}</p>
                                                <p className="text-red-200 text-xs mt-1">
                                                    You can retry the import or manually add this information in Square and try again.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Completion Message */}
                {getProgressPercentage() === 100 && (
                    <div className="mt-8 text-center">
                        <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 text-green-100 px-6 py-3 rounded-xl">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-medium">Import completed! Redirecting to your dashboard...</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BusinessImportScreen; 