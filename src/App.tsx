import React, { useState, useEffect } from 'react';
import { IonApp, IonRouterOutlet } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationPermission } from './components/permissions';
import { locationService } from './services';
import LoadingOverlay from './components/LoadingOverlay';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import KycUploadPage from './pages/auth/KycUploadPage';
import HomePage from './pages/home/HomePage';
import UploadRidePage from './pages/rides/UploadRidePage';
import PublishRidePage from './pages/rides/PublishRidePage';
import FindRidePage from './pages/rides/FindRidePage';
import RideHistoryPage from './pages/rides/RideHistoryPage';
import RideDetailPage from './pages/rides/RideDetailPage';
import ActiveRidePage from './pages/rides/ActiveRidePage';
import SupportPage from './pages/support/SupportPage';
import NewDisputePage from './pages/support/NewDisputePage';
import DisputeChatPage from './pages/support/DisputeChatPage';
import SafetyPage from './pages/safety/SafetyPage';
import ProfilePage from './pages/profile/ProfilePage';
import NotificationsPage from './pages/profile/NotificationsPage';
import RewardsPage from './pages/rewards/RewardsPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import SelectLocationPage from './pages/common/SelectLocationPage';

import '@ionic/react/css/core.css';
import './theme/variables.css';

const PrivateRoute: React.FC<{ component: React.ComponentType<Record<string, unknown>>; path: string; exact?: boolean }> = ({ component: Component, ...rest }) => {
  const { user, loading, isAuthLoaded } = useAuth();

  if (!isAuthLoaded || loading) {
    return <LoadingOverlay isOpen message="Loading..." />;
  }

  return (
    <Route
      {...rest}
      render={(props) =>
        user ? <Component {...props} /> : <Redirect to="/login" />
      }
    />
  );
};

const PublicRoute: React.FC<{ component: React.ComponentType<Record<string, unknown>>; path: string; exact?: boolean }> = ({ component: Component, ...rest }) => {
  const { user, loading, isAuthLoaded } = useAuth();

  if (!isAuthLoaded || loading) {
    return <LoadingOverlay isOpen message="Loading..." />;
  }

  return (
    <Route
      {...rest}
      render={(props) =>
        !user ? <Component {...props} /> : <Redirect to="/home" />
      }
    />
  );
};

const AppContent: React.FC = () => {
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(true);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      setCheckingLocation(true);
      const hasPermission = await locationService.checkPermissions();
      setLocationGranted(hasPermission);
    } catch (error) {
      console.error('Error checking location permission:', error);
      setLocationGranted(false);
    } finally {
      setCheckingLocation(false);
    }
  };

  const handleLocationGranted = () => {
    setLocationGranted(true);
  };

  if (checkingLocation) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb'
      }}>
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

  if (!locationGranted) {
    return <LocationPermission onPermissionGranted={handleLocationGranted} />;
  }

  return (
    <AuthProvider>
      <IonReactRouter>
        <IonRouterOutlet>
          <PublicRoute component={LoginPage} path="/login" exact />
          <PublicRoute component={RegisterPage} path="/register" exact />
          <PrivateRoute component={HomePage} path="/home" exact />
          <PrivateRoute component={HomePage} path="/" exact />
          <PrivateRoute component={UploadRidePage} path="/upload-ride" />
          <PrivateRoute component={PublishRidePage} path="/publish-ride" exact />
          <PrivateRoute component={FindRidePage} path="/find-ride" exact />
          <PrivateRoute component={SelectLocationPage} path="/select-location" exact />
          <PrivateRoute component={RideHistoryPage} path="/rides/history" exact />
          <PrivateRoute component={RideDetailPage} path="/rides/:id" exact />
          <PrivateRoute component={ActiveRidePage} path="/rides/active/:id" />
          <PrivateRoute component={RewardsPage} path="/rewards" exact />
          <PrivateRoute component={SupportPage} path="/support" exact />
          <PrivateRoute component={NewDisputePage} path="/support/dispute/new" exact />
          <PrivateRoute component={DisputeChatPage} path="/support/dispute/:id" />
          <PrivateRoute component={SafetyPage} path="/safety" exact />
          <PrivateRoute component={SafetyPage} path="/safety/sos" exact />
          <PrivateRoute component={ProfilePage} path="/profile" exact />
          <PrivateRoute component={KycUploadPage} path="/profile/kyc" exact />
          <PrivateRoute component={NotificationsPage} path="/notifications" exact />
          <PrivateRoute component={AdminDashboardPage} path="/admin" exact />
          <Redirect from="/" to="/login" exact />
        </IonRouterOutlet>
      </IonReactRouter>
    </AuthProvider>
  );
};

const App: React.FC = () => {
  return (
    <IonApp>
      <AppContent />
    </IonApp>
  );
};

export default App;
