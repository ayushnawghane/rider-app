import { useEffect, useState, useCallback } from 'react';
import { useParams, useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rideService, locationService, mapsService } from '../../services';
import { MapComponent } from '../../components/maps';
import {
    ChevronLeft,
    MapPin,
    Navigation,
    Clock,
    Target,
    AlertTriangle,
    CheckCircle2,
} from 'lucide-react';
import type { Ride } from '../../types';
import LoadingOverlay from '../../components/LoadingOverlay';

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
    const { user } = useAuth();
    const history = useHistory();

    const [ride, setRide] = useState<Ride | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
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

    // Fetch ride + route
    useEffect(() => {
        const fetchRide = async () => {
            const result = await rideService.getRideById(id);
            if (result.success && result.ride) {
                setRide(result.ride);

                if (result.ride.startLocationCoords && result.ride.endLocationCoords) {
                    const route = await mapsService.calculateRoute(
                        { lat: result.ride.startLocationCoords.lat, lng: result.ride.startLocationCoords.lng },
                        { lat: result.ride.endLocationCoords.lat, lng: result.ride.endLocationCoords.lng },
                    );
                    if (route) {
                        setRoutePath(mapsService.decodePolyline(route.polyline));
                        setEta(route.duration);
                    }
                }
            }
            setLoading(false);
        };

        fetchRide();
    }, [id]);

    // Start live GPS tracking
    useEffect(() => {
        if (!ride) return;

        const startTracking = async () => {
            const position = await locationService.getCurrentPosition();
            if (position) {
                const pos = { lat: position.lat, lng: position.lng };
                setCurrentLocation(pos);
                calculateProgress(pos, ride);
            }

            await locationService.startWatching((position) => {
                const pos = { lat: position.lat, lng: position.lng };
                setCurrentLocation(pos);
                calculateProgress(pos, ride);
            });
        };

        startTracking();
        return () => { locationService.stopWatching(); };
    }, [ride, calculateProgress]);

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
        ...(currentLocation
            ? [{ position: currentLocation, title: 'You', icon: getMarkerIcon('user') }]
            : []),
    ];

    const mapCenter =
        isAutoRecenter && currentLocation
            ? currentLocation
            : ride?.startLocationCoords || { lat: 28.6139, lng: 77.209 };

    if (loading) {
        return <LoadingOverlay isOpen variant="fullscreen" message="Loading trip..." />;
    }

    if (!ride) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
                <AlertTriangle className="mb-4 h-16 w-16 text-gray-300" />
                <h2 className="mb-2 text-xl font-bold text-gray-900">Trip Not Found</h2>
                <button
                    onClick={() => history.goBack()}
                    className="mt-4 rounded-xl bg-primary-500 px-6 py-3 text-sm font-semibold text-white"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col bg-gray-50">
            {/* Header */}
            <header className="z-10 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => history.goBack()}
                        className="rounded-full p-2 hover:bg-gray-100 transition-colors"
                    >
                        <ChevronLeft className="h-6 w-6 text-gray-700" />
                    </button>
                    <div className="text-center">
                        <h1 className="font-semibold text-gray-900">Track Trip</h1>
                        <p className="text-xs text-gray-500">{ride.referenceId}</p>
                    </div>
                    <div
                        className={`rounded-full px-3 py-1 text-xs font-medium ${ride.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : ride.status === 'completed'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                    >
                        {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                    </div>
                </div>
            </header>

            {/* Map */}
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
                    className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg hover:bg-gray-50 transition-colors"
                >
                    <Target className="h-6 w-6 text-gray-700" />
                </button>

                {/* ETA pill */}
                {eta && (
                    <div className="absolute left-4 top-4 flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-lg">
                        <Clock className="h-5 w-5 text-primary-600" />
                        <div>
                            <p className="text-xs text-gray-500">ETA</p>
                            <p className="font-semibold text-gray-900">{eta}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom sheet */}
            <div className="relative z-10 -mt-6 rounded-t-3xl bg-white shadow-strong flex flex-col max-h-[50vh]">
                <div className="flex justify-center pb-2 pt-3 flex-shrink-0">
                    <div className="h-1 w-12 rounded-full bg-gray-300" />
                </div>

                <div className="overflow-y-auto px-4 pb-8 flex-1">

                    {/* Driver & Vehicle Profile (Uber-like) */}
                    <div className="flex items-center pb-4 mb-5 border-b border-gray-100">
                        <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                            <img src={ride.driver?.avatar || `https://ui-avatars.com/api/?name=${ride.driver?.name || 'Driver'}&background=random`} alt="Driver" className="w-full h-full object-cover" />
                        </div>
                        <div className="ml-4 flex-1">
                            <h3 className="text-base font-bold text-gray-900">{ride.driver?.name || 'Your Driver'}</h3>
                            <div className="flex items-center text-sm text-gray-500 mt-0.5">
                                <span className="font-medium text-warning-500 flex items-center gap-1">★ {ride.driver?.rating ? ride.driver.rating.toFixed(1) : '4.9'}</span>
                                <span className="mx-2">•</span>
                                <span>{ride.vehicleType}</span>
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <div className="bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                                <span className="text-sm font-bold text-gray-900 tracking-wide">{ride.vehicleNumber}</span>
                            </div>
                        </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mb-5">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-900">Trip Progress</span>
                            <span className="text-sm font-bold text-primary-600">{progressPercent}%</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-700"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <div className="mt-1 flex justify-between text-xs text-gray-400">
                            <span>{coveredDistance.toFixed(1)} km covered</span>
                            <span>{totalDistance.toFixed(1)} km total</span>
                        </div>
                    </div>

                    {/* Route */}
                    <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white border border-gray-200 mt-0.5 shadow-sm">
                                    <div className="w-2.5 h-2.5 bg-gray-900 rounded-full" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Pickup</p>
                                    <p className="font-medium text-gray-900 leading-tight">{ride.startLocation}</p>
                                </div>
                            </div>
                            <div className="ml-4 h-6 w-0.5 bg-gray-300" />
                            <div className="flex items-start gap-4">
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white border border-gray-200 mt-0.5 shadow-sm">
                                    <div className="w-2.5 h-2.5 bg-primary-600 rounded-sm" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Dropoff</p>
                                    <p className="font-medium text-gray-900 leading-tight">{ride.endLocation}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Completed indicator */}
                    {ride.status === 'completed' && (
                        <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-blue-700">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="text-sm font-medium">This trip has been completed</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TripTrackingPage;
