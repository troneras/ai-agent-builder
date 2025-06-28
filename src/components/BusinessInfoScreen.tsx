import React, { useState, useEffect } from 'react';
import {
    Building2,
    MapPin,
    Package,
    Phone,
    Clock,
    RefreshCw,
    ArrowRight,
    Store,
    Folder,
    Tag,
    DollarSign,
    Timer,
    CheckCircle,
    AlertCircle,
    Sparkles
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useOnboarding } from '../hooks/useOnboarding';
import { supabase } from '../lib/supabase';
import Logo from './Logo';

interface BusinessInfoScreenProps {
    onContinue: () => void;
    onSignOut: () => void;
    embedded?: boolean; // For reuse in dashboard
    onReimport?: () => void; // For dashboard use
}

interface SquareCategory {
    id: string;
    name?: string;
}

interface SquareItemVariation {
    id: string;
    name?: string;
    availableForBooking?: boolean;
    serviceDuration?: number;
    pricingType?: string;
    priceMoney?: {
        amount?: number;
        currency?: string;
    };
}

interface SquareItem {
    id: string;
    name?: string;
    descriptionPlaintext?: string;
    categories?: SquareCategory[];
    variations?: SquareItemVariation[];
    isService?: boolean;
}

interface EnhancedCatalogData {
    categories?: SquareCategory[];
    services?: SquareItem[];
    items?: SquareItem[];
}

interface ImportedCatalogData {
    services?: string[];
    enhanced_catalog_data?: EnhancedCatalogData;
    has_catalog?: boolean;
    catalog_items_count?: number;
    catalog_services_count?: number;
    catalog_categories_count?: number;
}

