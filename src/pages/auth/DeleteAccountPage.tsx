import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services";
import { AlertTriangle, ArrowLeft, Trash2, ShieldAlert } from "lucide-react";
import { IonContent } from "@ionic/react";

const ALERT = 'linear-gradient(135deg, #FF3D00 0%, #D81E00 100%)';
const FIRE = 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))';

const DeleteAccountPage: React.FC = () => {
  const { user } = useAuth();
  const history = useHistory();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!user) return;
    if (confirmText !== "DELETE") {
      setError("Please type DELETE to confirm");
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      const result = await authService.deleteAccount(user.id);
      if (result.success) {
        // Redirection should happen after signout
        history.replace("/login");
      } else {
        setError(result.error || "Failed to delete account");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <IonContent>
      <div className="flex min-h-full flex-col items-center justify-center bg-white p-6">
        <div className="w-full max-w-md overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-strong">
          {/* Header */}
          <div className="relative overflow-hidden p-8 text-center" style={{ background: ALERT }}>
            <ShieldAlert size={120} className="absolute -bottom-8 -right-8 text-white/10" />
            <div className="relative z-10">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm">
                <Trash2 className="text-white" size={32} />
              </div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">Delete Account</h1>
              <p className="mt-2 text-sm font-medium text-white/90">
                This action is permanent and cannot be undone.
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6 p-8">
            <div className="space-y-4">
              <div className="flex items-start gap-4 rounded-2xl border border-fire-gold/30 bg-fire-gold/10 p-4">
                <AlertTriangle className="shrink-0 text-fire-orange" size={20} />
                <div className="text-sm text-[#7a4a00]">
                  <p className="mb-1 font-display font-bold">What happens when you delete your account?</p>
                  <ul className="ml-4 list-disc space-y-1 font-medium">
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
                    <p className="text-center text-sm font-medium text-ink/60">
                      To confirm deletion, please type{" "}
                      <span className="font-display font-bold text-fire-red">DELETE</span> below.
                    </p>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                      placeholder="Type DELETE here"
                      className="w-full rounded-2xl border-2 border-black/10 bg-paper px-4 py-3 text-center font-display font-bold tracking-widest text-ink outline-none transition focus:border-fire-red focus:ring-2 focus:ring-[rgba(216,30,0,0.15)]"
                    />
                  </div>

                  {error && (
                    <p className="text-center text-sm font-semibold text-fire-red">{error}</p>
                  )}

                  <button
                    onClick={handleDelete}
                    disabled={isDeleting || confirmText !== "DELETE"}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-display font-bold text-white shadow-strong transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ background: ALERT }}
                  >
                    {isDeleting ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        <Trash2 size={20} />
                        Delete My Account Forever
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="space-y-4 py-4 text-center">
                  <p className="font-medium text-ink/60">You must be logged in to delete your account.</p>
                  <button
                    onClick={() => history.push("/login")}
                    className="grain grain-strong relative overflow-hidden rounded-2xl px-6 py-2.5 font-display font-bold text-white shadow-glow"
                    style={{ background: FIRE }}
                  >
                    Go to Login
                  </button>
                </div>
              )}

              <button
                onClick={() => history.goBack()}
                className="flex w-full items-center justify-center gap-2 py-3 font-display font-bold text-ink/50 transition hover:text-ink"
              >
                <ArrowLeft size={18} />
                Nevermind, keep my account
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs font-medium text-ink/35">
          <p>© {new Date().getFullYear()} BlinkCar. All rights reserved.</p>
          <p className="mt-1">For data portability requests, please contact support.</p>
        </div>
      </div>
    </IonContent>
  );
};

export default DeleteAccountPage;
