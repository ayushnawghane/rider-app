import { useEffect, useState, useCallback } from 'react';
import { useParams, useHistory } from 'react-router';
import { rideService, locationService, mapsService, liveLocationService } from '../../services';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { MapComponent } from '../../components/maps';
import {
    ChevronLeft,
    Clock,
    Target,
    AlertTriangle,
    CheckCircle2,
} from 'lucide-react';
import type { Ride } from '../../types';
import LoadingOverlay from '../../components/LoadingOverlay';

const FIRE = 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))';

const getMarkerIcon = (type: 'pickup' | 'drop' | 'driver' | 'user'): google.maps.Icon | undefined => {
    if (typeof window === 'undefined' || !window.google) return undefined;

    const baseSVG = `data:image/svg+xml;charset=UTF-8,`;
    switch (type) {
        case 'pickup':
            return {
                url: baseSVG + encodeURIComponent(`<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="12" fill="#10B981" fill-opacity="0.2"/><circle cx="16" cy="16" r="6" fill="#10B981"/><circle cx="16" cy="16" r="2" fill="white"/></svg>`),
                anchor: new google.maps.Point(16, 16),
            };
        case 'drop':
            return {
                url: baseSVG + encodeURIComponent(`<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="12" height="12" fill="#EF4444"/><rect x="14" y="14" width="4" height="4" fill="white"/></svg>`),
                anchor: new google.maps.Point(16, 16),
            };
        case 'driver':
            return {
                url: '/car-sedan.png',
                scaledSize: new google.maps.Size(48, 48),
                anchor: new google.maps.Point(24, 24),
            };
        case 'user':
            return {
                url: baseSVG + encodeURIComponent(`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#3B82F6" fill-opacity="0.2"/><circle cx="12" cy="12" r="6" fill="#3B82F6"/><circle cx="12" cy="12" r="2" fill="white"/></svg>`),
                anchor: new google.maps.Point(12, 12),
            };
    }
};

