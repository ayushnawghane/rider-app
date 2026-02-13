import { IonContent, IonPage, IonIcon } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { UserButton } from '@clerk/clerk-react';
import { rideService } from '../../services';
import { Plus, Clock, MessageCircle, Shield, Car, Bell, LogOut, Calendar, MapPin, CheckCircle2, XCircle, Clock2, TrendingUp, MoreHorizontal, AlertCircle, Navigation, Route } from 'lucide-react';
import type { Ride } from '../../types';

const HomePage = () => {
  const { user, isClerkLoaded } = useAuth();
  const [activeRide, setActiveRide] = useState<Ride | undefined>();
  const [recentRides, setRecentRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const history = useHistory();

  useEffect(() => {
    const fetchRideData = async () => {
      if (user && isClerkLoaded) {
        setLoading(true);
        const activeResult = await rideService.getActiveRide(user.id);
        if (activeResult.success) {
          setActiveRide(activeResult.ride);
        }

        const historyResult = await rideService.getRides(user.id, 3);
        if (historyResult.success) {
          setRecentRides(historyResult.rides || []);
        }
        setLoading(false);
      }
    };

    fetchRideData();
  }, [user, isClerkLoaded]);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: { color: 'status-active', icon: CheckCircle2, label: 'Active' },
      pending: { color: 'status-pending', icon: Clock2, label: 'Pending' },
      completed: { color: 'status-completed', icon: CheckCircle2, label: 'Completed' },
      cancelled: { color: 'status-cancelled', icon: XCircle, label: 'Cancelled' },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  if (!isClerkLoaded) {
    return (
      <IonPage>
        <IonContent className="ion-padding bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
              <div className="card p-6 mt-6">
                <div className="h-20 bg-gray-200 rounded-xl animate-pulse" />
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
        <div className="max-w-2xl mx-auto">
          <header className="sticky top-0 bg-gray-50 z-10 pb-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.fullName || 'Rider'}!</h1>
                <p className="text-gray-500 mt-1">Manage your rides and requests</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => history.push('/notifications')}
                  className="p-3 bg-white rounded-xl hover:bg-gray-100 transition-colors relative"
                >
                  <Bell className="w-6 h-6 text-gray-600" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-danger-500 rounded-full" />
                </button>
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <UserButton afterSignOutUrl="/login" />
                </div>
              </div>
            </div>

            <button
              onClick={() => history.push('/upload-ride')}
              className="w-full btn btn-primary flex items-center justify-center gap-3 py-4 shadow-medium"
            >
              <Plus className="w-6 h-6" />
              Upload New Ride
            </button>
          </header>

          <main className="space-y-6 pb-24">
            {loading ? (
              <div className="card p-6">
                <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
              </div>
            ) : activeRide ? (
              <div className="card p-6 animate-fade-in">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                      <Car className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Active Ride</h2>
                      {(() => {
                        const status = getStatusBadge(activeRide.status);
                        return (
                          <span className={`badge ${status.color} flex items-center gap-1.5 mt-1`}>
                            <status.icon className="w-3.5 h-3.5" />
                            {status.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <button
                    onClick={() => history.push(`/rides/active/${activeRide.id}`)}
                    className="icon-btn text-primary-600"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mt-0.5">
                      <MapPin className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">From</p>
                      <p className="font-medium text-gray-900">{activeRide.startLocation}</p>
                    </div>
                  </div>

                  <div className="ml-4 w-0.5 h-6 bg-primary-200" />

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center mt-0.5">
                      <MapPin className="w-4 h-4 text-success-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">To</p>
                      <p className="font-medium text-gray-900">{activeRide.endLocation}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {new Date(activeRide.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                    <Car className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {activeRide.vehicleType} • {activeRide.vehicleNumber}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => history.push(`/rides/active/${activeRide.id}`)}
                  className="w-full btn btn-primary mt-4"
                >
                  Track Ride
                </button>
              </div>
            ) : (
              <div className="card p-8 animate-fade-in">
                <div className="empty-state">
                  <Car className="w-16 h-16 text-gray-300" />
                  <h3 className="font-semibold text-gray-900 mt-4 mb-2">No Active Ride</h3>
                  <p className="empty-text">You don't have any active ride at the moment</p>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">Quick Actions</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => history.push('/upload-ride')}
                  className="card p-4 hover:shadow-medium transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6 text-primary-600" />
                  </div>
                  <p className="font-medium text-gray-900">Upload Ride</p>
                  <p className="text-sm text-gray-500 mt-1">Add a new ride</p>
                </button>

                <button
                  onClick={() => history.push('/rides/history')}
                  className="card p-4 hover:shadow-medium transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="font-medium text-gray-900">History</p>
                  <p className="text-sm text-gray-500 mt-1">View past rides</p>
                </button>

                <button
                  onClick={() => history.push('/support')}
                  className="card p-4 hover:shadow-medium transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <MessageCircle className="w-6 h-6 text-warning-600" />
                  </div>
                  <p className="font-medium text-gray-900">Support</p>
                  <p className="text-sm text-gray-500 mt-1">Get help</p>
                </button>

                <button
                  onClick={() => history.push('/safety')}
                  className="card p-4 hover:shadow-medium transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-danger-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Shield className="w-6 h-6 text-danger-600" />
                  </div>
                  <p className="font-medium text-gray-900">Safety</p>
                  <p className="text-sm text-gray-500 mt-1">SOS & safety</p>
                </button>
              </div>
            </div>

            {recentRides.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="section-title">Recent Rides</h2>
                  <button
                    onClick={() => history.push('/rides/history')}
                    className="text-primary-600 text-sm font-medium hover:text-primary-700 flex items-center gap-1"
                  >
                    View all
                    <TrendingUp className="w-4 h-4" />
                  </button>
                </div>
                <div className="card divide-y divide-gray-100">
                  {recentRides.map((ride) => {
                    const status = getStatusBadge(ride.status);
                    return (
                      <button
                        key={ride.id}
                        onClick={() => history.push(`/rides/${ride.id}`)}
                        className="w-full list-item flex items-center gap-4 text-left"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Route className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{ride.startLocation}</span>
                            <Navigation className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{ride.endLocation}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`badge ${status.color} flex items-center gap-1.5`}>
                              <status.icon className="w-3.5 h-3.5" />
                              {status.label}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(ride.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <MoreHorizontal className="w-5 h-5 text-gray-400" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </main>

          <button
            onClick={() => history.push('/safety')}
            className="fixed bottom-4 right-4 w-14 h-14 bg-danger-500 rounded-2xl flex items-center justify-center shadow-strong hover:bg-danger-600 active:scale-95 transition-all z-50"
          >
            <AlertCircle className="w-7 h-7 text-white" />
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
