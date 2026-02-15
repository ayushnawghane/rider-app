import { useState, useEffect } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';

const ProfilePage = () => {
  const { user, refreshUser, logout, isClerkLoaded } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [language, setLanguage] = useState(user?.language || 'en');
  const [notifications, setNotifications] = useState<boolean>(user?.notificationPreferences || true);
  const history = useHistory();

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setLanguage(user.language);
      setNotifications(user.notificationPreferences);
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    if (user) {
      await authService.updateProfile({
        fullName,
        language,
        notificationPreferences: notifications,
      }, user.id);
      await refreshUser();
    }
    setEditing(false);
    setLoading(false);
  };

  const handleLogout = async () => {
    await logout();
    history.replace('/login');
  };

  const getKycStatus = (status: string) => {
    const statusMap: Record<string, { icon: string; color: string; bgColor: string; label: string }> = {
      approved: { icon: '✓', color: '#16a34a', bgColor: '#f0fdf4', label: 'Verified' },
      pending: { icon: '⏳', color: '#d97706', bgColor: '#fef3c7', label: 'Pending' },
      rejected: { icon: '✕', color: '#dc2626', bgColor: '#fef2f2', label: 'Rejected' },
    };
    return statusMap[status] || statusMap.pending;
  };

  const containerStyle: React.CSSProperties = {
    height: '100vh',
    overflow: 'auto',
    background: '#f9fafb',
    padding: '16px',
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

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0
  };

  const editButtonStyle: React.CSSProperties = {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'white',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  };

  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '16px'
  };

  const avatarStyle: React.CSSProperties = {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '32px',
    fontWeight: '700',
    position: 'relative'
  };

  const cameraButtonStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '32px',
    height: '32px',
    background: '#6366f1',
    borderRadius: '8px',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '16px'
  };

  const kycBadgeStyle = (status: string): React.CSSProperties => {
    const statusInfo = getKycStatus(status);
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      borderRadius: '20px',
      background: statusInfo.bgColor,
      color: statusInfo.color,
      fontSize: '13px',
      fontWeight: '600'
    };
  };

  const infoRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6'
  };

  const listItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid #f3f4f6',
    cursor: 'pointer',
    textAlign: 'left'
  };

  const listItemIconStyle = (bgColor: string): React.CSSProperties => ({
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: bgColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    flexShrink: 0
  });

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    background: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    fontSize: '16px',
    outline: 'none',
    marginTop: '8px'
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
    marginTop: '16px'
  };

  const secondaryButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px 24px',
    background: '#fef2f2',
    color: '#dc2626',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    marginTop: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  };

  const skeletonStyle: React.CSSProperties = {
    background: '#e5e7eb',
    borderRadius: '8px',
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
  };

  const toggleStyle = (enabled: boolean): React.CSSProperties => ({
    width: '48px',
    height: '24px',
    borderRadius: '12px',
    background: enabled ? '#6366f1' : '#d1d5db',
    position: 'relative',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s'
  });

  const toggleKnobStyle = (enabled: boolean): React.CSSProperties => ({
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'white',
    position: 'absolute',
    top: '2px',
    left: enabled ? '26px' : '2px',
    transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  });

  if (!isClerkLoaded) {
    return (
      <div style={containerStyle}>
        <div style={contentStyle}>
          <div style={{ paddingTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ ...skeletonStyle, width: '80px', height: '80px', borderRadius: '50%' }} />
              <div>
                <div style={{ ...skeletonStyle, height: '24px', width: '120px', marginBottom: '8px' }} />
                <div style={{ ...skeletonStyle, height: '16px', width: '180px' }} />
              </div>
            </div>
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

  if (!user) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb'
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  const kycStatus = getKycStatus(user.kycStatus);

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>Profile</h1>
          <button
            onClick={() => setEditing(!editing)}
            style={editButtonStyle}
          >
            <span>✏️</span>
          </button>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
            <div style={avatarStyle}>
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
              {editing && (
                <button style={cameraButtonStyle}>📷</button>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', margin: '0 0 4px 0' }}>
                {user.fullName}
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 12px 0' }}>{user.email}</p>
              <span style={kycBadgeStyle(user.kycStatus)}>
                {kycStatus.icon} KYC: {kycStatus.label}
              </span>
            </div>
          </div>

          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #f3f4f6' }}>
            <div style={infoRowStyle}>
              <span style={{ fontSize: '20px' }}>📱</span>
              <span style={{ fontSize: '14px', color: '#4b5563' }}>{user.phone || 'Not provided'}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={{ fontSize: '20px' }}>🌐</span>
              <span style={{ fontSize: '14px', color: '#4b5563' }}>{language === 'en' ? 'English' : language}</span>
            </div>
            <div style={{ ...infoRowStyle, borderBottom: 'none' }}>
              <span style={{ fontSize: '20px' }}>🔔</span>
              <span style={{ fontSize: '14px', color: '#4b5563' }}>
                {notifications ? 'Notifications Enabled' : 'Notifications Disabled'}
              </span>
            </div>
          </div>
        </div>

        {editing && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: '0 0 16px 0' }}>
              Edit Profile
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={inputStyle}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={inputStyle}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                background: '#f9fafb',
                borderRadius: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>🔔</span>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Push Notifications</span>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  style={toggleStyle(notifications)}
                >
                  <span style={toggleKnobStyle(notifications)} />
                </button>
              </div>

              <button
                onClick={handleSave}
                disabled={loading}
                style={{
                  ...primaryButtonStyle,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        <div style={cardStyle}>
          <button
            onClick={() => history.push('/profile/kyc')}
            style={listItemStyle}
          >
            <div style={listItemIconStyle('#e0e7ff')}>📄</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937', margin: '0 0 2px 0' }}>
                KYC Verification
              </p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{kycStatus.label}</p>
            </div>
            <span style={{ fontSize: '20px', color: '#9ca3af' }}>›</span>
          </button>

          <button
            onClick={() => history.push('/safety')}
            style={listItemStyle}
          >
            <div style={listItemIconStyle('#dcfce7')}>🛡️</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937', margin: '0 0 2px 0' }}>
                Safety Center
              </p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>SOS & emergency features</p>
            </div>
            <span style={{ fontSize: '20px', color: '#9ca3af' }}>›</span>
          </button>

          <button style={{ ...listItemStyle, borderBottom: 'none' }}>
            <div style={listItemIconStyle('#f3f4f6')}>⚙️</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937', margin: '0 0 2px 0' }}>
                Settings
              </p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>App preferences</p>
            </div>
            <span style={{ fontSize: '20px', color: '#9ca3af' }}>›</span>
          </button>
        </div>

        <button
          onClick={handleLogout}
          style={secondaryButtonStyle}
        >
          <span>🚪</span>
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
