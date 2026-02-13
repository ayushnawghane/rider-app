import React from 'react';
import { IonApp, IonRouterOutlet, IonLoading } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserButton } from '@clerk/clerk-react';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import KycUploadPage from './pages/auth/KycUploadPage';
import HomePage from './pages/home/HomePage';
import UploadRidePage from './pages/rides/UploadRidePage';
import RideHistoryPage from './pages/rides/RideHistoryPage';
import RideDetailPage from './pages/rides/RideDetailPage';
import ActiveRidePage from './pages/rides/ActiveRidePage';
import SupportPage from './pages/support/SupportPage';
import NewDisputePage from './pages/support/NewDisputePage';
import DisputeChatPage from './pages/support/DisputeChatPage';
import SafetyPage from './pages/safety/SafetyPage';
import ProfilePage from './pages/profile/ProfilePage';
import NotificationsPage from './pages/profile/NotificationsPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';

import '@ionic/react/css/core.css';
import './theme/variables.css';

const PrivateRoute: React.FC<{ component: React.ComponentType<any>; path: string; exact?: boolean }> = ({ component: Component, ...rest }) => {
  const { user, loading, isClerkLoaded } = useAuth();

  if (!isClerkLoaded || loading) {
    return <IonLoading isOpen message="Loading..." />;
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

const PublicRoute: React.FC<{ component: React.ComponentType<any>; path: string; exact?: boolean }> = ({ component: Component, ...rest }) => {
  const { user, loading, isClerkLoaded } = useAuth();

  if (!isClerkLoaded || loading) {
    return <IonLoading isOpen message="Loading..." />;
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

const App: React.FC = () => {
  return (
    <IonApp>
      <AuthProvider>
        <IonReactRouter>
          <IonRouterOutlet>
            <PublicRoute component={LoginPage} path="/login" exact />
            <PublicRoute component={RegisterPage} path="/register" exact />
            <PrivateRoute component={HomePage} path="/home" exact />
            <PrivateRoute component={UploadRidePage} path="/upload-ride" />
            <PrivateRoute component={RideHistoryPage} path="/rides/history" exact />
            <PrivateRoute component={RideDetailPage} path="/rides/:id" exact />
            <PrivateRoute component={ActiveRidePage} path="/rides/active/:id" />
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
    </IonApp>
  );
};

export default App;
