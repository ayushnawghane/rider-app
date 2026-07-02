import { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { mapsService, rideService, vehicleService } from '../../services';
import {
  Clock,
  Car,
  Plus,
  Minus,
  IndianRupee,
  FileText,
  ChevronRight,
  Bookmark,
} from 'lucide-react';
import { hasRequiredBookingProfile } from '../../utils/profileCompletion';
import { displayPositiveIntegerInput, normalizePositiveIntegerInput } from '../../utils/numberInput';
import AppIcon from '../../components/icons/AppIcon';
import { PageLoader } from '../../components/ui';

const FIRE = 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))';

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
  'bg-white text-ink placeholder-ink/30 [color-scheme:light]';

const buildReferenceId = () => `RIDE-${Date.now().toString(36).toUpperCase()}`;
const pad2 = (value: number) => String(value).padStart(2, '0');
const toLocalDateTimeValue = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
const snapToNextHalfHour = (date: Date) => {
  const next = new Date(date);
  const minutes = next.getMinutes();
  next.setSeconds(0, 0);
  if (minutes === 0 || minutes === 30) return next;
  if (minutes < 30) {
    next.setMinutes(30);
    return next;
  }
  next.setHours(next.getHours() + 1, 0, 0, 0);
  return next;
};
const getDatePart = (value: string) => value.split('T')[0] || '';
const getTimePart = (value: string) => value.split('T')[1]?.slice(0, 5) || '';
const combineLocalDateAndTime = (date: string, time: string) => `${date}T${time || '00:00'}`;
const normalizeHalfHourTime = (value: string) => {
  const [hourValue, minuteValue] = value.split(':').map(Number);
  const hour = Number.isFinite(hourValue) ? hourValue : 0;
  const minute = Number.isFinite(minuteValue) ? minuteValue : 0;
  const normalizedMinute = minute < 15 ? 0 : minute < 45 ? 30 : 0;
  const normalizedHour = minute < 45 ? hour : (hour + 1) % 24;
  return `${pad2(normalizedHour)}:${pad2(normalizedMinute)}`;
};

