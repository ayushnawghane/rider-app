import { IonContent, IonPage } from '@ionic/react';
import { useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rideService } from '../../services';
import { ArrowLeft, MapPin, Calendar, Car, Navigation, CheckCircle2, AlertCircle } from 'lucide-react';

const UploadRidePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [referenceId, setReferenceId] = useState('');

  const history = useHistory();

  const handleSubmit = async () => {
    if (!startLocation || !endLocation || !vehicleType || !vehicleNumber || !referenceId) {
      setError('All fields are required');
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
      vehicleNumber,
      referenceId,
    });

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Failed to upload ride');
    }

    setLoading(false);
  };

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

          {!success ? (
            <div className="card p-6 space-y-6 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date & Time</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input"
                  />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={startLocation}
                    onChange={(e) => setStartLocation(e.target.value)}
                    placeholder="Pickup location"
                    className="input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Location</label>
                <div className="relative">
                  <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={endLocation}
                    onChange={(e) => setEndLocation(e.target.value)}
                    placeholder="Drop location"
                    className="input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Information</label>
                <div className="space-y-3">
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="input"
                  >
                    <option value="">Select vehicle type</option>
                    <option value="taxi">Taxi</option>
                    <option value="auto">Auto Rickshaw</option>
                    <option value="bus">Bus</option>
                    <option value="metro">Metro/Subway</option>
                    <option value="train">Train</option>
                    <option value="other">Other</option>
                  </select>

                  <div className="relative">
                    <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      placeholder="Vehicle number (e.g., ABC 1234)"
                      className="input pl-10"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reference ID / Ticket Number</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    placeholder="Booking reference or ticket number"
                    className="input pl-10"
                  />
                </div>
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
                {loading ? 'Uploading...' : 'Upload Ride'}
              </button>
            </div>
          ) : (
            <div className="card p-8 text-center animate-fade-in">
              <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-success-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Ride Uploaded Successfully!</h2>
              <p className="text-gray-500 mb-6">Your ride has been added to your history.</p>
              <div className="space-y-3">
                <button
                  onClick={() => history.replace('/rides/history')}
                  className="w-full btn btn-primary"
                >
                  View My Rides
                </button>
                <button
                  onClick={() => {
                    setSuccess(false);
                    setStartLocation('');
                    setEndLocation('');
                    setVehicleType('');
                    setVehicleNumber('');
                    setReferenceId('');
                    setStartTime('');
                  }}
                  className="w-full btn btn-secondary"
                >
                  Upload Another Ride
                </button>
              </div>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default UploadRidePage;
