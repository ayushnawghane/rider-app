import { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rideService, vehicleService } from '../../services';
import {
  MapPin,
  Clock,
  Users,
  Car,
  ArrowLeft,
  Plus,
  Minus,
  IndianRupee,
  FileText,
  ChevronRight,
  Bookmark,
  CheckCircle2
} from 'lucide-react';

interface Location {
  address: string;
  lat: number;
  lng: number;
}

interface PublishRideLocationState {
  start?: Location;
  end?: Location;
  departureTime?: string;
}

type PublishRideFieldErrors = {
  startLocation?: string;
  endLocation?: string;
  departureTime?: string;
  vehicleNumber?: string;
};

const lightFieldClass =
  'bg-white text-gray-900 placeholder-gray-400 [color-scheme:light]';

const buildReferenceId = () => `RIDE-${Date.now().toString(36).toUpperCase()}`;

const PublishRidePage = () => {
  const { user, isAuthLoaded } = useAuth();
  const history = useHistory();
  const location = useLocation<PublishRideLocationState>();

  const [startLocation, setStartLocation] = useState<Location | null>(null);
  const [endLocation, setEndLocation] = useState<Location | null>(null);
  const [departureTime, setDepartureTime] = useState<string>('');
  const [availableSeats, setAvailableSeats] = useState<number>(3);
  const [pricePerSeat, setPricePerSeat] = useState<number>(150);
  const [vehicleType, setVehicleType] = useState<string>('Sedan');
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [vehicleSaved, setVehicleSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<PublishRideFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleBackToHome = () => {
    if (history.length > 1) {
      history.goBack();
      return;
    }
    history.replace('/home');
  };

  useEffect(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    setDepartureTime(now.toISOString().slice(0, 16));
  }, []);

  useEffect(() => {
    const state = location.state;
    if (!state) return;
    if (state.start) setStartLocation(state.start);
    if (state.end) setEndLocation(state.end);
    if (state.departureTime) setDepartureTime(state.departureTime.slice(0, 16));
  }, [location.state]);

  // Pre-fill vehicle details from saved profile
  useEffect(() => {
    if (user?.vehicleDetails) {
      const vd = user.vehicleDetails;
      if (vd.vehicleType) setVehicleType(vd.vehicleType);
      if (vd.vehicleNumber) setVehicleNumber(vd.vehicleNumber);
    }
  }, [user?.vehicleDetails]);

  useEffect(() => {
    if (!startLocation) return;
    setFieldErrors((prev) => {
      if (!prev.startLocation) return prev;
      const next = { ...prev };
      delete next.startLocation;
      return next;
    });
  }, [startLocation]);

  useEffect(() => {
    if (!endLocation) return;
    setFieldErrors((prev) => {
      if (!prev.endLocation) return prev;
      const next = { ...prev };
      delete next.endLocation;
      return next;
    });
  }, [endLocation]);

  const handleSaveVehicle = async () => {
    if (!user || !vehicleNumber.trim()) return;
    setSavingVehicle(true);
    setVehicleSaved(false);
    try {
      await vehicleService.saveVehicleDetails(user.id, {
        vehicleType,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
      });
      setVehicleSaved(true);
      setTimeout(() => setVehicleSaved(false), 3000);
    } finally {
      setSavingVehicle(false);
    }
  };

  const handlePublish = async () => {
    const nextFieldErrors: PublishRideFieldErrors = {};
    const trimmedVehicleNumber = vehicleNumber.trim();
    const selectedStart = startLocation;
    const selectedEnd = endLocation;

    if (!selectedStart) {
      nextFieldErrors.startLocation = 'Please select a starting point.';
    }
    if (!selectedEnd) {
      nextFieldErrors.endLocation = 'Please select a destination.';
    }
    if (!departureTime) {
      nextFieldErrors.departureTime = 'Please select a departure time.';
    } else if (Number.isNaN(new Date(departureTime).getTime())) {
      nextFieldErrors.departureTime = 'Please select a valid departure time.';
    }
    if (!trimmedVehicleNumber) {
      nextFieldErrors.vehicleNumber = 'Please enter your vehicle number.';
    }

    setFieldErrors(nextFieldErrors);
    setSubmitError(null);

    if (Object.keys(nextFieldErrors).length > 0) {
      return;
    }

    if (!selectedStart || !selectedEnd) {
      return;
    }

    if (!user) {
      setSubmitError('User not authenticated. Please log in again.');
      return;
    }

    const parsedDate = new Date(departureTime);
    setIsSubmitting(true);

    try {
      const result = await rideService.createRide({
        userId: user.id,
        date: parsedDate.toISOString(),
        startLocation: selectedStart.address,
        endLocation: selectedEnd.address,
        startLocationCoords: { lat: selectedStart.lat, lng: selectedStart.lng },
        endLocationCoords: { lat: selectedEnd.lat, lng: selectedEnd.lng },
        vehicleType,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        referenceId: buildReferenceId(),
        availableSeats,
        pricePerSeat,
        notes: notes.trim() || undefined,
      });

      if (!result.success) {
        setSubmitError(result.error || 'Failed to publish ride. Please try again.');
        return;
      }

      history.replace('/rides/history');
    } catch {
      setSubmitError('Failed to publish ride. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const vehicleTypes = [
    { label: 'Sedan', image: '/car-sedan.png' },
    { label: 'SUV', image: '/car-suv.png' },
    { label: 'Hatchback', image: '/car-hatchback.png' },
    { label: 'Luxury', image: '/car-luxury.png' },
  ];

  if (!isAuthLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div
      className="h-screen overflow-y-auto bg-gray-50 pb-24 publish-ride-light"
      style={{ WebkitOverflowScrolling: 'touch', colorScheme: 'light' }}
    >
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 pt-12 pb-6 px-4">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleBackToHome}
            className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-2xl font-bold text-white">Publish Ride</h1>
        </div>
        <p className="text-primary-100">Share your journey and earn points</p>
      </div>

      {/* Form */}
      <div className="px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-lg p-5">
          {Object.keys(fieldErrors).length > 0 && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Please complete all required fields highlighted below.
            </div>
          )}
          {submitError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Route Selection */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Route Details</h2>

            {/* From */}
            <button
              onClick={() => history.push('/select-location', {
                type: 'start',
                returnTo: '/publish-ride',
                start: startLocation || undefined,
                end: endLocation || undefined,
                departureTime: departureTime || undefined,
              })}
              className={`w-full p-4 border-2 rounded-xl mb-3 text-left transition-colors ${fieldErrors.startLocation
                ? 'border-red-300 bg-red-50'
                : 'border-primary-100 hover:border-primary-300'
                }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">From</p>
                  <p className="text-gray-900 font-medium">
                    {startLocation?.address || 'Select starting point'}
                  </p>
                </div>
              </div>
            </button>
            {fieldErrors.startLocation && (
              <p className="-mt-1 mb-3 text-xs text-red-600">{fieldErrors.startLocation}</p>
            )}

            {/* To */}
            <button
              onClick={() => history.push('/select-location', {
                type: 'end',
                returnTo: '/publish-ride',
                start: startLocation || undefined,
                end: endLocation || undefined,
                departureTime: departureTime || undefined,
              })}
              className={`w-full p-4 border-2 rounded-xl text-left transition-colors ${fieldErrors.endLocation
                ? 'border-red-300 bg-red-50'
                : 'border-primary-100 hover:border-primary-300'
                }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">To</p>
                  <p className="text-gray-900 font-medium">
                    {endLocation?.address || 'Select destination'}
                  </p>
                </div>
              </div>
            </button>
            {fieldErrors.endLocation && (
              <p className="mt-2 text-xs text-red-600">{fieldErrors.endLocation}</p>
            )}
          </div>

          {/* Departure Time */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Departure Time</h2>
            <div
              className={`flex items-center gap-3 p-4 rounded-xl border-2 ${fieldErrors.departureTime ? 'border-red-300 bg-red-50' : 'border-transparent bg-gray-50'
                }`}
            >
              <Clock className="w-5 h-5 text-primary-500" />
              <input
                type="datetime-local"
                value={departureTime}
                onChange={(e) => {
                  setDepartureTime(e.target.value);
                  setSubmitError(null);
                  setFieldErrors((prev) => {
                    if (!prev.departureTime) return prev;
                    const next = { ...prev };
                    delete next.departureTime;
                    return next;
                  });
                }}
                className={`flex-1 bg-transparent text-gray-700 focus:outline-none ${lightFieldClass}`}
              />
            </div>
            {fieldErrors.departureTime && (
              <p className="mt-2 text-xs text-red-600">{fieldErrors.departureTime}</p>
            )}
          </div>

          {/* Available Seats */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Seats</h2>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <Users className="w-5 h-5 text-primary-500" />
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setAvailableSeats(Math.max(1, availableSeats - 1))}
                  className="w-12 h-12 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center hover:border-primary-300 transition-colors"
                >
                  <Minus className="w-5 h-5 text-gray-600" />
                </button>
                <span className="text-2xl font-bold text-gray-900 w-8 text-center">{availableSeats}</span>
                <button
                  onClick={() => setAvailableSeats(Math.min(6, availableSeats + 1))}
                  className="w-12 h-12 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center hover:border-primary-300 transition-colors"
                >
                  <Plus className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Price Per Seat */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Price Per Seat</h2>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <IndianRupee className="w-5 h-5 text-primary-500" />
              <input
                type="number"
                value={pricePerSeat}
                onChange={(e) => setPricePerSeat(Number(e.target.value))}
                className={`flex-1 bg-transparent text-2xl font-bold text-gray-900 focus:outline-none ${lightFieldClass}`}
                placeholder="0"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Suggested: ₹{Math.round((startLocation && endLocation ? 150 : 150))} based on distance</p>
          </div>

          {/* Vehicle Details */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Details</h2>

            {/* Vehicle Type */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {vehicleTypes.map(({ label, image }) => (
                <button
                  key={label}
                  onClick={() => setVehicleType(label)}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${vehicleType === label
                    ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-md shadow-primary-100'
                    : 'border-gray-200 text-gray-600 hover:border-primary-300 hover:bg-gray-50'
                    }`}
                >
                  <img
                    src={image}
                    alt={label}
                    className={`w-16 h-10 object-contain mx-auto mb-1.5 transition-opacity ${vehicleType === label ? 'opacity-100' : 'opacity-60'
                      }`}
                  />
                  <span className="block text-center">{label}</span>
                </button>
              ))}
            </div>

            {/* Vehicle Number + Save for Later */}
            <div className="relative">
              <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => {
                  setVehicleNumber(e.target.value.toUpperCase());
                  setSubmitError(null);
                  setVehicleSaved(false);
                  setFieldErrors((prev) => {
                    if (!prev.vehicleNumber) return prev;
                    const next = { ...prev };
                    delete next.vehicleNumber;
                    return next;
                  });
                }}
                placeholder="Vehicle Number (e.g., MH01AB1234)"
                className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:border-primary-500 ${fieldErrors.vehicleNumber ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  } ${lightFieldClass}`}
              />
            </div>
            {fieldErrors.vehicleNumber && (
              <p className="mt-2 text-xs text-red-600">{fieldErrors.vehicleNumber}</p>
            )}

            {/* Save for Later button */}
            <button
              type="button"
              onClick={handleSaveVehicle}
              disabled={savingVehicle || !vehicleNumber.trim()}
              className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-primary-300 bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100 disabled:opacity-50 transition-all"
            >
              {vehicleSaved ? (
                <><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-green-700">Saved!</span></>
              ) : (
                <><Bookmark className="w-4 h-4" />{savingVehicle ? 'Saving...' : 'Save for Later'}</>
              )}
            </button>
          </div>

          {/* Additional Notes */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h2>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any preferences? (No smoking, AC on, etc.)"
                rows={3}
                className={`w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 resize-none ${lightFieldClass}`}
              />
            </div>
          </div>

          {/* Points Preview */}
          <div className="bg-primary-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-700 font-medium">You'll earn</p>
                <p className="text-2xl font-bold text-primary-600">+50 points</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Car className="w-6 h-6 text-primary-600" />
              </div>
            </div>
            <p className="text-xs text-primary-600 mt-2">Points awarded when the ride is published</p>
          </div>

          {/* Publish Button */}
          <button
            onClick={handlePublish}
            disabled={isSubmitting}
            className="w-full py-4 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Publishing...
              </>
            ) : (
              <>
                Publish Ride
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublishRidePage;
