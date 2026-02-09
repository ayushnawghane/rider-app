/**
 * RoutePreview Component
 * Shows map with route and ride options in a bottom sheet
 */

import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, Users, ChevronRight, Car, CarFront, Crown, Armchair } from 'lucide-react';
import MapComponent from './MapComponent';
import { mapsService } from '../../services';
import { Location, RouteData, RideEstimate } from '../../types/maps';

interface RoutePreviewProps {
  pickup: Location | null;
  drop: Location | null;
  onRideSelect?: (estimate: RideEstimate) => void;
  onConfirm?: (estimate: RideEstimate) => void;
  showEstimates?: boolean;
  className?: string;
}

const vehicleIcons: Record<string, React.ReactNode> = {
  economy: <Car className="w-6 h-6" />,
  comfort: <Armchair className="w-6 h-6" />,
  premium: <Crown className="w-6 h-6" />,
  suv: <CarFront className="w-6 h-6" />,
};

const RoutePreview: React.FC<RoutePreviewProps> = ({
  pickup,
  drop,
  onRideSelect,
  onConfirm,
  showEstimates = true,
  className = '',
}) => {
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [estimates, setEstimates] = useState<RideEstimate[]>([]);
  const [selectedEstimate, setSelectedEstimate] = useState<RideEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [routePath, setRoutePath] = useState<Array<{ lat: number; lng: number }>>([]);

  // Calculate route when pickup or drop changes
  useEffect(() => {
    const calculateRoute = async () => {
      if (!pickup || !drop) {
        setRouteData(null);
        setEstimates([]);
        setRoutePath([]);
        return;
      }

      setIsLoading(true);
      const route = await mapsService.calculateRoute(
        { lat: pickup.lat, lng: pickup.lng },
        { lat: drop.lat, lng: drop.lng }
      );

      if (route) {
        setRouteData(route);
        
        // Decode polyline to path
        const decodedPath = mapsService.decodePolyline(route.polyline);
        setRoutePath(decodedPath);

        // Calculate estimates
        const distanceKm = route.distanceValue / 1000;
        const durationMinutes = Math.round(route.durationValue / 60);
        const rideEstimates = mapsService.getRideEstimates(distanceKm, durationMinutes);
        setEstimates(rideEstimates);
      }

      setIsLoading(false);
    };

    calculateRoute();
  }, [pickup, drop]);

  const handleEstimateSelect = (estimate: RideEstimate) => {
    setSelectedEstimate(estimate);
    onRideSelect?.(estimate);
  };

  const markers = [
    ...(pickup ? [{ position: { lat: pickup.lat, lng: pickup.lng }, title: 'Pickup', icon: '/marker-pickup.svg' }] : []),
    ...(drop ? [{ position: { lat: drop.lat, lng: drop.lng }, title: 'Drop', icon: '/marker-drop.svg' }] : []),
  ];

  // Calculate map center
  const mapCenter = pickup || drop || { lat: 28.6139, lng: 77.2090 };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Map Section */}
      <div className="flex-1 relative min-h-[300px]">
        <MapComponent
          center={mapCenter}
          markers={markers}
          routePath={routePath}
          fitBounds={markers.length > 0}
          className="rounded-t-2xl overflow-hidden"
        />

        {/* Route Info Overlay */}
        {routeData && (
          <div className="absolute top-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-medium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary-600" />
                  <span className="text-sm text-gray-600 truncate max-w-[120px]">
                    {pickup?.name || 'Pickup'}
                  </span>
                </div>
                <Navigation className="w-4 h-4 text-gray-400" />
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-success-600" />
                  <span className="text-sm text-gray-600 truncate max-w-[120px]">
                    {drop?.name || 'Drop'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Navigation className="w-4 h-4" />
                {routeData.distance}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                {routeData.duration}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sheet - Ride Options */}
      {showEstimates && (
        <div className="bg-white rounded-t-3xl shadow-strong -mt-6 relative z-10">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-gray-300 rounded-full" />
          </div>

          <div className="px-4 pb-24 max-h-[50vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose a ride</h3>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card p-4 animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-24" />
                        <div className="h-3 bg-gray-200 rounded w-32" />
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : estimates.length > 0 ? (
              <div className="space-y-2">
                {estimates.map((estimate) => (
                  <button
                    key={estimate.type}
                    onClick={() => handleEstimateSelect(estimate)}
                    className={`w-full card p-4 transition-all ${
                      selectedEstimate?.type === estimate.type
                        ? 'ring-2 ring-primary-500 bg-primary-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        selectedEstimate?.type === estimate.type
                          ? 'bg-primary-100 text-primary-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {vehicleIcons[estimate.type] || <Car className="w-6 h-6" />}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{estimate.name}</h4>
                          <span className="text-xs text-gray-500">• {estimate.eta}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-500">{estimate.capacity}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900">
                          {estimate.currency}{estimate.price}
                        </p>
                        <p className="text-xs text-gray-500">est. fare</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Select pickup and drop locations to see ride options</p>
              </div>
            )}
          </div>

          {/* Sticky CTA */}
          {selectedEstimate && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
              <button
                onClick={() => onConfirm?.(selectedEstimate)}
                className="w-full btn btn-primary py-4 flex items-center justify-center gap-2"
              >
                Choose {selectedEstimate.name}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoutePreview;
