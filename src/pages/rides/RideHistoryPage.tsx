import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rideService } from '../../services';
import { SkeletonList } from '../../components/Skeleton';
import { Navigation } from 'lucide-react';
import type { Ride } from '../../types';

const RideHistoryPage = () => {
  const { user } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const history = useHistory();

  useEffect(() => {
    const fetchRides = async () => {
      if (!user) return;

      const result = await rideService.getRides(user.id);
      if (result.success && result.rides) {
        setRides(result.rides);
      }
      setLoading(false);
    };

    fetchRides();
  }, [user]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; bgColor: string; icon: string; label: string }> = {
      active: { color: '#16a34a', bgColor: '#dcfce7', icon: '✓', label: 'Active' },
      pending: { color: '#d97706', bgColor: '#fef3c7', icon: '⏳', label: 'Pending' },
      completed: { color: '#2563eb', bgColor: '#dbeafe', icon: '✓', label: 'Completed' },
      cancelled: { color: '#dc2626', bgColor: '#fee2e2', icon: '✕', label: 'Cancelled' },
    };
    return statusMap[status] || statusMap.pending;
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

  const containerStyle: React.CSSProperties = {
    height: 'calc(100vh - var(--app-bottom-nav-height))',
    overflow: 'auto',
    background: '#f9fafb',
    padding: '16px',
    paddingBottom: 'calc(var(--app-bottom-nav-height) + 16px)',
    WebkitOverflowScrolling: 'touch'
  };

  const contentStyle: React.CSSProperties = {
    maxWidth: '680px',
    margin: '0 auto'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    paddingTop: '8px'
  };

  const backButtonStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    fontSize: '24px',
    display: 'flex',
    alignItems: 'center'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0 0 0'
  };

  const addButtonStyle: React.CSSProperties = {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: '#6366f1',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '24px',
    color: 'white'
  };

  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '12px'
  };

  const rideItemStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '16px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '12px',
    border: 'none',
    width: '100%',
    cursor: 'pointer',
    textAlign: 'left'
  };

  const statusBadgeStyle = (status: string): React.CSSProperties => {
    const statusInfo = getStatusBadge(status);
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 10px',
      borderRadius: '8px',
      background: statusInfo.bgColor,
      color: statusInfo.color,
      fontSize: '12px',
      fontWeight: '500'
    };
  };

  const primaryButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 24px',
    background: '#6366f1',
    color: 'white',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    marginTop: '16px'
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={contentStyle}>
          <div style={headerStyle}>
            <div>
              <h1 style={titleStyle}>Ride History</h1>
            </div>
          </div>
          <SkeletonList count={3} lines={3} />
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <div style={headerStyle}>
          <div>
            <button
              onClick={() => history.goBack()}
              style={backButtonStyle}
            >
              ←
            </button>
            <h1 style={titleStyle}>Ride History</h1>
            <p style={subtitleStyle}>{rides.length} ride{rides.length !== 1 ? 's' : ''} found</p>
          </div>
          <button
            onClick={() => history.push('/publish-ride')}
            style={addButtonStyle}
          >
            +
          </button>
        </div>

        {rides.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 24px' }}>
            <span style={{ fontSize: '64px' }}>🚗</span>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: '16px 0 8px' }}>No Rides Yet</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px' }}>Publish your first ride to get started</p>
            <button
              onClick={() => history.push('/publish-ride')}
              style={primaryButtonStyle}
            >
              Publish Ride
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rides.map((ride) => {
              const status = getStatusBadge(ride.status);
              return (
                <button
                  key={ride.id}
                  onClick={() => history.push(`/rides/detail/${ride.id}`)}
                  style={rideItemStyle}
                >
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: '#e0e7ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      flexShrink: 0
                    }}>
                      🚗
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', color: '#9ca3af' }}>📍</span>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ride.startLocation}
                        </span>
                        <span style={{ fontSize: '14px', color: '#9ca3af' }}>→</span>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ride.endLocation}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <span style={statusBadgeStyle(ride.status)}>
                          {status.icon} {status.label}
                        </span>
                        <span style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          📅 {formatDate(ride.date)}
                        </span>
                      </div>
                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#4b5563', background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px' }}>
                          {ride.vehicleType}
                        </span>
                        <span style={{ fontSize: '12px', color: '#4b5563', background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px' }}>
                          {ride.vehicleNumber}
                        </span>
                        {ride.pricePerSeat > 0 && (
                          <span style={{ fontSize: '12px', color: '#f97316', background: '#fff7ed', padding: '4px 8px', borderRadius: '6px', fontWeight: '600' }}>
                            ₹{ride.pricePerSeat}/seat
                          </span>
                        )}
                        <span style={{ fontSize: '12px', color: '#6366f1', background: '#eef2ff', padding: '4px 8px', borderRadius: '6px' }}>
                          {ride.availableSeats - ride.bookedSeats}/{ride.availableSeats} seats
                        </span>
                        {(ride.status === 'active' || ride.status === 'pending') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              history.push(`/trips/tracking/${ride.id}`);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              color: 'white',
                              background: '#6366f1',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontWeight: '600',
                              border: 'none',
                              cursor: 'pointer',
                              marginLeft: 'auto',
                            }}
                          >
                            <Navigation size={12} />
                            Track Trip
                          </button>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: '24px', color: '#9ca3af', alignSelf: 'center' }}>›</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RideHistoryPage;
