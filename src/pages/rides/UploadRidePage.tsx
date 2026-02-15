import { useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rideService } from '../../services';
import { LocationSearch, RoutePreview } from '../../components/maps';
import { useJsApiLoader } from '@react-google-maps/api';
import type { Location, RideEstimate } from '../../types/maps';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const libraries: ("places")[] = ['places'];

const MapLoadingFallback = () => (
  <div style={{
    height: '200px',
    background: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '3px solid #e5e7eb',
        borderTopColor: '#6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 8px'
      }} />
      <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Loading maps...</p>
    </div>
    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>
  </div>
);

const UploadRidePage = () => {
  const { user } = useAuth();
  const history = useHistory();

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

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

  const containerStyle: React.CSSProperties = {
    height: '100vh',
    overflow: 'auto',
    background: '#f9fafb',
    WebkitOverflowScrolling: 'touch'
  };

  const contentStyle: React.CSSProperties = {
    maxWidth: '680px',
    margin: '0 auto',
    padding: '16px'
  };

  const backButtonStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    padding: '8px 0',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 4px 0'
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0
  };

  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '16px'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    background: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    fontSize: '16px',
    outline: 'none'
  };

  const primaryButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px 24px',
    background: '#6366f1',
    color: 'white',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    marginTop: '16px'
  };

  const secondaryButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 24px',
    background: '#f3f4f6',
    color: '#374151',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    marginTop: '12px'
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 16px 0'
  };

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Where are you going?</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#6366f1', marginTop: '20px' }} />
              <div style={{ width: '2px', flex: 1, background: '#e5e7eb', margin: '4px 0' }} />
            </div>
            <div style={{ paddingLeft: '40px' }}>
              <LocationSearch
                placeholder="Enter pickup location"
                value={pickup?.address}
                onLocationSelect={handlePickupSelect}
                icon="pickup"
                onClear={() => setPickup(null)}
              />
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }} />
            </div>
            <div style={{ paddingLeft: '40px' }}>
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
            style={primaryButtonStyle}
          >
            Preview Route
          </button>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', margin: '0 0 12px 0' }}>Recent Locations</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {['Home', 'Work', 'Airport'].map((location, index) => (
            <button
              key={index}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                📍
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937', margin: 0 }}>{location}</p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>Recent location</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div style={{ height: 'calc(100vh - 100px)', margin: '-16px' }}>
      <RoutePreview
        pickup={pickup}
        drop={drop}
        onConfirm={handleRouteConfirm}
        onRideSelect={setSelectedEstimate}
      />
    </div>
  );

  const renderDetailsStep = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Ride Details</h2>

        <div style={{
          background: '#f9fafb',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#e0e7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              📍
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>From</p>
              <p style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pickup?.address}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              🏁
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>To</p>
              <p style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {drop?.address}
              </p>
            </div>
          </div>
          {selectedEstimate && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#4b5563' }}>{selectedEstimate.name}</span>
                <span style={{ fontWeight: '700', fontSize: '18px' }}>
                  {selectedEstimate.currency}{selectedEstimate.price}
                </span>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
            Date & Time
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={inputStyle}
            />
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
            Vehicle Number <span style={{ color: '#9ca3af' }}>(Optional)</span>
          </label>
          <input
            type="text"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
            placeholder="e.g., ABC 1234"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
            Reference ID <span style={{ color: '#9ca3af' }}>(Optional)</span>
          </label>
          <input
            type="text"
            value={referenceId}
            onChange={(e) => setReferenceId(e.target.value)}
            placeholder="Booking reference or ticket number"
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{
            padding: '16px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <p style={{ fontSize: '14px', color: '#b91c1c', margin: 0 }}>{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            ...primaryButtonStyle,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Creating Ride...' : 'Confirm Ride'}
        </button>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 24px' }}>
      <div style={{
        width: '80px',
        height: '80px',
        background: '#dcfce7',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
        fontSize: '40px'
      }}>
        ✅
      </div>
      <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', margin: '0 0 8px' }}>Ride Created Successfully!</h2>
      <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px' }}>Your ride has been added to your history.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button
          onClick={() => history.replace('/rides/history')}
          style={primaryButtonStyle}
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
          style={secondaryButtonStyle}
        >
          Create Another Ride
        </button>
      </div>
    </div>
  );

  if (loadError) {
    return (
      <div style={containerStyle}>
        <div style={contentStyle}>
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <span style={{ fontSize: '48px' }}>⚠️</span>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', margin: '16px 0 8px' }}>Maps Failed to Load</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px' }}>Please check your internet connection and refresh the page.</p>
            <button onClick={() => window.location.reload()} style={primaryButtonStyle}>
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={containerStyle}>
        <div style={contentStyle}>
          <MapLoadingFallback />
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        {step !== 'preview' && (
          <div style={{ marginBottom: '24px' }}>
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
              style={backButtonStyle}
            >
              <span>←</span>
              <span>Back</span>
            </button>
            <h1 style={titleStyle}>
              {step === 'locations' && 'Add Ride'}
              {step === 'details' && 'Confirm Ride'}
              {step === 'success' && 'Success!'}
            </h1>
            <p style={subtitleStyle}>
              {step === 'locations' && 'Select pickup and drop locations'}
              {step === 'details' && 'Add final details to complete'}
            </p>
          </div>
        )}

        {step === 'locations' && renderLocationsStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'details' && renderDetailsStep()}
        {step === 'success' && renderSuccessStep()}
      </div>
    </div>
  );
};

export default UploadRidePage;
