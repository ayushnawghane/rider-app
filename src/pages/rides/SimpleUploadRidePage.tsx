/**
 * SimpleUploadRidePage
 * Fallback ride upload without Google Maps (for testing)
 */

import { IonContent, IonPage } from '@ionic/react';
import { useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rideService } from '../../services';
import { ArrowLeft, MapPin, Calendar, Car, Navigation, CheckCircle2, AlertCircle } from 'lucide-react';

const SimpleUploadRidePage = () => {
  const { user } = useAuth();
  const history = useHistory();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [vehicleType, setVehicleType] = useState('economy');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [referenceId, setReferenceId] = useState('');

  const handleSubmit = async () => {
    if (!startLocation || !endLocation) {
      setError('Please enter both pickup and drop locations');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError('');

    const result = await rideService.createRide({
      userId: user.id,
      date: `${date}${startTime ? 'T' + startTime : ''}`,
      startLocation,
      endLocation,
      vehicleType,
      vehicleNumber: vehicleNumber || 'UNKNOWN',
      referenceId: referenceId || 'N/A',
    });

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Failed to upload ride');
    }

    setLoading(false);
  };

  if (success) {
    return (
      <IonPage>
        <IonContent className="ion-padding bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="card p-8 text-center animate-fade-in">
              <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-success-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Ride Created Successfully!</h2>
              <p className="text-gray-500 mb-6">Your ride has been added to your history.</p>
              <div className="space-y-3">
                <button
                  onClick={() => history.replace('/rides/history')}
                  className="w-full btn btn-primary"
                >
                  View My Rides
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full btn btn-secondary"
                >
                  Create Another Ride
                </button>
              </div>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent className="ion-padding bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <header className="mb-6">
            <button
              onClick={() => history.goBack()}
              className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Upload Ride</h1>
            <p className="text-gray-500 mt-1">Add a new ride to your history</p>
          </header>

          <div className="card p-6 space-y-6 animate-fade-in">
            {/* Date & Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date & Time</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full input pl-10"
                  />
                </div>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            {/* Pickup Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={startLocation}
                  onChange={(e) => setStartLocation(e.target.value)}
                  placeholder="Enter pickup address"
                  className="w-full input pl-10"
                />
              </div>
            </div>

            {/* Drop Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Drop Location</label>
              <div className="relative">
                <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={endLocation}
                  onChange={(e) => setEndLocation(e.target.value)}
                  placeholder="Enter drop address"
                  className="w-full input pl-10"
                />
              </div>
            </div>

            {/* Vehicle Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="input"
              >
                <option value="economy">Economy</option>
                <option value="comfort">Comfort</option>
                <option value="premium">Premium</option>
                <option value="suv">SUV</option>
                <option value="taxi">Taxi</option>
                <option value="auto">Auto Rickshaw</option>
                <option value="bus">Bus</option>
                <option value="metro">Metro/Subway</option>
                <option value="train">Train</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Vehicle Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Number <span className="text-gray-400">(Optional)</span>
              </label>
              <div className="relative">
                <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g., ABC 1234"
                  className="w-full input pl-10"
                />
              </div>
            </div>

            {/* Reference ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference ID <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="Booking reference or ticket number"
                className="input"
              />
            </div>

            {error && (
              <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-danger-900">{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full btn btn-primary py-4"
            >
              {loading ? 'Creating Ride...' : 'Upload Ride'}
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SimpleUploadRidePage;
