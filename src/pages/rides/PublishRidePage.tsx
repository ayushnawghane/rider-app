import { useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
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
  ChevronRight
} from 'lucide-react';

interface Location {
  address: string;
  lat: number;
  lng: number;
}

const PublishRidePage = () => {
  const { isClerkLoaded } = useAuth();
  const history = useHistory();
  
  const [startLocation] = useState<Location | null>(null);
  const [endLocation] = useState<Location | null>(null);
  const [departureTime, setDepartureTime] = useState<string>('');
  const [availableSeats, setAvailableSeats] = useState<number>(3);
  const [pricePerSeat, setPricePerSeat] = useState<number>(150);
  const [vehicleType, setVehicleType] = useState<string>('Sedan');
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default time to current time + 1 hour
  useState(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    setDepartureTime(now.toISOString().slice(0, 16));
  });

  const handlePublish = async () => {
    if (!startLocation || !endLocation || !departureTime || !vehicleNumber) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    // TODO: Call API to publish ride
    try {
      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      alert('Ride published successfully!');
      history.push('/');
    } catch {
      alert('Failed to publish ride. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const vehicleTypes = ['Sedan', 'SUV', 'Hatchback', 'Luxury'];

  if (!isClerkLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-gray-50 pb-24" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 pt-12 pb-6 px-4">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => history.push('/')}
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
          {/* Route Selection */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Route Details</h2>
            
            {/* From */}
            <button 
              onClick={() => history.push('/select-location', { type: 'start', returnTo: '/publish-ride' })}
              className="w-full p-4 border-2 border-primary-100 rounded-xl mb-3 text-left hover:border-primary-300 transition-colors"
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

            {/* To */}
            <button 
              onClick={() => history.push('/select-location', { type: 'end', returnTo: '/publish-ride' })}
              className="w-full p-4 border-2 border-primary-100 rounded-xl text-left hover:border-primary-300 transition-colors"
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
          </div>

          {/* Departure Time */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Departure Time</h2>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <Clock className="w-5 h-5 text-primary-500" />
              <input
                type="datetime-local"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="flex-1 bg-transparent text-gray-700 focus:outline-none"
              />
            </div>
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
                className="flex-1 bg-transparent text-2xl font-bold text-gray-900 focus:outline-none"
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
              {vehicleTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setVehicleType(type)}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                    vehicleType === type 
                      ? 'border-primary-500 bg-primary-50 text-primary-700' 
                      : 'border-gray-200 text-gray-700 hover:border-primary-300'
                  }`}
                >
                  <Car className="w-5 h-5 mx-auto mb-1" />
                  {type}
                </button>
              ))}
            </div>

            {/* Vehicle Number */}
            <div className="relative">
              <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="Vehicle Number (e.g., MH01AB1234)"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-primary-500"
              />
            </div>
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
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-primary-500 resize-none"
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
            <p className="text-xs text-primary-600 mt-2">Points awarded after ride completion</p>
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