const TripTrackingPage = () => {
    const { id } = useParams<{ id: string }>();
    const history = useHistory();
    const { user } = useAuth();

    const [ride, setRide] = useState<Ride | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [remoteLocation, setRemoteLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [routePath, setRoutePath] = useState<Array<{ lat: number; lng: number }>>([]);
    const [eta, setEta] = useState<string>('');
    const [totalDistance, setTotalDistance] = useState<number>(0);
    const [coveredDistance, setCoveredDistance] = useState<number>(0);
    const [isAutoRecenter, setIsAutoRecenter] = useState(true);

    const calculateProgress = useCallback(
        (currentPos: { lat: number; lng: number }, rideData: Ride) => {
            if (!rideData.startLocationCoords || !rideData.endLocationCoords) return;

            const total = locationService.calculateDistance(
                rideData.startLocationCoords.lat,
                rideData.startLocationCoords.lng,
                rideData.endLocationCoords.lat,
                rideData.endLocationCoords.lng,
            );
            const remaining = locationService.calculateDistance(
                currentPos.lat,
                currentPos.lng,
                rideData.endLocationCoords.lat,
                rideData.endLocationCoords.lng,
            );
            const covered = Math.max(0, total - remaining);
            setTotalDistance(total);
            setCoveredDistance(Math.min(covered, total));
        },
        [],
    );

    const fetchRide = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true);
        const result = await rideService.getRideById(id);
        if (result.success && result.ride) {
            setRide(result.ride);

            if (result.ride.startLocationCoords && result.ride.endLocationCoords) {
                const route = await mapsService.calculateRoute(
                    { lat: result.ride.startLocationCoords.lat, lng: result.ride.startLocationCoords.lng },
                    { lat: result.ride.endLocationCoords.lat, lng: result.ride.endLocationCoords.lng },
                );
                if (route) {
                    const decoded = mapsService.decodePolyline(route.polyline);
                    setRoutePath(decoded);
                    setEta(route.duration);
                }
            }
        }
        setLoading(false);
    }, [id]);

    // Fetch ride + route
    useEffect(() => {
        void fetchRide(true);
    }, [fetchRide]);

    // Keep scheduled ride status current while the tracking page is open.
    useEffect(() => {
        if (!ride || ride.status === 'completed' || ride.status === 'cancelled') return;

        const interval = setInterval(() => {
            void fetchRide(false);
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchRide, ride]);

    // Start live GPS tracking + publish our location + stream remote location
    useEffect(() => {
        if (!ride || !user) return;
        let locationPublishInterval: ReturnType<typeof setInterval> | null = null;
        let latestPosition: {
            lat: number;
            lng: number;
            accuracy?: number;
                        } | null = null;

        const publish = (pos: {
            lat: number;
            lng: number;
            accuracy?: number;
                        }) => {
            latestPosition = pos;
            void liveLocationService.publishLocation({
                rideId: ride.id,
                userId: user.id,
                lat: pos.lat,
                lng: pos.lng,
                accuracy: pos.accuracy,
                                });
        };

        const startTracking = async () => {
            // Initial fetch of the latest known location(s) for the other participant(s)
            const others = await liveLocationService.getLatestOtherLocations(ride.id, user.id);
            if (others.length > 0) {
                setRemoteLocation({ lat: others[0].lat, lng: others[0].lng });
            }

            const position = await locationService.getCurrentPosition();
            if (position) {
                const pos = { lat: position.lat, lng: position.lng };
                setCurrentLocation(pos);
                calculateProgress(pos, ride);
                publish({
                    lat: position.lat,
                    lng: position.lng,
                    accuracy: position.accuracy,
                                        });
            }

            await locationService.startWatching((position) => {
                const pos = { lat: position.lat, lng: position.lng };
                setCurrentLocation(pos);
                calculateProgress(pos, ride);
                publish({
                    lat: position.lat,
                    lng: position.lng,
                    accuracy: position.accuracy,
                                        });
            });

            // Backup: re-publish the latest known location every 10s
            locationPublishInterval = setInterval(() => {
                if (latestPosition) {
                    publish(latestPosition);
                }
            }, 10000);
        };

        startTracking();

        // Subscribe to live location changes (INSERT + UPDATE) for the other participant
        const channel = liveLocationService.subscribeToRideLocations(ride.id, user.id, (location) => {
            setRemoteLocation({ lat: location.lat, lng: location.lng });
        });

        return () => {
            locationService.stopWatching();
            if (locationPublishInterval) clearInterval(locationPublishInterval);
            supabase.removeChannel(channel);
        };
    }, [ride, user, calculateProgress]);

    // Refresh ETA every 30 seconds when we have a location
    useEffect(() => {
        if (!currentLocation || !ride?.endLocationCoords) return;

        const refresh = async () => {
            const route = await mapsService.calculateRoute(
                { lat: currentLocation.lat, lng: currentLocation.lng },
                { lat: ride.endLocationCoords!.lat, lng: ride.endLocationCoords!.lng },
            );
            if (route) setEta(route.duration);
        };

        const interval = setInterval(refresh, 30000);
        return () => clearInterval(interval);
    }, [currentLocation, ride]);

    const progressPercent =
        totalDistance > 0 ? Math.round((coveredDistance / totalDistance) * 100) : 0;

    const markers = [
        ...(ride?.startLocationCoords
            ? [{ position: { lat: ride.startLocationCoords.lat, lng: ride.startLocationCoords.lng }, title: 'Pickup', icon: getMarkerIcon('pickup') }]
            : []),
        ...(ride?.endLocationCoords
            ? [{ position: { lat: ride.endLocationCoords.lat, lng: ride.endLocationCoords.lng }, title: 'Drop', icon: getMarkerIcon('drop') }]
            : []),
        ...(remoteLocation
            ? [{ position: remoteLocation, title: 'Driver', icon: getMarkerIcon('driver') }]
            : []),
        ...(currentLocation
            ? [{ position: currentLocation, title: 'You', icon: getMarkerIcon('user') }]
            : []),
    ];

    const mapCenter =
        isAutoRecenter && remoteLocation
            ? remoteLocation
            : isAutoRecenter && currentLocation
                ? currentLocation
                : ride?.startLocationCoords || { lat: 28.6139, lng: 77.209 };

    if (loading) {
        return <LoadingOverlay isOpen variant="fullscreen" message="Loading trip..." />;
    }

    if (!ride) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-fire-red/10">
                    <AlertTriangle className="h-10 w-10 text-fire-red" />
                </div>
                <h2 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-ink">Trip not found</h2>
                <button
                    onClick={() => history.goBack()}
                    className="grain grain-strong relative mt-6 overflow-hidden rounded-2xl px-8 py-3.5 font-display font-bold text-white shadow-glow transition active:scale-[0.98]"
                    style={{ background: FIRE }}
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col bg-white">
            {/* Header */}
            <header className="z-10 border-b border-black/5 bg-white/90 px-4 py-3 backdrop-blur-md pt-[calc(env(safe-area-inset-top)+12px)]">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => history.goBack()}
                        aria-label="Back"
                        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-white text-ink shadow-soft transition active:scale-95"
                    >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                    <div className="text-center">
                        <h1 className="font-display text-lg font-extrabold tracking-tight text-ink">Track trip</h1>
                        <p className="text-xs font-medium text-ink/45">{ride.referenceId}</p>
                    </div>
                    <div
                        className={`rounded-full px-3 py-1 font-display text-xs font-bold ${ride.status === 'active'
                            ? 'bg-fire-orange text-white shadow-glow'
                            : ride.status === 'completed'
                                ? 'bg-ink/8 text-ink/55'
                                : 'bg-fire-gold/25 text-[#9a5b00]'
                            }`}
                    >
                        {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                    </div>
                </div>
            </header>

            {/* Map + Route Animation */}
            <div className="relative flex-1">
                <MapComponent
                    center={mapCenter}
                    markers={markers}
                    routePath={routePath}
                    fitBounds={false}
                    className="h-full"
                />

                {/* Recenter */}
                <button
                    onClick={() => setIsAutoRecenter(true)}
                    className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-black/5 bg-white text-fire-orange shadow-strong transition active:scale-95"
                >
                    <Target className="h-6 w-6" />
                </button>

                {/* ETA pill */}
                {eta && (
                    <div className="absolute left-4 top-4 flex items-center gap-2 rounded-2xl border border-black/5 bg-white px-4 py-2.5 shadow-strong">
                        <Clock className="h-5 w-5 text-fire-orange" />
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-ink/40">ETA</p>
                            <p className="font-display font-bold text-ink">{eta}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom sheet */}
            <div className="relative z-10 -mt-6 flex max-h-[50vh] flex-col rounded-t-[28px] border-t border-black/5 bg-white shadow-strong">
                <div className="flex flex-shrink-0 justify-center pb-2 pt-3">
                    <div className="h-1 w-12 rounded-full bg-ink/15" />
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-8">

                    {/* Driver & Vehicle Profile */}
                    <div className="mb-5 flex items-center border-b border-black/5 pb-4">
                        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-paper-dim shadow-soft">
                            <img src={ride.driver?.avatar || `https://ui-avatars.com/api/?name=${ride.driver?.name || 'Driver'}&background=random`} alt="Driver" className="h-full w-full object-cover" />
                        </div>
                        <div className="ml-4 flex-1">
                            <h3 className="font-display text-base font-bold text-ink">{ride.driver?.name || 'Your Driver'}</h3>
                            <div className="mt-0.5 flex items-center text-sm text-ink/50">
                                <span className="flex items-center gap-1 font-bold text-fire-gold">★ {ride.driver?.rating ? ride.driver.rating.toFixed(1) : '4.9'}</span>
                                <span className="mx-2">•</span>
                                <span className="font-medium">{ride.vehicleType}</span>
                            </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                            <div className="rounded-xl border border-black/5 bg-paper px-3 py-1.5">
                                <span className="font-display text-sm font-bold tracking-wide text-ink">{ride.vehicleNumber}</span>
                            </div>
                        </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mb-5">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="font-display text-sm font-bold text-ink">Trip progress</span>
                            <span className="font-display text-sm font-extrabold text-fire-orange">{progressPercent}%</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-paper-dim">
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${progressPercent}%`, background: FIRE }}
                            />
                        </div>
                        <div className="mt-1 flex justify-between text-xs font-medium text-ink/40">
                            <span>{coveredDistance.toFixed(1)} km covered</span>
                            <span>{totalDistance.toFixed(1)} km total</span>
                        </div>
                    </div>

                    {/* Route */}
                    <div className="mb-4 rounded-2xl border border-black/5 bg-paper p-4">
                        <div className="space-y-2">
                            <div className="flex items-start gap-4">
                                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-black/5 bg-white shadow-sm">
                                    <div className="h-2.5 w-2.5 rounded-full bg-fire-orange" />
                                </div>
                                <div>
                                    <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-ink/40">Pickup</p>
                                    <p className="font-display font-bold leading-tight text-ink">{ride.startLocation}</p>
                                </div>
                            </div>
                            <div className="ml-4 h-5 w-0.5 bg-gradient-to-b from-fire-orange to-fire-gold" />
                            <div className="flex items-start gap-4">
                                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-black/5 bg-white shadow-sm">
                                    <div className="h-2.5 w-2.5 rounded-sm bg-fire-gold" />
                                </div>
                                <div>
                                    <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-ink/40">Dropoff</p>
                                    <p className="font-display font-bold leading-tight text-ink">{ride.endLocation}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Completed indicator */}
                    {ride.status === 'completed' && (
                        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="text-sm font-bold">This trip has been completed</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TripTrackingPage;
