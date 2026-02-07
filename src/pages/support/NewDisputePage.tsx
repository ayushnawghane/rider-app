import { IonContent, IonPage } from '@ionic/react';
import { useState, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { disputeService } from '../../services';
import { ArrowLeft, MessageSquare, CheckCircle2, AlertCircle, Car, FileText, HelpCircle } from 'lucide-react';

const NewDisputePage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [disputeType, setDisputeType] = useState<'ride' | 'kyc' | 'other'>('ride');
  const [rideId, setRideId] = useState('');
  const [description, setDescription] = useState('');

  const history = useHistory();

  const queryParams = new URLSearchParams(location.search);
  const preselectedRideId = queryParams.get('rideId');

  useEffect(() => {
    if (preselectedRideId) {
      setRideId(preselectedRideId);
    }
  }, [preselectedRideId]);

  const handleSubmit = async () => {
    if (!description) {
      setError('Please provide a description');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError('');

    const result = await disputeService.createDispute({
      userId: user.id,
      rideId: rideId || undefined,
      disputeType,
      description,
    });

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Failed to create dispute');
    }

    setLoading(false);
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Raise Dispute</h1>
            <p className="text-gray-500 mt-1">Describe your issue in detail</p>
          </header>

          {!success ? (
            <div className="card p-6 space-y-6 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dispute Type</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setDisputeType('ride')}
                    className={`p-4 rounded-xl border-2 transition-all text-center
                      ${disputeType === 'ride'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <Car className={`w-6 h-6 mx-auto mb-2 ${disputeType === 'ride' ? 'text-primary-600' : 'text-gray-400'}`} />
                    <p className={`font-medium ${disputeType === 'ride' ? 'text-primary-900' : 'text-gray-700'}`}>Ride Issue</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisputeType('kyc')}
                    className={`p-4 rounded-xl border-2 transition-all text-center
                      ${disputeType === 'kyc'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <FileText className={`w-6 h-6 mx-auto mb-2 ${disputeType === 'kyc' ? 'text-primary-600' : 'text-gray-400'}`} />
                    <p className={`font-medium ${disputeType === 'kyc' ? 'text-primary-900' : 'text-gray-700'}`}>KYC Verification</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisputeType('other')}
                    className={`p-4 rounded-xl border-2 transition-all text-center
                      ${disputeType === 'other'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <HelpCircle className={`w-6 h-6 mx-auto mb-2 ${disputeType === 'other' ? 'text-primary-600' : 'text-gray-400'}`} />
                    <p className={`font-medium ${disputeType === 'other' ? 'text-primary-900' : 'text-gray-700'}`}>Other Issue</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe your issue in detail. Include any relevant information such as ride ID, date, and specific concerns..."
                  rows={6}
                  className="input resize-none"
                />
                <p className="text-sm text-gray-500 mt-2">{description.length} / 500 characters</p>
              </div>

              {error && (
                <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-danger-900">{error}</p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Tips for a good dispute</p>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                      <li>Be as specific as possible about the issue</li>
                      <li>Include relevant dates and times</li>
                      <li>Attach any supporting documents if available</li>
                      <li>Keep your tone professional and constructive</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full btn btn-primary py-4"
              >
                {loading ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          ) : (
            <div className="card p-8 text-center animate-fade-in">
              <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-success-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Dispute Submitted!</h2>
              <p className="text-gray-500 mb-6">Your dispute has been submitted successfully. Our support team will review it shortly and get back to you.</p>
              <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 mb-6 text-left">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-warning-900">What happens next?</p>
                    <p className="text-sm text-warning-700 mt-1">
                      You'll receive updates on your dispute status through notifications. Our team typically responds within 24-48 hours.
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => history.replace('/support')}
                className="w-full btn btn-primary"
              >
                View My Disputes
              </button>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default NewDisputePage;
