import { IonContent, IonPage } from '@ionic/react';
import { useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Upload, CheckCircle2, AlertCircle, Clock2, XCircle, CheckCircle, ChevronLeft } from 'lucide-react';

const FIRE = 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))';

const KycUploadPage = () => {
  const history = useHistory();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { user, refreshUser } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Please upload a JPEG, PNG, or PDF file');
        return;
      }

      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file || !user) {
      setError('Please select a file to upload');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { authService } = await import('../../services');
      const result = await authService.uploadKycDocument({ file, userId: user.id });

      if (result.success) {
        setSuccess(true);
        await refreshUser();
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }

    setLoading(false);
  };

  const getKycStatus = () => {
    if (!user) return null;
    const statusMap = {
      pending: { icon: Clock2, color: 'text-[#9a5b00]', bgColor: 'bg-fire-gold/15', borderColor: 'border-fire-gold/30', label: 'Under Review' },
      approved: { icon: CheckCircle2, color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', label: 'Verified' },
      rejected: { icon: XCircle, color: 'text-fire-red', bgColor: 'bg-fire-red/5', borderColor: 'border-fire-red/20', label: 'Rejected' },
    };
    return statusMap[user.kycStatus as keyof typeof statusMap];
  };

  const kycStatus = getKycStatus();

  if (!user) return null;

  const requirements = [
    "Government-issued ID (Passport, Driver's License, National ID)",
    'Document must be clear and readable',
    'All corners of the document should be visible',
    'File size: Maximum 5MB',
    'Format: JPEG, PNG, or PDF',
  ];

  return (
    <IonPage>
      <IonContent>
        <div className="app-top-safe relative min-h-full overflow-hidden bg-white">
          {/* Grainy orange aura */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[300px]">
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(120% 72% at 82% -10%, rgba(255,107,0,0.4) 0%, rgba(255,160,30,0.15) 46%, rgba(255,255,255,0) 74%)' }}
            />
            <div className="absolute -right-16 -top-12 h-72 w-72 rounded-full animate-aurora-1" style={{ background: 'radial-gradient(circle, rgba(255,200,50,0.62) 0%, transparent 62%)', filter: 'blur(48px)' }} />
          </div>

          <div className="app-bottom-nav-safe relative z-10 mx-auto max-w-2xl px-4 pb-8 pt-5">
            {/* Header */}
            <div className="mb-4 flex items-center gap-3">
              <button
                onClick={() => history.goBack()}
                aria-label="Back"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white/70 text-ink shadow-soft backdrop-blur-sm transition active:scale-95"
              >
                <ChevronLeft size={22} strokeWidth={2.5} />
              </button>
              <div>
                <p className="mb-0.5 font-display text-xs font-bold uppercase tracking-[0.2em] text-fire-orange">Verification</p>
                <h1 className="font-display text-[2rem] font-extrabold leading-[0.9] tracking-tight text-ink">KYC verification</h1>
              </div>
            </div>

            <div className="space-y-5">
              {kycStatus && !success && (
                <div className={`rounded-2xl border p-4 ${kycStatus.bgColor} ${kycStatus.borderColor}`}>
                  <div className="flex items-start gap-3">
                    <kycStatus.icon className={`h-6 w-6 shrink-0 ${kycStatus.color}`} />
                    <div>
                      <p className={`font-display font-bold ${kycStatus.color}`}>{kycStatus.label}</p>
                      <p className="mt-1 text-sm font-medium text-ink/55">
                        {user.kycStatus === 'pending' && 'Your KYC is currently under review. This usually takes 24-48 hours.'}
                        {user.kycStatus === 'approved' && 'Your KYC has been verified successfully.'}
                        {user.kycStatus === 'rejected' && 'Your KYC was rejected. Please upload a valid document.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!success ? (
                <>
                  <div className="app-card">
                    <div className="mb-3">
                      <h2 className="mb-2 font-display text-lg font-extrabold tracking-tight text-ink">Upload document</h2>
                      <p className="text-sm font-medium text-ink/50">
                        Accepted formats: JPEG, PNG, PDF (max 5MB). Please ensure the document is clear and readable.
                      </p>
                    </div>

                    <label
                      htmlFor="file-upload"
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 transition-all ${
                        file ? 'border-primary-500 bg-primary-50' : 'border-black/15 hover:border-primary-400 hover:bg-paper'
                      }`}
                    >
                      <input
                        type="file"
                        id="file-upload"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div
                        className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${file ? '' : 'bg-paper-dim'}`}
                        style={file ? { background: FIRE } : undefined}
                      >
                        {file ? <CheckCircle className="h-8 w-8 text-white" /> : <Upload className="h-8 w-8 text-ink/35" />}
                      </div>
                      <p className="mb-1 text-center font-display font-bold text-ink">
                        {file ? file.name : 'Tap to upload document'}
                      </p>
                      <p className="text-center text-sm font-medium text-ink/45">
                        {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'or drag and drop'}
                      </p>
                    </label>

                    {error && (
                      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-fire-red/20 bg-fire-red/5 p-4">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-fire-red" />
                        <p className="text-sm font-medium text-fire-red">{error}</p>
                      </div>
                    )}
                  </div>

                  {user.kycStatus !== 'approved' && (
                    <div className="sticky bottom-4 z-20 rounded-[16px] border border-white/70 bg-white/90 p-2 shadow-soft backdrop-blur">
                      <button
                        onClick={handleUpload}
                        disabled={loading || !file}
                        className="grain grain-strong relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 font-display text-lg font-bold tracking-tight text-white shadow-glow transition-all active:scale-[0.98] disabled:opacity-70"
                        style={{ background: FIRE }}
                      >
                        <Upload className="h-5 w-5" />
                        {loading ? 'Uploading...' : file ? 'Upload Document' : 'Choose a document first'}
                      </button>
                    </div>
                  )}

                  <div className="app-card">
                    <h2 className="mb-4 font-display text-lg font-extrabold tracking-tight text-ink">Requirements</h2>
                    <div className="space-y-3">
                      {requirements.map((req) => (
                        <div key={req} className="flex items-start gap-3">
                          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-fire-orange" />
                          <p className="text-sm font-medium text-ink/70">{req}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="animate-fade-in rounded-[18px] border border-black/5 bg-white p-4 text-center shadow-soft">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                  </div>
                  <h2 className="mt-3 app-section-title">Document uploaded!</h2>
                  <p className="mt-2 text-sm font-medium text-ink/50">Your KYC document has been uploaded successfully and is now under review.</p>
                  <div className="mt-4 rounded-2xl border border-fire-gold/30 bg-fire-gold/10 p-4 text-left">
                    <div className="flex items-start gap-3">
                      <Clock2 className="mt-0.5 h-5 w-5 shrink-0 text-fire-orange" />
                      <div>
                        <p className="font-display font-bold text-[#7a4a00]">Review process</p>
                        <p className="mt-1 text-sm font-medium text-[#7a4a00]/80">
                          Your KYC verification typically takes 24-48 hours. You'll receive a notification once it's approved.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => history.replace('/profile')}
                    className="grain grain-strong relative mt-4 w-full overflow-hidden rounded-2xl py-3.5 font-display font-bold text-white shadow-glow transition active:scale-[0.98]"
                    style={{ background: FIRE }}
                  >
                    Go to Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default KycUploadPage;
