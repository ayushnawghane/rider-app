import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import { AlertTriangle, ArrowLeft, Trash2, ShieldAlert } from 'lucide-react';
import { IonContent, IonPage } from '@ionic/react';

const DeleteAccountPage: React.FC = () => {
  const { user } = useAuth();
  const history = useHistory();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!user) return;
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      const result = await authService.deleteAccount(user.id);
      if (result.success) {
        // Redirection should happen after signout
        history.replace('/login');
      } else {
        setError(result.error || 'Failed to delete account');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
            {/* Header */}
            <div className="bg-rose-500 p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <ShieldAlert size={120} className="absolute -right-8 -bottom-8" />
              </div>
              <div className="relative z-10">
                <div className="mx-auto w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/30">
                  <Trash2 className="text-white" size={32} />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Delete Account</h1>
                <p className="text-rose-100 text-sm">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4 items-start p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">What happens when you delete your account?</p>
                    <ul className="list-disc ml-4 space-y-1">
                      <li>Your profile information will be removed.</li>
                      <li>Your ride history will be anonymized.</li>
                      <li>Pending ride requests will be cancelled.</li>
                      <li>You will lose all earned rewards and points.</li>
                    </ul>
                  </div>
                </div>

                {user ? (
                  <>
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600 text-center">
                        To confirm deletion, please type <span className="font-bold text-rose-600">DELETE</span> below.
                      </p>
                      <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                        placeholder="Type DELETE here"
                        className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-center font-bold tracking-widest text-slate-800 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                      />
                    </div>

                    {error && (
                      <p className="text-sm text-rose-600 text-center font-medium">{error}</p>
                    )}

                    <button
                      onClick={handleDelete}
                      disabled={isDeleting || confirmText !== 'DELETE'}
                      className="w-full py-4 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 text-white font-bold rounded-2xl shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2 group"
                    >
                      {isDeleting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Trash2 size={20} />
                          Delete My Account Forever
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="text-center space-y-4 py-4">
                    <p className="text-slate-600">You must be logged in to delete your account.</p>
                    <button
                      onClick={() => history.push('/login')}
                      className="px-6 py-2 bg-orange-500 text-white rounded-xl font-semibold shadow-lg shadow-orange-200"
                    >
                      Go to Login
                    </button>
                  </div>
                )}

                <button
                  onClick={() => history.goBack()}
                  className="w-full py-3 text-slate-500 font-medium hover:text-slate-800 transition flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={18} />
                  Nevermind, keep my account
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-slate-400 text-xs">
            <p>© 2024 BlinkCar. All rights reserved.</p>
            <p className="mt-1">For data portability requests, please contact support.</p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DeleteAccountPage;
