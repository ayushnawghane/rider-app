import { useState, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rideService } from '../../services';
import {
  MapPin,
  Clock,
  Users,
  ArrowLeft,
  Search,
  Star,
  Car,
  Filter,
  ChevronRight,
  Navigation
} from 'lucide-react';
import type { PublishedRide } from '../../types';

interface SearchLocation {
  address: string;
  lat: number;
  lng: number;
}

interface FindRideLocationState {
  pickup?: SearchLocation;
  dropoff?: SearchLocation;
  departureTime?: string;
  passengerCount?: number;
}

const FindRidePage = () => {
  const { user, isAuthLoaded } = useAuth();
  const history = useHistory();
  const location = useLocation<FindRideLocationState>();

  const [pickupLocation, setPickupLocation] = useState<SearchLocation | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<SearchLocation | null>(null);
  const [departureTime, setDepartureTime] = useState<string>('');
  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [availableRides, setAvailableRides] = useState<PublishedRide[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'time' | 'rating'>('time');

  const handleBackToHome = () => {
    if (history.length > 1) {
      history.goBack();
      return;
    }
    history.replace('/home');
  };

  // Get params from navigation state
  useEffect(() => {
    const state = location.state as FindRideLocationState | undefined;
    if (state) {
      if (state.pickup) setPickupLocation(state.pickup);
      if (state.dropoff) setDropoffLocation(state.dropoff);
      if (state.departureTime) setDepartureTime(state.departureTime);
      if (state.passengerCount) setPassengerCount(state.passengerCount);
    }

    // Set default time
    if (!departureTime) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 30);
      setDepartureTime(now.toISOString().slice(0, 16));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleSearch = async () => {
    setLoading(true);
    const startQuery = pickupLocation?.address?.split(',')[0]?.trim();
    const endQuery = dropoffLocation?.address?.split(',')[0]?.trim();

    try {
      const result = await rideService.searchRides({
        startLocation: startQuery,
        endLocation: endQuery,
        departureTime: departureTime || undefined,
      });

      if (!result.success || !result.rides) {
        setAvailableRides([]);
        return;
      }

      const rides = result.rides.map<PublishedRide>((ride) => ({
        id: ride.id,
        driverId: ride.userId,
        driver: {
          id: ride.userId,
          name: ride.userId === user?.id ? 'You (Driver)' : 'Rider',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + ride.userId,
          rating: 4.8,
          phone: ride.driverContact || 'N/A',
        },
        startLocation: ride.startLocation,
        endLocation: ride.endLocation,
        startLat: ride.startLocationCoords?.lat || 0,
        startLng: ride.startLocationCoords?.lng || 0,
        endLat: ride.endLocationCoords?.lat || 0,
        endLng: ride.endLocationCoords?.lng || 0,
        distance: ride.distance || 0,
        duration: ride.duration || 0,
        departureTime: ride.date,
        availableSeats: ride.availableSeats,
        bookedSeats: ride.bookedSeats,
        pricePerSeat: ride.pricePerSeat,
        vehicleType: ride.vehicleType,
        vehicleNumber: ride.vehicleNumber,
        status: ride.status === 'cancelled' ? 'cancelled' : ride.status === 'completed' ? 'completed' : 'active',
        notes: ride.notes,
        createdAt: ride.createdAt,
        updatedAt: ride.updatedAt,
      }));

      setAvailableRides(rides);
    } finally {
      setLoading(false);
    }
  };

  const handleBookRide = (ride: PublishedRide) => {
    history.push(`/rides/detail/${ride.id}`, { ride, passengerCount });
  };

  const handlePublishFromSearch = () => {
    history.push('/publish-ride', {
      start: pickupLocation || undefined,
      end: dropoffLocation || undefined,
      departureTime: departureTime || undefined,
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (!isAuthLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="app-scroll-screen app-bottom-nav-safe bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 pt-12 pb-6 px-4">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleBackToHome}
            className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-2xl font-bold text-white">Find a Ride</h1>
        </div>

        {/* Search Summary */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center gap-2 text-white mb-2">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{pickupLocation?.address || 'Select pickup'}</span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <Navigation className="w-4 h-4" />
            <span className="text-sm">{dropoffLocation?.address || 'Select destination'}</span>
          </div>
          <div className="flex items-center gap-4 mt-3 text-white/70 text-xs">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {departureTime ? new Date(departureTime).toLocaleDateString() : 'Any time'}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {passengerCount} passenger{passengerCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <div className="px-4 -mt-4 mb-4">
        <div className="bg-white rounded-2xl shadow-lg p-4">
          {/* Pickup */}
          <button
            onClick={() => history.push('/select-location', {
              type: 'pickup',
              returnTo: '/find-ride',
              pickup: pickupLocation || undefined,
              dropoff: dropoffLocation || undefined,
            })}
            className="w-full p-3 border-2 border-primary-100 rounded-xl mb-3 text-left hover:border-primary-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary-500" />
              <span className="text-gray-900 font-medium">
                {pickupLocation?.address || 'Select pickup location'}
              </span>
            </div>
          </button>

          {/* Dropoff */}
          <button
            onClick={() => history.push('/select-location', {
              type: 'dropoff',
              returnTo: '/find-ride',
              pickup: pickupLocation || undefined,
              dropoff: dropoffLocation || undefined,
            })}
            className="w-full p-3 border-2 border-primary-100 rounded-xl mb-3 text-left hover:border-primary-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Navigation className="w-5 h-5 text-primary-500" />
              <span className="text-gray-900 font-medium">
                {dropoffLocation?.address || 'Select destination'}
              </span>
            </div>
          </button>

          {/* Time & Passengers */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
              <Clock className="w-4 h-4 text-primary-500" />
              <input
                type="datetime-local"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
              <Users className="w-4 h-4 text-primary-500" />
              <select
                value={passengerCount}
                onChange={(e) => setPassengerCount(Number(e.target.value))}
                className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>{n} passenger{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Search Rides
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {availableRides.length > 0 && (
        <div className="px-4">
          {/* Filters */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {availableRides.length} rides available
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 text-primary-600 font-medium text-sm"
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>

          {/* Sort Options */}
          {showFilters && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {(['time', 'price', 'rating'] as const).map((sort) => (
                <button
                  key={sort}
                  onClick={() => setSortBy(sort)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${sortBy === sort
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                    }`}
                >
                  {sort.charAt(0).toUpperCase() + sort.slice(1)}
                </button>
              ))}
            </div>
          )}

          {/* Ride Cards */}
          <div className="space-y-4 pb-24">
            {availableRides.map((ride) => (
              <div
                key={ride.id}
                className="bg-white rounded-2xl shadow-lg p-5"
              >
                {/* Driver Info */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden">
                      <img
                        src={ride.driver?.avatar || 'https://via.placeholder.com/56'}
                        alt={ride.driver?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {ride.driver?.rating && ride.driver.rating >= 4.8 && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                        <Star className="w-3 h-3 text-white fill-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{ride.driver?.name}</h3>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium">{ride.driver?.rating}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <Car className="w-3 h-3" />
                      <span>{ride.vehicleType} • {ride.vehicleNumber}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-600">₹{ride.pricePerSeat}</p>
                    <p className="text-xs text-gray-500">per seat</p>
                  </div>
                </div>

                {/* Route Info */}
                <div className="flex items-center gap-3 mb-4 text-sm">
                  <div className="flex-1">
                    <p className="text-gray-500 text-xs mb-0.5">Departure</p>
                    <p className="font-semibold text-gray-900">{formatTime(ride.departureTime)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="w-2 h-2 rounded-full bg-primary-500" />
                    <div className="w-16 h-0.5 bg-gray-200" />
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-gray-500 text-xs mb-0.5">Arrival</p>
                    <p className="font-semibold text-gray-900">
                      {formatTime(new Date(new Date(ride.departureTime).getTime() + ride.duration * 60000).toISOString())}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    {ride.distance} km
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(ride.duration)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {ride.availableSeats - ride.bookedSeats} seats left
                  </span>
                </div>

                {/* Notes */}
                {ride.notes && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 mb-4">
                    "{ride.notes}"
                  </p>
                )}

                {/* Book Button */}
                <button
                  onClick={() => handleBookRide(ride)}
                  className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Book {passengerCount} Seat{passengerCount > 1 ? 's' : ''}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && availableRides.length === 0 && (pickupLocation || dropoffLocation) && (
        <div className="px-4 mt-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car className="w-10 h-10 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No rides found</h3>
            <p className="text-gray-500 text-sm mb-4">
              We couldn't find any rides for your route. Try adjusting your search or publish your own ride!
            </p>
            <button
              onClick={handlePublishFromSearch}
              className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl"
            >
              Publish a Ride
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FindRidePage;
