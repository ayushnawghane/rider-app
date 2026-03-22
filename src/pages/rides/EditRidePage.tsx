import { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rideService } from '../../services';
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
    AlertTriangle
} from 'lucide-react';

type EditRideFieldErrors = {
    departureTime?: string;
    vehicleNumber?: string;
};

const lightFieldClass =
    'bg-white text-gray-900 placeholder-gray-400 [color-scheme:light]';

const EditRidePage = () => {
    const { id } = useParams<{ id: string }>();
    const { user, isAuthLoaded } = useAuth();
    const history = useHistory();

    const [loading, setLoading] = useState(true);
    const [startLocation, setStartLocation] = useState<string>('');
    const [endLocation, setEndLocation] = useState<string>('');
    const [departureTime, setDepartureTime] = useState<string>('');
    const [availableSeats, setAvailableSeats] = useState<number>(3);
    const [pricePerSeat, setPricePerSeat] = useState<number>(150);
    const [vehicleType, setVehicleType] = useState<string>('Sedan');
    const [vehicleNumber, setVehicleNumber] = useState<string>('');
    const [notes, setNotes] = useState<string>('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<EditRideFieldErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleBack = () => {
        history.goBack();
    };

    useEffect(() => {
        const fetchRide = async () => {
            if (!id) return;

            const { success, ride } = await rideService.getRideById(id);
            if (success && ride) {
                if (ride.userId !== user?.id) {
                    setSubmitError("You do not have permission to edit this ride.");
                    setLoading(false);
                    return;
                }

                if (ride.status !== 'pending') {
                    setSubmitError("Only pending rides can be edited.");
                    setLoading(false);
                    return;
                }

                setStartLocation(ride.startLocation);
                setEndLocation(ride.endLocation);
                const localDate = new Date(ride.date);

                // Format to YYYY-MM-DDThh:mm for datetime-local
                // Adjust timezone offset seamlessly:
                const offset = localDate.getTimezoneOffset() * 60000;
                const localIso = (new Date(localDate.getTime() - offset)).toISOString().slice(0, 16);
                setDepartureTime(localIso);

                setAvailableSeats(ride.availableSeats ?? 3);
                setPricePerSeat(ride.pricePerSeat ?? 150);
                setVehicleType(ride.vehicleType || 'Sedan');
                setVehicleNumber(ride.vehicleNumber || '');
                setNotes(ride.notes || '');
            } else {
                setSubmitError("Ride not found.");
            }
            setLoading(false);
        };

        if (user) {
            fetchRide();
        }
    }, [id, user]);

    const handleSave = async () => {
        const nextFieldErrors: EditRideFieldErrors = {};
        const trimmedVehicleNumber = vehicleNumber.trim();

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

        if (!user) {
            setSubmitError('User not authenticated. Please log in again.');
            return;
        }

        const parsedDate = new Date(departureTime);
        setIsSubmitting(true);

        try {
            const result = await rideService.updateRideDetails(id, {
                date: parsedDate.toISOString(),
                availableSeats,
                pricePerSeat,
                vehicleType,
                vehicleNumber: trimmedVehicleNumber.toUpperCase(),
                notes: notes.trim() || undefined,
            });

            if (!result.success) {
                setSubmitError(result.error || 'Failed to update ride. Please try again.');
                return;
            }

            history.goBack();
        } catch {
            setSubmitError('Failed to update ride. Please try again.');
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

    if (!isAuthLoaded || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
            </div>
        );
    }

    if (submitError && !startLocation) {
        return (
            <div className="h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Notice</h2>
                <p className="text-gray-500 mb-6">{submitError}</p>
                <button
                    onClick={handleBack}
                    className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl shadow-sm border border-gray-200"
                >
                    Go Back
                </button>
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
                        onClick={handleBack}
                        className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center"
                    >
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <h1 className="text-2xl font-bold text-white">Edit Ride Details</h1>
                </div>
                <p className="text-primary-100">Make tweaks before you start your ride</p>
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

                    {/* Route Display (Read Only) */}
                    <div className="mb-6 opacity-70">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Route Details</h2>

                        {/* From */}
                        <div className="w-full p-4 border-2 rounded-xl mb-3 text-left border-gray-100 bg-gray-50 cursor-not-allowed">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                    <MapPin className="w-5 h-5 text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">From</p>
                                    <p className="text-gray-900 font-medium">
                                        {startLocation}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* To */}
                        <div className="w-full p-4 border-2 rounded-xl text-left border-gray-100 bg-gray-50 cursor-not-allowed">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                    <MapPin className="w-5 h-5 text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">To</p>
                                    <p className="text-gray-900 font-medium">
                                        {endLocation}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 text-center">Pickup and Dropoff locations cannot be changed once published.</p>
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

                        {/* Vehicle Number */}
                        <div className="relative">
                            <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                                className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:border-primary-500 ${fieldErrors.vehicleNumber ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                    } ${lightFieldClass}`}
                            />
                        </div>
                        {fieldErrors.vehicleNumber && (
                            <p className="mt-2 text-xs text-red-600">{fieldErrors.vehicleNumber}</p>
                        )}
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

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="w-full py-4 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                                Saving...
                            </>
                        ) : (
                            <>
                                Save Updates
                                <ChevronRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditRidePage;
