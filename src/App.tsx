import React, { useState, useEffect } from 'react';
import { IonApp, IonPage, IonRouterOutlet } from '@ionic/react';
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

const LOCATION_PERMISSION_TIMEOUT_MS = 12000;

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

type RoutedComponent = React.ComponentType<Record<string, unknown>>;

const withIonPage = (Component: RoutedComponent): RoutedComponent => {
  const WrappedPage: RoutedComponent = (props) => (
    <IonPage>
      <Component {...props} />
    </IonPage>
  );
  WrappedPage.displayName = `WithIonPage(${Component.displayName || Component.name || 'Page'})`;
  return WrappedPage;
};

const LoginScreen = withIonPage(LoginPage);
const RegisterScreen = withIonPage(RegisterPage);
const HomeScreen = withIonPage(HomePage);
const UploadRideScreen = withIonPage(UploadRidePage);
const PublishRideScreen = withIonPage(PublishRidePage);
const FindRideScreen = withIonPage(FindRidePage);
const RideHistoryScreen = withIonPage(RideHistoryPage);
const SelectLocationScreen = withIonPage(SelectLocationPage);
const RewardsScreen = withIonPage(RewardsPage);
const SafetyScreen = withIonPage(SafetyPage);
const ProfileScreen = withIonPage(ProfilePage);

const AppRoutes: React.FC = () => {
  const { user, isAuthLoaded } = useAuth();

  const renderPublic = (Component: RoutedComponent) => (props: unknown) => {
    const routeProps = props as Record<string, unknown>;
    if (!isAuthLoaded) {
      return <LoadingOverlay isOpen message="Loading..." />;
    }
    return !user ? <Component {...routeProps} /> : <Redirect to="/home" />;
  };

  const renderPrivate = (Component: RoutedComponent) => (props: unknown) => {
    const routeProps = props as Record<string, unknown>;
    if (!isAuthLoaded) {
      return <LoadingOverlay isOpen message="Loading..." />;
    }
    return user ? <Component {...routeProps} /> : <Redirect to="/login" />;
  };

  return (
    <IonReactRouter>
      <IonRouterOutlet>
        <Route exact path="/login" render={renderPublic(LoginScreen)} />
        <Route exact path="/register" render={renderPublic(RegisterScreen)} />
        <Route exact path="/home" render={renderPrivate(HomeScreen)} />
        <Route exact path="/" render={renderPrivate(HomeScreen)} />
        <Route exact path="/upload-ride" render={renderPrivate(UploadRideScreen)} />
        <Route exact path="/publish-ride" render={renderPrivate(PublishRideScreen)} />
        <Route exact path="/find-ride" render={renderPrivate(FindRideScreen)} />
        <Route exact path="/select-location" render={renderPrivate(SelectLocationScreen)} />
        <Route exact path="/rides/history" render={renderPrivate(RideHistoryScreen)} />
        <Route exact path="/rides/detail/:id" render={renderPrivate(RideDetailPage)} />
        <Route exact path="/rides/:id([0-9a-fA-F-]{36})" render={renderPrivate(RideDetailPage)} />
        <Route exact path="/rides/active/:id" render={renderPrivate(ActiveRidePage)} />
        <Route exact path="/rewards" render={renderPrivate(RewardsScreen)} />
        <Route exact path="/support" render={renderPrivate(SupportPage)} />
        <Route exact path="/support/dispute/new" render={renderPrivate(NewDisputePage)} />
        <Route exact path="/support/dispute/:id" render={renderPrivate(DisputeChatPage)} />
        <Route exact path="/safety" render={renderPrivate(SafetyScreen)} />
        <Route exact path="/safety/sos" render={renderPrivate(SafetyScreen)} />
        <Route exact path="/profile" render={renderPrivate(ProfileScreen)} />
        <Route exact path="/profile/kyc" render={renderPrivate(KycUploadPage)} />
        <Route exact path="/notifications" render={renderPrivate(NotificationsPage)} />
        <Route exact path="/admin" render={renderPrivate(AdminDashboardPage)} />
        <Route
          render={() => {
            if (!isAuthLoaded) {
              return <LoadingOverlay isOpen message="Loading..." />;
            }
            return <Redirect to={user ? '/home' : '/login'} />;
          }}
        />
      </IonRouterOutlet>
    </IonReactRouter>
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
      const hasPermission = await withTimeout(
        locationService.checkPermissions(),
        LOCATION_PERMISSION_TIMEOUT_MS,
        'Location permission check timed out',
      );
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
      <AppRoutes />
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
