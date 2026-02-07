import { IonContent, IonPage } from '@ionic/react';
import { useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Upload, FileText, ArrowLeft, CheckCircle2, AlertCircle, Clock2, XCircle, FileImage, File, CheckCircle } from 'lucide-react';

const KycUploadPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { user, refreshUser } = useAuth();
  const history = useHistory();

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
      pending: { icon: Clock2, color: 'text-warning-600', bgColor: 'bg-warning-50', borderColor: 'border-warning-200', label: 'Under Review' },
      approved: { icon: CheckCircle2, color: 'text-success-600', bgColor: 'bg-success-50', borderColor: 'border-success-200', label: 'Verified' },
      rejected: { icon: XCircle, color: 'text-danger-600', bgColor: 'bg-danger-50', borderColor: 'border-danger-200', label: 'Rejected' },
    };
    return statusMap[user.kycStatus as keyof typeof statusMap];
  };

  const kycStatus = getKycStatus();

  if (!user) return null;

  return (
    <IonPage>
      <IonContent className="ion-padding bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <header className="mb-6">
            <button
              onClick={() => history.goBack()}
              className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">KYC Verification</h1>
            <p className="text-gray-500 mt-1">Upload your government-issued ID</p>
          </header>

          <div className="space-y-6 pb-8">
            {kycStatus && !success && (
              <div className={`p-4 rounded-xl border ${kycStatus.bgColor} ${kycStatus.borderColor}`}>
                <div className="flex items-start gap-3">
                  <kycStatus.icon className={`w-6 h-6 ${kycStatus.color} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className={`font-medium ${kycStatus.color}`}>{kycStatus.label}</p>
                    <p className="text-sm text-gray-600 mt-1">
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
                <div className="card p-6">
                  <div className="mb-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Upload Document</h2>
                    <p className="text-gray-500 text-sm">
                      Accepted formats: JPEG, PNG, PDF (max 5MB). Please ensure the document is clear and readable.
                    </p>
                  </div>

                  <label
                    htmlFor="file-upload"
                    className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all
                      ${file ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'}
                    `}
                  >
                    <input
                      type="file"
                      id="file-upload"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors ${file ? 'bg-primary-500' : 'bg-gray-100'}`}>
                      {file ? (
                        <CheckCircle className="w-8 h-8 text-white" />
                      ) : (
                        <Upload className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <p className="font-medium text-gray-900 text-center mb-1">
                      {file ? file.name : 'Tap to upload document'}
                    </p>
                    <p className="text-sm text-gray-500 text-center">
                      {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'or drag and drop'}
                    </p>
                  </label>

                  {error && (
                    <div className="mt-4 p-4 bg-danger-50 border border-danger-200 rounded-xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-danger-900">{error}</p>
                    </div>
                  )}
                </div>

                <div className="card p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">Requirements</h2>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700">Government-issued ID (Passport, Driver's License, National ID)</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700">Document must be clear and readable</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700">All corners of the document should be visible</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700">File size: Maximum 5MB</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700">Format: JPEG, PNG, or PDF</p>
                    </div>
                  </div>
                </div>

                {user.kycStatus !== 'approved' && (
                  <button
                    onClick={handleUpload}
                    disabled={loading || !file}
                    className="w-full btn btn-primary py-4"
                  >
                    {loading ? 'Uploading...' : 'Upload Document'}
                  </button>
                )}
              </>
            ) : (
              <div className="card p-8 text-center animate-fade-in">
                <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-success-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Document Uploaded!</h2>
                <p className="text-gray-500 mb-6">Your KYC document has been uploaded successfully and is now under review.</p>
                <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 mb-6 text-left">
                  <div className="flex items-start gap-3">
                    <Clock2 className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-warning-900">Review Process</p>
                      <p className="text-sm text-warning-700 mt-1">
                        Your KYC verification typically takes 24-48 hours. You'll receive a notification once it's approved.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => history.replace('/profile')}
                  className="w-full btn btn-primary"
                >
                  Go to Profile
                </button>
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default KycUploadPage;