const BusinessInfoScreen: React.FC<BusinessInfoScreenProps> = ({
    onContinue,
    onSignOut,
    embedded = false,
    onReimport
}) => {
    const { user } = useAuth();
    const { onboarding, loading: onboardingLoading } = useOnboarding(user);
    const [loading, setLoading] = useState(false);
    const [enhancedCatalogData, setEnhancedCatalogData] = useState<EnhancedCatalogData | null>(null);
    const [connectionId, setConnectionId] = useState<string | null>(null);

    // Get connection ID for reimport functionality
    useEffect(() => {
        if (!user) return;

        const getConnectionId = async () => {
            try {
                const { data: connection } = await supabase
                    .from('connections')
                    .select('connection_id')
                    .eq('user_id', user.id)
                    .eq('status', 'active')
                    .single();

                if (connection) {
                    setConnectionId(connection.connection_id);
                }
            } catch (error) {
                console.error('Error fetching connection ID:', error);
            }
        };

        getConnectionId();
    }, [user]);

    // Parse enhanced catalog data from services field
    useEffect(() => {
        if (onboarding?.services) {
            try {
                // Check if services is already parsed object or needs parsing
                let catalogData;
                if (typeof onboarding.services === 'string') {
                    const parsedData = JSON.parse(onboarding.services);
                    // Check if it has enhanced_catalog_data property
                    catalogData = parsedData.enhanced_catalog_data || parsedData;
                } else if (Array.isArray(onboarding.services)) {
                    // Legacy format - just service names
                    catalogData = {
                        services: onboarding.services.map((name, index) => ({
                            id: `legacy-service-${index}`,
                            name,
                            isService: true
                        }))
                    };
                } else if (onboarding.services && typeof onboarding.services === 'object') {
                    // Object format - check for enhanced_catalog_data property
                    const importedData = onboarding.services as ImportedCatalogData;
                    catalogData = importedData.enhanced_catalog_data || onboarding.services;
                } else {
                    catalogData = onboarding.services;
                }
                console.log('Parsed catalog data:', catalogData);
                setEnhancedCatalogData(catalogData);
            } catch (error) {
                console.error('Error parsing catalog data:', error);
                // Fallback to treating as simple array
                if (Array.isArray(onboarding.services)) {
                    setEnhancedCatalogData({
                        services: onboarding.services.map((name, index) => ({
                            id: `legacy-service-${index}`,
                            name,
                            isService: true
                        }))
                    });
                }
            }
        }
    }, [onboarding]);

    const handleReimport = async () => {
        if (!user || !connectionId) return;

        setLoading(true);
        try {
            // Delete existing import tasks
            await supabase
                .from('import_tasks')
                .delete()
                .eq('user_id', user.id)
                .eq('connection_id', connectionId);

            // Clear existing onboarding data (keep user_id and basic info)
            await supabase
                .from('onboarding')
                .update({
                    merchant_id: null,
                    business_name: null,
                    phone_number: null,
                    business_city: null,
                    full_address: null,
                    opening_hours: null,
                    services: null,
                    current_step: 0
                })
                .eq('user_id', user.id);

            // Trigger reimport
            if (onReimport) {
                onReimport();
            } else {
                // Reload the page to restart import process
                window.location.reload();
            }
        } catch (error) {
            console.error('Error during reimport:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount?: number, currency?: string) => {
        if (!amount) return 'Price not set';
        const formattedAmount = (amount / 100).toFixed(2);
        const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
        return `${currencySymbol}${formattedAmount}`;
    };

    const formatDuration = (milliseconds?: number) => {
        if (!milliseconds) return 'Duration not set';
        const minutes = Math.floor(milliseconds / 60000);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) {
            const remainingMinutes = minutes % 60;
            return `${hours}h ${remainingMinutes}m`;
        }
        return `${minutes}m`;
    };

    if (onboardingLoading && !embedded) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
        );
    }

    const Content = () => (
        <div className="space-y-8">
            {/* Business Information */}
            <div className="glass-morphism rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-white">Business Information</h3>
                        <p className="text-white/70">Your Square merchant details</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {onboarding?.business_name && (
                        <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                            <Store className="w-5 h-5 text-white/70" />
                            <div>
                                <p className="text-white/70 text-sm">Business Name</p>
                                <p className="text-white font-medium">{onboarding.business_name}</p>
                            </div>
                        </div>
                    )}

                    {onboarding?.merchant_id && (
                        <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                            <Tag className="w-5 h-5 text-white/70" />
                            <div>
                                <p className="text-white/70 text-sm">Merchant ID</p>
                                <p className="text-white font-medium font-mono text-sm">{onboarding.merchant_id}</p>
                            </div>
                        </div>
                    )}

                    {onboarding?.phone_number && (
                        <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                            <Phone className="w-5 h-5 text-white/70" />
                            <div>
                                <p className="text-white/70 text-sm">Phone Number</p>
                                <p className="text-white font-medium">{onboarding.phone_number}</p>
                            </div>
                        </div>
                    )}

                    {onboarding?.business_city && (
                        <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                            <MapPin className="w-5 h-5 text-white/70" />
                            <div>
                                <p className="text-white/70 text-sm">City</p>
                                <p className="text-white font-medium">{onboarding.business_city}</p>
                            </div>
                        </div>
                    )}
                </div>

                {onboarding?.full_address && (
                    <div className="mt-4 p-3 bg-white/10 rounded-lg">
                        <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-white/70 mt-0.5" />
                            <div>
                                <p className="text-white/70 text-sm">Full Address</p>
                                <p className="text-white">{onboarding.full_address}</p>
                            </div>
                        </div>
                    </div>
                )}

                {onboarding?.opening_hours && (
                    <div className="mt-4 p-3 bg-white/10 rounded-lg">
                        <div className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-white/70 mt-0.5" />
                            <div>
                                <p className="text-white/70 text-sm">Business Hours</p>
                                <div className="text-white whitespace-pre-line">{onboarding.opening_hours}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Categories */}
            {enhancedCatalogData?.categories && enhancedCatalogData.categories.length > 0 && (
                <div className="glass-morphism rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                            <Folder className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-white">Categories</h3>
                            <p className="text-white/70">{enhancedCatalogData.categories.length} categories found</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {enhancedCatalogData.categories.map((category) => (
                            <div key={category.id} className="p-3 bg-white/10 rounded-lg">
                                <p className="text-white font-medium">{category.name || 'Unnamed Category'}</p>
                                <p className="text-white/60 text-sm">ID: {category.id}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Services */}
            {enhancedCatalogData?.services && enhancedCatalogData.services.length > 0 && (
                <div className="glass-morphism rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-white">Services</h3>
                            <p className="text-white/70">{enhancedCatalogData.services.length} services found</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {enhancedCatalogData.services.map((service) => (
                            <div key={service.id} className="p-4 bg-white/10 rounded-lg">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h4 className="text-white font-semibold text-lg">{service.name || 'Unnamed Service'}</h4>
                                        {service.descriptionPlaintext && (
                                            <p className="text-white/80 mt-1">{service.descriptionPlaintext}</p>
                                        )}
                                    </div>
                                    {service.categories && service.categories.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {service.categories.map((category) => (
                                                <span
                                                    key={category.id}
                                                    className="px-2 py-1 bg-white/20 rounded-md text-white/90 text-xs"
                                                >
                                                    {category.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {service.variations && service.variations.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-white/70 text-sm font-medium">Variations:</p>
                                        {service.variations.map((variation) => (
                                            <div key={variation.id} className="p-3 bg-white/10 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h5 className="text-white font-medium">{variation.name || 'Unnamed Variation'}</h5>
                                                    {variation.availableForBooking && (
                                                        <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-300 rounded-md text-xs">
                                                            <CheckCircle className="w-3 h-3" />
                                                            Bookable
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                                    {variation.priceMoney && (
                                                        <div className="flex items-center gap-2">
                                                            <DollarSign className="w-4 h-4 text-white/60" />
                                                            <span className="text-white/90">
                                                                {formatCurrency(variation.priceMoney.amount, variation.priceMoney.currency)}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {variation.serviceDuration && (
                                                        <div className="flex items-center gap-2">
                                                            <Timer className="w-4 h-4 text-white/60" />
                                                            <span className="text-white/90">
                                                                {formatDuration(variation.serviceDuration)}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {variation.pricingType && (
                                                        <div className="flex items-center gap-2">
                                                            <Tag className="w-4 h-4 text-white/60" />
                                                            <span className="text-white/90 capitalize">
                                                                {variation.pricingType.replace('_', ' ').toLowerCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Products/Items */}
            {enhancedCatalogData?.items && enhancedCatalogData.items.length > 0 && (
                <div className="glass-morphism rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-white">Products</h3>
                            <p className="text-white/70">{enhancedCatalogData.items.length} products found</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {enhancedCatalogData.items.map((item) => (
                            <div key={item.id} className="p-4 bg-white/10 rounded-lg">
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className="text-white font-medium">{item.name || 'Unnamed Product'}</h4>
                                    {item.categories && item.categories.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {item.categories.map((category) => (
                                                <span
                                                    key={category.id}
                                                    className="px-2 py-1 bg-white/20 rounded-md text-white/90 text-xs"
                                                >
                                                    {category.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {item.descriptionPlaintext && (
                                    <p className="text-white/80 text-sm mb-2">{item.descriptionPlaintext}</p>
                                )}
                                {item.variations && item.variations.length > 0 && (
                                    <p className="text-white/60 text-sm">{item.variations.length} variation(s)</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* No Data Message */}
            {!enhancedCatalogData?.services?.length && !enhancedCatalogData?.items?.length && !enhancedCatalogData?.categories?.length && (
                <div className="glass-morphism rounded-2xl p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-white/60 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Catalog Data Found</h3>
                    <p className="text-white/70 mb-4">
                        We couldn't find any services or products in your Square catalog.
                    </p>
                    {connectionId && (
                        <button
                            onClick={handleReimport}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            Reimport Data
                        </button>
                    )}
                </div>
            )}

            {/* Actions */}
            {!embedded && (
                <div className="flex items-center justify-between pt-6">
                    {connectionId && (
                        <button
                            onClick={handleReimport}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            Reimport Data
                        </button>
                    )}

                    <button
                        onClick={onContinue}
                        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-semibold transition-all transform hover:scale-105"
                    >
                        Continue Setup
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );

    if (embedded) {
        return <Content />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600">
            {/* Header */}
            <header className="relative z-10 p-6">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
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
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="relative z-10 max-w-6xl mx-auto px-6 pb-12">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                        <CheckCircle className="w-4 h-4" />
                        Import Complete
                    </div>

                    <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                        Your Business
                        <span className="block text-white drop-shadow-lg" style={{
                            textShadow: '2px 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.3)'
                        }}>
                            Information
                        </span>
                    </h1>

                    <p className="text-xl text-white/90 mb-8 leading-relaxed max-w-2xl mx-auto drop-shadow-md" style={{
                        textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
                    }}>
                        Here's what we imported from your Square account. Review this information and continue to set up your AI assistant.
                    </p>
                </div>

                <Content />
            </div>
        </div>
    );
};

export default BusinessInfoScreen; 