const PublishRidePage = () => {
  const { user, isAuthLoaded, refreshUser } = useAuth();
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
  const [fieldErrors, setFieldErrors] = useState<PublishRideFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [routeMeta, setRouteMeta] = useState<{ distanceKm: number; durationMinutes: number } | null>(null);

  useEffect(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    setDepartureTime(toLocalDateTimeValue(snapToNextHalfHour(now)));
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

  useEffect(() => {
    let active = true;

    const calculateRouteMeta = async () => {
      if (!startLocation || !endLocation) {
        setRouteMeta(null);
        return;
      }

      const route = await mapsService.calculateRoute(
        { lat: startLocation.lat, lng: startLocation.lng },
        { lat: endLocation.lat, lng: endLocation.lng },
      );

      if (!active) return;

      if (route && route.distanceValue > 0 && route.durationValue > 0) {
        setRouteMeta({
          distanceKm: Math.round((route.distanceValue / 1000) * 10) / 10,
          durationMinutes: Math.max(1, Math.round(route.durationValue / 60)),
        });
        return;
      }

      setRouteMeta(null);
    };

    void calculateRouteMeta();

    return () => {
      active = false;
    };
  }, [startLocation, endLocation]);

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

    if (!hasRequiredBookingProfile(user)) {
      setSubmitError('Complete your name, email, and mobile number before publishing a ride.');
      return;
    }

    const parsedDate = new Date(departureTime);
    setIsSubmitting(true);

    try {
      const normalizedVehicleNumber = trimmedVehicleNumber.toUpperCase();
      const savedVehicle = user.vehicleDetails;
      const vehicleChanged =
        savedVehicle?.vehicleType !== vehicleType ||
        savedVehicle?.vehicleNumber !== normalizedVehicleNumber;

      if (vehicleChanged) {
        const vehicleResult = await vehicleService.saveVehicleDetails(user.id, {
          ...savedVehicle,
          vehicleType,
          vehicleNumber: normalizedVehicleNumber,
        });

        if (!vehicleResult.success) {
          setSubmitError(vehicleResult.error || 'Failed to save vehicle details. Please try again.');
          return;
        }

        await refreshUser();
      }

      const result = await rideService.createRide({
        userId: user.id,
        date: parsedDate.toISOString(),
        startLocation: selectedStart.address,
        endLocation: selectedEnd.address,
        startLocationCoords: { lat: selectedStart.lat, lng: selectedStart.lng },
        endLocationCoords: { lat: selectedEnd.lat, lng: selectedEnd.lng },
        vehicleType,
        vehicleNumber: normalizedVehicleNumber,
        referenceId: buildReferenceId(),
        availableSeats,
        pricePerSeat,
        duration: routeMeta?.durationMinutes,
        distance: routeMeta?.distanceKm,
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
    return <PageLoader />;
  }

  const sectionTitle = (text: string) => (
    <h2 className="mb-4 font-display text-lg font-extrabold tracking-tight text-ink">{text}</h2>
  );

  return (
    <div
      className="app-scroll-screen app-bottom-nav-safe publish-ride-light relative overflow-hidden bg-white"
      style={{ colorScheme: 'light' }}
    >
      {/* Grainy orange aura, right-weighted */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[320px]">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 72% at 82% -10%, rgba(255,107,0,0.4) 0%, rgba(255,160,30,0.15) 46%, rgba(255,255,255,0) 74%)' }}
        />
        <div className="absolute -right-16 -top-12 h-72 w-72 rounded-full animate-aurora-1" style={{ background: 'radial-gradient(circle, rgba(255,200,50,0.62) 0%, transparent 62%)', filter: 'blur(48px)' }} />
        <div className="absolute -left-20 top-8 h-52 w-52 rounded-full animate-aurora-2" style={{ background: 'radial-gradient(circle, rgba(255,140,0,0.24) 0%, transparent 62%)', filter: 'blur(50px)' }} />
      </div>

      <div className="relative z-10 px-4 pb-6 pt-[calc(env(safe-area-inset-top)+12px)]">
        {/* Header */}
        <div className="mb-3">
          <p className="mb-1 font-display text-xs font-bold uppercase tracking-[0.2em] text-fire-orange">Publish</p>
          <h1 className="app-page-title">Offer a ride</h1>
          <p className="mt-2 text-sm font-medium text-ink/50">Share your journey and earn points</p>
        </div>

        {/* Form */}
        <div className="rounded-[18px] border border-black/5 bg-white/85 p-4 shadow-strong backdrop-blur-md">
          {Object.keys(fieldErrors).length > 0 && (
            <div className="mb-4 rounded-2xl border border-fire-red/20 bg-fire-red/5 px-3 py-2 text-sm font-medium text-fire-red">
              Please complete all required fields highlighted below.
            </div>
          )}
          {submitError && (
            <div className="mb-4 rounded-2xl border border-fire-red/20 bg-fire-red/5 px-3 py-2 text-sm font-medium text-fire-red">
              {submitError}
            </div>
          )}

          {/* Route Selection */}
          <div className="mb-4">
            {sectionTitle('Route details')}

            {/* From */}
            <button
              onClick={() => history.push('/select-location', {
                type: 'start',
                returnTo: '/publish-ride',
                start: startLocation || undefined,
                end: endLocation || undefined,
                departureTime: departureTime || undefined,
              })}
              className={`mb-3 flex w-full items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-colors ${
                fieldErrors.startLocation ? 'border-fire-red/40 bg-fire-red/5' : 'border-primary-100 bg-primary-50/40 hover:border-primary-300'
              }`}
            >
              <AppIcon name="map-pin" className="h-6 w-6 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">From</p>
                <p className="truncate font-display font-bold text-ink">{startLocation?.address || 'Select starting point'}</p>
              </div>
            </button>
            {fieldErrors.startLocation && (
              <p className="-mt-1 mb-3 text-xs font-semibold text-fire-red">{fieldErrors.startLocation}</p>
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
              className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-colors ${
                fieldErrors.endLocation ? 'border-fire-red/40 bg-fire-red/5' : 'border-primary-100 bg-primary-50/40 hover:border-primary-300'
              }`}
            >
              <AppIcon name="route" className="h-6 w-6 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">To</p>
                <p className="truncate font-display font-bold text-ink">{endLocation?.address || 'Select destination'}</p>
              </div>
            </button>
            {fieldErrors.endLocation && (
              <p className="mt-2 text-xs font-semibold text-fire-red">{fieldErrors.endLocation}</p>
            )}
          </div>

          {/* Departure Date and Time */}
          <div className="mb-4">
            {sectionTitle('Departure date & time')}
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex min-w-0 items-center gap-3 rounded-2xl border p-4 ${
                  fieldErrors.departureTime ? 'border-fire-red/40 bg-fire-red/5' : 'border-black/5 bg-paper'
                }`}
              >
                <Clock className="h-5 w-5 shrink-0 text-fire-orange" />
                <input
                  type="date"
                  value={getDatePart(departureTime)}
                  onChange={(e) => {
                    setDepartureTime(combineLocalDateAndTime(e.target.value, getTimePart(departureTime) || '00:00'));
                    setSubmitError(null);
                    setFieldErrors((prev) => {
                      if (!prev.departureTime) return prev;
                      const next = { ...prev };
                      delete next.departureTime;
                      return next;
                    });
                  }}
                  className={`min-w-0 flex-1 bg-transparent font-display text-sm font-bold text-ink focus:outline-none ${lightFieldClass}`}
                />
              </label>
              <label
                className={`flex min-w-0 items-center gap-3 rounded-2xl border p-4 ${
                  fieldErrors.departureTime ? 'border-fire-red/40 bg-fire-red/5' : 'border-black/5 bg-paper'
                }`}
              >
                <Clock className="h-5 w-5 shrink-0 text-fire-orange" />
                <input
                  type="time"
                  step={1800}
                  value={getTimePart(departureTime)}
                  onChange={(e) => {
                    setDepartureTime(combineLocalDateAndTime(getDatePart(departureTime), normalizeHalfHourTime(e.target.value)));
                    setSubmitError(null);
                    setFieldErrors((prev) => {
                      if (!prev.departureTime) return prev;
                      const next = { ...prev };
                      delete next.departureTime;
                      return next;
                    });
                  }}
                  className={`min-w-0 flex-1 bg-transparent font-display text-sm font-bold text-ink focus:outline-none ${lightFieldClass}`}
                />
              </label>
            </div>
            {fieldErrors.departureTime && (
              <p className="mt-2 text-xs font-semibold text-fire-red">{fieldErrors.departureTime}</p>
            )}
          </div>

          {/* Available Seats */}
          <div className="mb-4">
            {sectionTitle('Available seats')}
            <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-paper p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-100 bg-white">
                <AppIcon name="users" className="h-5 w-5" />
              </div>
              <div className="flex flex-1 items-center justify-end gap-6">
                <button
                  onClick={() => setAvailableSeats(Math.max(1, availableSeats - 1))}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-primary-200 bg-white transition active:scale-90 hover:bg-primary-50"
                >
                  <Minus className="h-5 w-5 text-ink" strokeWidth={2.5} />
                </button>
                <span className="w-8 text-center font-display text-xl font-extrabold text-ink">{availableSeats}</span>
                <button
                  onClick={() => setAvailableSeats(Math.min(6, availableSeats + 1))}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-primary-200 bg-white transition active:scale-90 hover:bg-primary-50"
                >
                  <Plus className="h-5 w-5 text-ink" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          {/* Price Per Seat */}
          <div className="mb-4">
            {sectionTitle('Price per seat')}
            <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-paper p-4">
              <IndianRupee className="h-6 w-6 text-fire-orange" strokeWidth={2.5} />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={displayPositiveIntegerInput(pricePerSeat)}
                onChange={(e) => setPricePerSeat(normalizePositiveIntegerInput(e.target.value))}
                className={`flex-1 bg-transparent font-display text-xl font-extrabold text-ink focus:outline-none ${lightFieldClass}`}
                placeholder="0"
              />
            </div>
            <p className="mt-2 text-xs font-medium text-ink/50">
              {routeMeta
                ? `Route estimate: ${routeMeta.distanceKm} km • ${routeMeta.durationMinutes} min`
                : 'Route estimate appears after both locations are selected'}
            </p>
          </div>

          {/* Vehicle Details */}
          <div className="mb-4">
            {sectionTitle('Vehicle details')}

            {/* Vehicle Type */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              {vehicleTypes.map(({ label, image }) => {
                const selected = vehicleType === label;
                return (
                  <button
                    key={label}
                    onClick={() => setVehicleType(label)}
                    className={`rounded-2xl border-2 p-3 font-display text-sm font-bold transition-all ${
                      selected
                        ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-soft'
                        : 'border-black/10 text-ink/55 hover:border-primary-300 hover:bg-paper'
                    }`}
                  >
                    <img
                      src={image}
                      alt={label}
                      className={`mx-auto mb-1.5 h-10 w-16 object-contain transition-opacity ${selected ? 'opacity-100' : 'opacity-60'}`}
                    />
                    <span className="block text-center">{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Vehicle Number */}
            <div className="relative">
              <Car className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/35" />
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => {
                  setVehicleNumber(e.target.value.toUpperCase());
                  setSubmitError(null);
                  setFieldErrors((prev) => {
                    if (!prev.vehicleNumber) return prev;
                    const next = { ...prev };
                    delete next.vehicleNumber;
                    return next;
                  });
                }}
                placeholder="Vehicle Number (e.g., MH01AB1234)"
                className={`w-full rounded-2xl border-2 py-3 pl-11 pr-4 font-display font-bold focus:outline-none focus:border-fire-orange ${
                  fieldErrors.vehicleNumber ? 'border-fire-red/40 bg-fire-red/5' : 'border-black/10'
                } ${lightFieldClass}`}
              />
            </div>
            {fieldErrors.vehicleNumber && (
              <p className="mt-2 text-xs font-semibold text-fire-red">{fieldErrors.vehicleNumber}</p>
            )}

            {/* Vehicle details are saved automatically when you publish, so we
                remember them for next time — no manual "save" step needed. */}
            <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ink/45">
              <Bookmark className="h-3.5 w-3.5" />
              We'll remember your vehicle for next time.
            </p>
          </div>

          {/* Additional Notes */}
          <div className="mb-4">
            {sectionTitle('Additional notes')}
            <div className="relative">
              <FileText className="absolute left-3.5 top-3.5 h-5 w-5 text-ink/35" />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any preferences? (No smoking, AC on, etc.)"
                rows={3}
                className={`w-full resize-none rounded-2xl border-2 border-black/10 py-3 pl-11 pr-4 font-medium focus:outline-none focus:border-fire-orange ${lightFieldClass}`}
              />
            </div>
          </div>

          {/* Points Preview */}
          <div className="grain grain-strong relative mb-4 overflow-hidden rounded-[16px] p-4 text-white shadow-glow" style={{ background: FIRE }}>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-wide text-white/80">You'll earn</p>
                <p className="font-display text-3xl font-extrabold leading-none">+50 points</p>
                <p className="mt-1.5 text-xs font-medium text-white/75">Awarded when the ride is published</p>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Car className="h-7 w-7 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* Publish Button */}
          <button
            onClick={handlePublish}
            disabled={isSubmitting}
            className="grain grain-strong relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 font-display text-lg font-bold tracking-tight text-white shadow-glow transition-all hover:shadow-glow-lg active:scale-[0.98] disabled:opacity-80"
            style={{ background: FIRE }}
          >
            {isSubmitting ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Publishing...
              </>
            ) : (
              <>
                Publish Ride
                <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublishRidePage;
