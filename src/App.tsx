import React, { useState } from 'react';
import { IonApp, IonPage, IonRouterOutlet } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import BootSkeleton from './components/BootSkeleton';
import SplashScreen from './components/SplashScreen';
import MobileBottomNav from './components/navigation/MobileBottomNav';
import ProfileCompletionBanner from './components/profile/ProfileCompletionBanner';

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
import EditRidePage from './pages/rides/EditRidePage';
import SupportPage from './pages/support/SupportPage';
import NewDisputePage from './pages/support/NewDisputePage';
import DisputeChatPage from './pages/support/DisputeChatPage';
import SafetyPage from './pages/safety/SafetyPage';
import ProfilePage from './pages/profile/ProfilePage';
import NotificationsPage from './pages/profile/NotificationsPage';
import SettingsPage from './pages/profile/SettingsPage';
import RewardsPage from './pages/rewards/RewardsPage';
import InboxPage from './pages/inbox/InboxPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminListPage from './pages/admin/AdminListPage';
import SelectLocationPage from './pages/common/SelectLocationPage';
import TripTrackingPage from './pages/rides/TripTrackingPage';
import DeleteAccountPage from './pages/auth/DeleteAccountPage';
import PrivacyPolicyPage from './pages/auth/PrivacyPolicyPage';

import '@ionic/react/css/core.css';
import './theme/variables.css';

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
const EditRideScreen = withIonPage(EditRidePage);
const RewardsScreen = withIonPage(RewardsPage);
const InboxScreen = withIonPage(InboxPage);
const SafetyScreen = withIonPage(SafetyPage);
const ProfileScreen = withIonPage(ProfilePage);
const SettingsScreen = withIonPage(SettingsPage);
const TripTrackingScreen = withIonPage(TripTrackingPage);
const DeleteAccountScreen = withIonPage(DeleteAccountPage);
const PrivacyPolicyScreen = withIonPage(PrivacyPolicyPage);

const AppRoutes: React.FC = () => {
  const { user, isAuthLoaded } = useAuth();
  const location = useLocation();

  const getPostAuthRedirect = () => {
    if (!user) {
      return '/login';
    }

    return '/home';
  };

  const renderPublic = (Component: RoutedComponent) => (props: unknown) => {
    const routeProps = props as Record<string, unknown>;
    if (!isAuthLoaded) {
      return <BootSkeleton />;
    }
    return !user ? <Component {...routeProps} /> : <Redirect to={getPostAuthRedirect()} />;
  };

  const renderPrivate = (Component: RoutedComponent) => (props: unknown) => {
    const routeProps = props as Record<string, unknown>;
    if (!isAuthLoaded) {
      return <BootSkeleton />;
    }
    if (!user) {
      return <Redirect to="/login" />;
    }

    return <Component {...routeProps} />;
  };

  return (
    <>
      <IonRouterOutlet>
        <Route exact path="/login" render={renderPublic(LoginScreen)} />
        <Route exact path="/register" render={renderPublic(RegisterScreen)} />
        <Route exact path="/home" render={renderPrivate(HomeScreen)} />
        <Route exact path="/" render={renderPrivate(HomeScreen)} />
        <Route exact path="/upload-ride" render={renderPrivate(UploadRideScreen)} />
        <Route exact path="/publish-ride" render={renderPrivate(PublishRideScreen)} />
        <Route exact path="/find-ride" render={renderPrivate(FindRideScreen)} />
        <Route exact path="/rides" render={renderPrivate(RideHistoryScreen)} />
        <Route exact path="/select-location" render={renderPrivate(SelectLocationScreen)} />
        <Route exact path="/rides/history" render={renderPrivate(RideHistoryScreen)} />
        <Route exact path="/rides/edit/:id" render={renderPrivate(EditRideScreen)} />
        <Route exact path="/rides/detail/:id" render={renderPrivate(RideDetailPage)} />
        <Route exact path="/rides/:id([0-9a-fA-F-]{36})" render={renderPrivate(RideDetailPage)} />
        <Route exact path="/rides/active/:id" render={renderPrivate(ActiveRidePage)} />
        <Route exact path="/trips/tracking/:id" render={renderPrivate(TripTrackingScreen)} />
        <Route exact path="/rewards" render={renderPrivate(RewardsScreen)} />
        <Route exact path="/inbox" render={renderPrivate(InboxScreen)} />
        <Route exact path="/support" render={renderPrivate(SupportPage)} />
        <Route exact path="/support/dispute/new" render={renderPrivate(NewDisputePage)} />
        <Route exact path="/support/dispute/:id([0-9a-fA-F-]{36})" render={renderPrivate(DisputeChatPage)} />
        <Route exact path="/safety" render={renderPrivate(SafetyScreen)} />
        <Route exact path="/safety/sos" render={renderPrivate(SafetyScreen)} />
        <Route exact path="/profile" render={renderPrivate(ProfileScreen)} />
        <Route exact path="/profile/settings" render={renderPrivate(SettingsScreen)} />
        <Route exact path="/profile/kyc" render={renderPrivate(KycUploadPage)} />
        <Route exact path="/notifications" render={renderPrivate(NotificationsPage)} />
        <Route exact path="/delete-account" render={renderPrivate(DeleteAccountScreen)} />
        <Route exact path="/privacy-policy" component={PrivacyPolicyScreen} />
        <Route exact path="/admin" render={renderPrivate(AdminDashboardPage)} />
        <Route exact path="/admin/:section(users|rides|disputes)" render={renderPrivate(AdminListPage)} />
        <Route
          render={() => {
            if (!isAuthLoaded) {
              return <BootSkeleton />;
            }
            return <Redirect to={user ? getPostAuthRedirect() : '/login'} />;
          }}
        />
      </IonRouterOutlet>
      {user && <ProfileCompletionBanner />}
      {user && location.pathname !== '/login' && location.pathname !== '/register' && <MobileBottomNav />}
    </>
  );
};

const AppContent: React.FC = () => {
  return (
    <AuthProvider>
      <IonReactRouter>
        <AppRoutes />
      </IonReactRouter>
    </AuthProvider>
  );
};

const SPLASH_SEEN_KEY = 'blinkcar_splash_seen';

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const hasSeenOnboarding = Boolean(localStorage.getItem(SPLASH_SEEN_KEY));

  const handleSplashFinish = () => {
    if (!hasSeenOnboarding) {
      localStorage.setItem(SPLASH_SEEN_KEY, '1');
    }
    setShowSplash(false);
  };

  return (
    <IonApp>
      {showSplash ? (
        <SplashScreen onFinish={handleSplashFinish} hasSeenOnboarding={hasSeenOnboarding} />
      ) : (
        <AppContent />
      )}
    </IonApp>
  );
};

export default App;
