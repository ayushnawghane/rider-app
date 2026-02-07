import { IonContent, IonPage } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rideService } from '../../services';
import { ArrowLeft, Phone, MessageSquare, ShieldAlert, MapPin, Navigation, Calendar, Car, DollarSign, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Ride } from '../../types';

const RideDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const history = useHistory();

  useEffect(() => {
    const fetchRide = async () => {
      const result = await rideService.getRideById(id);
      if (result.success && result.ride) {
        setRide(result.ride);
      }
      setLoading(false);
    };

    fetchRide();
  }, [id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleContactDriver = () => {
    if (ride?.driverContact) {
      window.location.href = `tel:${ride.driverContact}`;
    }
  };

  const handleRaiseDispute = () => {
    history.push(`/support/dispute/new?rideId=${ride?.id}`);
  };

  const handleSOS = () => {
    history.push(`/safety/sos?rideId=${ride?.id}`);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: { icon: CheckCircle2, color: 'status-active', label: 'Active' },
      pending: { icon: AlertTriangle, color: 'status-pending', label: 'Pending' },
      completed: { icon: CheckCircle2, color: 'status-completed', label: 'Completed' },
      cancelled: { icon: CheckCircle2, color: 'status-cancelled', label: 'Cancelled' },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded-lg animate-pulse w-3/4" />
              <div className="card p-6 space-y-4">
                <div className="h-20 bg-gray-200 rounded-xl animate-pulse" />
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                </div>
              </div>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!ride) {
    return (
      <IonPage>
        <IonContent className="ion-padding bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <header className="mb-6">
              <button
                onClick={() => history.goBack()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
            </header>
            <div className="card p-8 text-center">
              <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Ride Not Found</h2>
              <p className="text-gray-500">The ride you're looking for doesn't exist or has been deleted.</p>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const status = getStatusBadge(ride.status);

  return (
    <IonPage>
      <IonContent className="ion-padding bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <header className="mb-6">
            <button
              onClick={() => history.goBack()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </header>

          <div className="space-y-6 pb-8">
            <div className="card p-6 animate-fade-in">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                    <Car className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Ride Details</h1>
                    <span className={`badge ${status.color} flex items-center gap-1.5 mt-1`}>
                      <status.icon className="w-3.5 h-3.5" />
                      {status.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Date & Time</p>
                    <p className="font-medium text-gray-900">{formatDate(ride.date)}</p>
                  </div>
                </div>

                <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">From</p>
                      <p className="font-medium text-gray-900">{ride.startLocation}</p>
                    </div>
                  </div>
                  <div className="ml-4 w-0.5 h-4 bg-primary-200" />
                  <div className="flex items-start gap-3">
                    <Navigation className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">To</p>
                      <p className="font-medium text-gray-900">{ride.endLocation}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                    <Car className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Vehicle Type</p>
                      <p className="font-medium text-gray-900 capitalize">{ride.vehicleType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                    <Car className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Vehicle Number</p>
                      <p className="font-medium text-gray-900">{ride.vehicleNumber}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Reference ID</p>
                    <p className="font-mono font-medium text-gray-900">{ride.referenceId}</p>
                  </div>
                </div>

                {(ride.fare || ride.duration || ride.distance) && (
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                    {ride.fare && (
                      <div className="text-center">
                        <DollarSign className="w-4 h-4 text-success-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-900">${ride.fare.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Fare</p>
                      </div>
                    )}
                    {ride.duration && (
                      <div className="text-center">
                        <Clock className="w-4 h-4 text-primary-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-900">{ride.duration}m</p>
                        <p className="text-xs text-gray-500">Duration</p>
                      </div>
                    )}
                    {ride.distance && (
                      <div className="text-center">
                        <Navigation className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-900">{ride.distance}km</p>
                        <p className="text-xs text-gray-500">Distance</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleContactDriver}
                disabled={!ride.driverContact}
                className="card p-4 hover:shadow-medium transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Phone className="w-6 h-6 text-primary-600 mb-2" />
                <p className="font-medium text-gray-900">Contact Driver</p>
                <p className="text-sm text-gray-500">{ride.driverContact || 'Not available'}</p>
              </button>

              <button
                onClick={handleRaiseDispute}
                className="card p-4 hover:shadow-medium transition-all text-left"
              >
                <MessageSquare className="w-6 h-6 text-warning-600 mb-2" />
                <p className="font-medium text-gray-900">Raise Dispute</p>
                <p className="text-sm text-gray-500">Report an issue</p>
              </button>
            </div>

            <button
              onClick={handleSOS}
              className="w-full btn btn-danger py-4 flex items-center justify-center gap-3"
            >
              <ShieldAlert className="w-6 h-6" />
              SOS Emergency
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default RideDetailPage;
