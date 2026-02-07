import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rideService } from '../../services';
import { ArrowLeft, Plus, Car, Calendar, MapPin, Navigation, CheckCircle2, Clock2, XCircle, ChevronRight } from 'lucide-react';
import type { Ride } from '../../types';

const RideHistoryPage = () => {
  const { user } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const history = useHistory();

  const fetchRides = async () => {
    if (!user) return;

    const result = await rideService.getRides(user.id);
    if (result.success && result.rides) {
      setRides(result.rides);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRides();
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRides();
    setRefreshing(false);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: { icon: CheckCircle2, color: 'status-active', label: 'Active' },
      pending: { icon: Clock2, color: 'status-pending', label: 'Pending' },
      completed: { icon: CheckCircle2, color: 'status-completed', label: 'Completed' },
      cancelled: { icon: XCircle, color: 'status-cancelled', label: 'Cancelled' },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <header className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Ride History</h1>
            </header>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent className="ion-padding bg-gray-50">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
          <header className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ride History</h1>
              <p className="text-gray-500 mt-1">{rides.length} ride{rides.length !== 1 ? 's' : ''} found</p>
            </div>
            <button
              onClick={() => history.push('/rides/upload')}
              className="p-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 active:scale-95 transition-all"
            >
              <Plus className="w-6 h-6" />
            </button>
          </header>

          {rides.length === 0 ? (
            <div className="card p-8 text-center animate-fade-in">
              <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">No Rides Yet</h2>
              <p className="text-gray-500 mb-6">Upload your first ride to get started</p>
              <button
                onClick={() => history.push('/rides/upload')}
                className="w-full btn btn-primary"
              >
                Upload Ride
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {rides.map((ride) => {
                const status = getStatusBadge(ride.status);
                return (
                  <button
                    key={ride.id}
                    onClick={() => history.push(`/rides/${ride.id}`)}
                    className="card p-4 text-left hover:shadow-medium transition-all w-full animate-fade-in"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Car className="w-6 h-6 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-900 truncate">{ride.startLocation}</span>
                          <Navigation className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-900 truncate">{ride.endLocation}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className={`badge ${status.color} flex items-center gap-1.5`}>
                            <status.icon className="w-3.5 h-3.5" />
                            {status.label}
                          </span>
                          <span className="text-gray-500 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(ride.date)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                          <span className="bg-gray-100 px-2 py-1 rounded-lg">{ride.vehicleType}</span>
                          <span className="bg-gray-100 px-2 py-1 rounded-lg">{ride.vehicleNumber}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default RideHistoryPage;
