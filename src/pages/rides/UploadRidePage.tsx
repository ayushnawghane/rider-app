/**
 * UploadRidePage
 * Map-first ride upload with location search and route preview
 */

import { IonContent, IonPage } from '@ionic/react';
import { useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rideService } from '../../services';
import { LocationSearch, RoutePreview } from '../../components/maps';
import { ArrowLeft, MapPin, Calendar, Car, Navigation, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Location, RideEstimate } from '../../types/maps';

const UploadRidePage = () => {
  const { user } = useAuth();
  const history = useHistory();
  
  const [step, setStep] = useState<'locations' | 'preview' | 'details' | 'success'>('locations');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [pickup, setPickup] = useState<Location | null>(null);
  const [drop, setDrop] = useState<Location | null>(null);
  const [selectedEstimate, setSelectedEstimate] = useState<RideEstimate | null>(null);
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [referenceId, setReferenceId] = useState('');

  const handlePickupSelect = (location: Location) => {
    setPickup(location);
  };

  const handleDropSelect = (location: Location) => {
    setDrop(location);
  };

  const handleRouteConfirm = (estimate: RideEstimate) => {
    setSelectedEstimate(estimate);
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!pickup || !drop || !selectedEstimate) {
      setError('Please complete all fields');
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
      startLocation: pickup.address,
      endLocation: drop.address,
      startLocationCoords: { lat: pickup.lat, lng: pickup.lng },
      endLocationCoords: { lat: drop.lat, lng: drop.lng },
      vehicleType: selectedEstimate.type,
      vehicleNumber: vehicleNumber || 'UNKNOWN',
      referenceId: referenceId || 'N/A',
    });

    if (result.success) {
      setStep('success');
    } else {
      setError(result.error || 'Failed to upload ride');
    }

    setLoading(false);
  };

  const renderLocationsStep = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Where are you going?</h2>
        
        <div className="space-y-4">
          {/* Pickup Search */}
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-primary-500 mt-5" />
              <div className="w-0.5 flex-1 bg-gray-200 my-1" />
            </div>
            <div className="pl-10">
              <LocationSearch
                placeholder="Enter pickup location"
                value={pickup?.address}
                onLocationSelect={handlePickupSelect}
                icon="pickup"
                onClear={() => setPickup(null)}
              />
            </div>
          </div>

          {/* Drop Search */}
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-success-500" />
            </div>
            <div className="pl-10">
              <LocationSearch
                placeholder="Enter drop location"
                value={drop?.address}
                onLocationSelect={handleDropSelect}
                icon="drop"
                onClear={() => setDrop(null)}
              />
            </div>
          </div>
        </div>

        {pickup && drop && (
          <button
            onClick={() => setStep('preview')}
            className="w-full btn btn-primary mt-6 py-4"
          >
            Preview Route
          </button>
        )}
      </div>

      {/* Recent Locations (placeholder) */}
      <div className="bg-white rounded-2xl p-6 shadow-soft">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Recent Locations</h3>
        <div className="space-y-2">
          {['Home', 'Work', 'Airport'].map((location, index) => (
            <button
              key={index}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{location}</p>
                <p className="text-sm text-gray-500">Recent location</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="h-[calc(100vh-120px)] -mx-4 -mt-4">
      <RoutePreview
        pickup={pickup}
        drop={drop}
        onConfirm={handleRouteConfirm}
        onRideSelect={setSelectedEstimate}
      />
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ride Details</h2>
        
        {/* Selected Route Summary */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">From</p>
              <p className="font-medium text-gray-900 truncate">{pickup?.address}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <Navigation className="w-5 h-5 text-success-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">To</p>
              <p className="font-medium text-gray-900 truncate">{drop?.address}</p>
            </div>
          </div>
          {selectedEstimate && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">{selectedEstimate.name}</span>
                <span className="font-bold text-lg">{selectedEstimate.currency}{selectedEstimate.price}</span>
              </div>
            </div>
          )}
        </div>

        {/* Date & Time */}
        <div className="mb-6">
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

        {/* Vehicle Number */}
        <div className="mb-6">
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
        <div className="mb-6">
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
          <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl flex items-start gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-danger-900">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full btn btn-primary py-4"
        >
          {loading ? 'Creating Ride...' : 'Confirm Ride'}
        </button>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
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
          onClick={() => {
            setStep('locations');
            setPickup(null);
            setDrop(null);
            setSelectedEstimate(null);
            setVehicleNumber('');
            setReferenceId('');
          }}
          className="w-full btn btn-secondary"
        >
          Create Another Ride
        </button>
      </div>
    </div>
  );

  return (
    <IonPage>
      <IonContent className="ion-padding bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          {step !== 'preview' && (
            <header className="mb-6">
              <button
                onClick={() => {
                  if (step === 'locations') {
                    history.goBack();
                  } else if (step === 'details') {
                    setStep('locations');
                  } else if (step === 'success') {
                    setStep('locations');
                  }
                }}
                className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {step === 'locations' && 'Add Ride'}
                {step === 'details' && 'Confirm Ride'}
                {step === 'success' && 'Success!'}
              </h1>
              <p className="text-gray-500 mt-1">
                {step === 'locations' && 'Select pickup and drop locations'}
                {step === 'details' && 'Add final details to complete'}
              </p>
            </header>
          )}

          {/* Step Content */}
          {step === 'locations' && renderLocationsStep()}
          {step === 'preview' && renderPreviewStep()}
          {step === 'details' && renderDetailsStep()}
          {step === 'success' && renderSuccessStep()}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default UploadRidePage;
