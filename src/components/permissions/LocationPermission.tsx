import React, { useState, useEffect } from 'react';
import { locationService } from '../../services';
import Button from '../Button';

interface LocationPermissionProps {
  onPermissionGranted: () => void;
}

const LocationPermission: React.FC<LocationPermissionProps> = ({ onPermissionGranted }) => {
  const [checking, setChecking] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [error, setError] = useState('');

  useEffect(() => {
    const checkInitialPermission = async () => {
      try {
        setChecking(true);
        const hasPermission = await locationService.checkPermissions();
        
        if (hasPermission) {
          setPermissionStatus('granted');
          onPermissionGranted();
        } else {
          setPermissionStatus('prompt');
        }
      } catch (err) {
        console.error('Error checking location permission:', err);
        setError('Unable to check location permissions. Please ensure location services are enabled.');
        setPermissionStatus('prompt');
      } finally {
        setChecking(false);
      }
    };
    
    checkInitialPermission();
  }, [onPermissionGranted]);

  const requestPermission = async () => {
    try {
      setChecking(true);
      setError('');
      
      const hasPermission = await locationService.checkPermissions();
      
      if (hasPermission) {
        setPermissionStatus('granted');
        onPermissionGranted();
      } else {
        setPermissionStatus('denied');
        setError('Location permission is required to use this app. Please enable location services in your device settings.');
      }
    } catch (err) {
      console.error('Error requesting location permission:', err);
      setError('An error occurred while requesting location permission. Please try again.');
      setPermissionStatus('denied');
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        padding: '24px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: '#e0e7ff',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <span style={{ fontSize: '32px' }}>📍</span>
        </div>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#1f2937',
          margin: '0 0 12px 0'
        }}>
          Checking Location...
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          margin: '0 0 24px 0',
          maxWidth: '300px'
        }}>
          We're checking your location permissions
        </p>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e5e7eb',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f9fafb',
      padding: '24px',
      textAlign: 'center'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        background: permissionStatus === 'denied' ? '#fee2e2' : '#e0e7ff',
        borderRadius: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px'
      }}>
        <span style={{ fontSize: '40px' }}>
          {permissionStatus === 'denied' ? '⚠️' : '📍'}
        </span>
      </div>

      <h1 style={{
        fontSize: '24px',
        fontWeight: '700',
        color: '#1f2937',
        margin: '0 0 12px 0'
      }}>
        {permissionStatus === 'denied' ? 'Location Access Required' : 'Enable Location Access'}
      </h1>

      <p style={{
        fontSize: '16px',
        color: '#6b7280',
        margin: '0 0 24px 0',
        maxWidth: '300px',
        lineHeight: '1.5'
      }}>
        {permissionStatus === 'denied' 
          ? 'This app requires location access to provide ride tracking and safety features.'
          : 'We need access to your location to track your rides and provide safety features like SOS alerts.'}
      </p>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          maxWidth: '320px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <p style={{
              fontSize: '14px',
              color: '#b91c1c',
              margin: 0,
              textAlign: 'left'
            }}>
              {error}
            </p>
          </div>
        </div>
      )}

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        maxWidth: '320px'
      }}>
        <Button
          variant="primary"
          size="lg"
          expand="full"
          onClick={requestPermission}
        >
          {permissionStatus === 'denied' ? 'Try Again' : 'Allow Location Access'}
        </Button>

        {permissionStatus === 'denied' && (
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              window.open('app-settings:');
            }}
          >
            Open Settings
          </Button>
        )}
      </div>

      <div style={{
        marginTop: '32px',
        padding: '16px',
        background: 'white',
        borderRadius: '12px',
        maxWidth: '320px'
      }}>
        <p style={{
          fontSize: '12px',
          color: '#9ca3af',
          margin: 0,
          lineHeight: '1.5'
        }}>
          🔒 Your location data is secure and only used for ride tracking and emergency services. We never share your location with third parties.
        </p>
      </div>
    </div>
  );
};

export default LocationPermission;
