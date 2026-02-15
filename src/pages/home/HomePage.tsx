import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { UserButton } from '@clerk/clerk-react';
import { rideService } from '../../services';
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
    const statusMap: Record<string, { color: string; bgColor: string; icon: string; label: string }> = {
      active: { color: '#16a34a', bgColor: '#dcfce7', icon: '✓', label: 'Active' },
      pending: { color: '#d97706', bgColor: '#fef3c7', icon: '⏳', label: 'Pending' },
      completed: { color: '#2563eb', bgColor: '#dbeafe', icon: '✓', label: 'Completed' },
      cancelled: { color: '#dc2626', bgColor: '#fee2e2', icon: '✕', label: 'Cancelled' },
    };
    return statusMap[status] || statusMap.pending;
  };

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

  const headerStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    background: '#f9fafb',
    zIndex: 10,
    paddingBottom: '16px'
  };

  const headerTopStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px'
  };

  const greetingStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0
  };

  const subGreetingStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0 0 0'
  };

  const iconButtonStyle: React.CSSProperties = {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'white',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    position: 'relative'
  };

  const notificationDotStyle: React.CSSProperties = {
    position: 'absolute',
    top: '10px',
    right: '10px',
    width: '8px',
    height: '8px',
    background: '#ef4444',
    borderRadius: '50%'
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 4px 6px rgba(99, 102, 241, 0.2)'
  };

  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '16px'
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 16px 0'
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

  const locationRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '12px'
  };

  const locationIconStyle = (type: 'start' | 'end'): React.CSSProperties => ({
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: type === 'start' ? '#e0e7ff' : '#dcfce7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px'
  });

  const quickActionsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  };

  const quickActionStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '16px',
    padding: '16px',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  };

  const quickActionIconStyle = (color: string): React.CSSProperties => ({
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    marginBottom: '12px'
  });

  const rideListItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    background: 'white',
    borderRadius: '12px',
    marginBottom: '8px',
    border: 'none',
    width: '100%',
    cursor: 'pointer',
    textAlign: 'left'
  };

  const sosButtonStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: '#ef4444',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
    zIndex: 50
  };

  const skeletonStyle: React.CSSProperties = {
    background: '#e5e7eb',
    borderRadius: '8px',
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
  };

  if (!isClerkLoaded) {
    return (
      <div style={containerStyle}>
        <div style={contentStyle}>
          <div style={{ paddingTop: '24px' }}>
            <div style={{ ...skeletonStyle, height: '32px', width: '60%', marginBottom: '8px' }} />
            <div style={{ ...skeletonStyle, height: '20px', width: '40%', marginBottom: '24px' }} />
            <div style={{ ...skeletonStyle, height: '100px', borderRadius: '16px' }} />
          </div>
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <div style={headerStyle}>
          <div style={headerTopStyle}>
            <div>
              <h1 style={greetingStyle}>Welcome, {user?.fullName || 'Rider'}!</h1>
              <p style={subGreetingStyle}>Manage your rides and requests</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => history.push('/notifications')}
                style={iconButtonStyle}
              >
                <span>🔔</span>
                <span style={notificationDotStyle} />
              </button>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden' }}>
                <UserButton afterSignOutUrl="/login" />
              </div>
            </div>
          </div>

          <button
            onClick={() => history.push('/upload-ride')}
            style={primaryButtonStyle}
          >
            <span>➕</span>
            Upload New Ride
          </button>
        </div>

        <div style={{ paddingBottom: '100px' }}>
          {loading ? (
            <div style={{ ...skeletonStyle, height: '200px', borderRadius: '16px' }} />
          ) : activeRide ? (
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={locationIconStyle('start')}>
                    <span>🚗</span>
                  </div>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: 0 }}>Active Ride</h2>
                    <span style={statusBadgeStyle(activeRide.status)}>
                      {getStatusBadge(activeRide.status).icon} {getStatusBadge(activeRide.status).label}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => history.push(`/rides/active/${activeRide.id}`)}
                  style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer' }}
                >
                  ⋯
                </button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={locationRowStyle}>
                  <div style={locationIconStyle('start')}>
                    <span>📍</span>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>From</p>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937', margin: '2px 0 0 0' }}>{activeRide.startLocation}</p>
                  </div>
                </div>
                <div style={{ marginLeft: '16px', width: '2px', height: '16px', background: '#e5e7eb' }} />
                <div style={locationRowStyle}>
                  <div style={locationIconStyle('end')}>
                    <span>🏁</span>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>To</p>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937', margin: '2px 0 0 0' }}>{activeRide.endLocation}</p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                <div style={{ background: '#f3f4f6', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📅</span>
                  <span style={{ fontSize: '13px', color: '#4b5563' }}>
                    {new Date(activeRide.date).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ background: '#f3f4f6', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🚗</span>
                  <span style={{ fontSize: '13px', color: '#4b5563' }}>
                    {activeRide.vehicleType} • {activeRide.vehicleNumber}
                  </span>
                </div>
              </div>

              <button
                onClick={() => history.push(`/rides/active/${activeRide.id}`)}
                style={{
                  ...primaryButtonStyle,
                  marginTop: 0
                }}
              >
                Track Ride
              </button>
            </div>
          ) : (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 20px' }}>
              <span style={{ fontSize: '48px' }}>🚗</span>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: '16px 0 8px' }}>No Active Ride</h3>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>You don't have any active ride at the moment</p>
            </div>
          )}

          <div style={{ marginTop: '24px' }}>
            <h2 style={sectionTitleStyle}>Quick Actions</h2>
            <div style={quickActionsGridStyle}>
              <button
                onClick={() => history.push('/upload-ride')}
                style={quickActionStyle}
              >
                <div style={quickActionIconStyle('#e0e7ff')}>➕</div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', margin: '0 0 4px 0' }}>Upload Ride</p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Add a new ride</p>
              </button>

              <button
                onClick={() => history.push('/rides/history')}
                style={quickActionStyle}
              >
                <div style={quickActionIconStyle('#dbeafe')}>🕐</div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', margin: '0 0 4px 0' }}>History</p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>View past rides</p>
              </button>

              <button
                onClick={() => history.push('/support')}
                style={quickActionStyle}
              >
                <div style={quickActionIconStyle('#fef3c7')}>💬</div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', margin: '0 0 4px 0' }}>Support</p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Get help</p>
              </button>

              <button
                onClick={() => history.push('/safety')}
                style={quickActionStyle}
              >
                <div style={quickActionIconStyle('#fee2e2')}>🛡️</div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', margin: '0 0 4px 0' }}>Safety</p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>SOS & safety</p>
              </button>
            </div>
          </div>

          {recentRides.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={sectionTitleStyle}>Recent Rides</h2>
                <button
                  onClick={() => history.push('/rides/history')}
                  style={{ background: 'transparent', border: 'none', color: '#6366f1', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                >
                  View all →
                </button>
              </div>
              <div>
                {recentRides.map((ride) => {
                  const status = getStatusBadge(ride.status);
                  return (
                    <button
                      key={ride.id}
                      onClick={() => history.push(`/rides/${ride.id}`)}
                      style={rideListItemStyle}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '14px', color: '#9ca3af' }}>📍</span>
                          <span style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>{ride.startLocation}</span>
                          <span style={{ fontSize: '14px', color: '#9ca3af' }}>→</span>
                          <span style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>{ride.endLocation}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={statusBadgeStyle(ride.status)}>
                            {status.icon} {status.label}
                          </span>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            {new Date(ride.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: '20px', color: '#9ca3af' }}>›</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => history.push('/safety')}
        style={sosButtonStyle}
      >
        🚨
      </button>
    </div>
  );
};

export default HomePage;
