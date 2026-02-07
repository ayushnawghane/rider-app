import { IonContent, IonPage } from '@ionic/react';
import { useState, useEffect } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { UserButton } from '@clerk/clerk-react';
import { authService } from '../../services';
import { Phone, Mail, FileText, Shield, Settings, LogOut, Camera, CheckCircle2, Clock2, XCircle, User as UserIcon, Globe, Bell, ChevronRight, Edit3 } from 'lucide-react';

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
    const statusMap = {
      approved: { icon: CheckCircle2, color: 'text-success-600', bgColor: 'bg-success-100', label: 'Verified' },
      pending: { icon: Clock2, color: 'text-warning-600', bgColor: 'bg-warning-100', label: 'Pending' },
      rejected: { icon: XCircle, color: 'text-danger-600', bgColor: 'bg-danger-100', label: 'Rejected' },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  if (!isClerkLoaded) {
    return (
      <IonPage>
        <IonContent className="ion-padding bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="flex items-center gap-4 animate-pulse">
              <div className="w-24 h-24 bg-gray-200 rounded-full" />
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 rounded w-32" />
                <div className="h-4 bg-gray-200 rounded w-48" />
              </div>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!user) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  const kycStatus = getKycStatus(user.kycStatus);

  return (
    <IonPage>
      <IonContent className="ion-padding bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            <button
              onClick={() => setEditing(!editing)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Edit3 className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <div className="card p-6 mb-6 animate-fade-in">
            <div className="flex items-start gap-6">
              <div className="relative">
                <div className="avatar avatar-lg avatar-primary">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                {editing && (
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center shadow-medium">
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>

              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-1">{user.fullName}</h2>
                <p className="text-gray-500 mb-3">{user.email}</p>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg inline-flex ${kycStatus.bgColor}`}>
                  <kycStatus.icon className={`w-4 h-4 ${kycStatus.color}`} />
                  <span className={`text-sm font-medium ${kycStatus.color}`}>KYC: {kycStatus.label}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">{user.phone || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700 capitalize">{language === 'en' ? 'English' : language}</span>
              </div>
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">{notifications ? 'Notifications Enabled' : 'Notifications Disabled'}</span>
              </div>
            </div>
          </div>

          {editing && (
            <div className="card p-6 mb-6 animate-slide-up">
              <h3 className="font-semibold text-gray-900 mb-4">Edit Profile</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="input"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>

                <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700 font-medium">Push Notifications</span>
                  </div>
                  <button
                    onClick={() => setNotifications(!notifications)}
                    className={`w-12 h-6 rounded-full transition-colors ${notifications ? 'bg-primary-500' : 'bg-gray-300'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${notifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full btn btn-primary"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          <div className="card divide-y divide-gray-100 animate-fade-in">
            <button
              onClick={() => history.push('/profile/kyc')}
              className="w-full list-item flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">KYC Verification</p>
                <p className="text-sm text-gray-500">{kycStatus.label}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => history.push('/safety')}
              className="w-full list-item flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-success-100 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-success-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Safety Center</p>
                <p className="text-sm text-gray-500">SOS & emergency features</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <button className="w-full list-item flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <Settings className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Settings</p>
                <p className="text-sm text-gray-500">App preferences</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full btn btn-secondary mt-6 flex items-center justify-center gap-3 text-danger-600 hover:text-danger-700"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ProfilePage;
