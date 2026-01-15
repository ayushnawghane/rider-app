import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonInput, IonItem, IonLabel, IonLoading, IonText, IonCard, IonCardContent, IonIcon, IonSelect, IonSelectOption } from '@ionic/react';
import { useState, useEffect } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { cameraOutline, chevronBackOutline } from 'ionicons/icons';

const KycUploadPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { user, refreshUser } = useAuth();
  const history = useHistory();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      
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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButton slot="start" fill="clear" onClick={() => history.goBack()}>
            <IonIcon icon={chevronBackOutline} />
          </IonButton>
          <IonTitle>KYC Verification</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardContent>
            <h2 style={{ textAlign: 'center', marginBottom: '16px' }}>Upload KYC Document</h2>
            
            <p style={{ marginBottom: '16px', color: '#666' }}>
              Please upload a valid government-issued ID for verification. Accepted formats: JPEG, PNG, PDF (max 5MB).
            </p>

            {user?.kycStatus === 'pending' && (
              <IonText color="warning">
                <p>Your KYC is currently under review. Please wait for approval.</p>
              </IonText>
            )}

            {user?.kycStatus === 'approved' && (
              <IonText color="success">
                <p>Your KYC has been approved.</p>
              </IonText>
            )}

            {user?.kycStatus === 'rejected' && (
              <IonText color="danger">
                <p>Your KYC was rejected. Please upload a valid document.</p>
              </IonText>
            )}

            {!success ? (
              <>
                <div style={{ border: '2px dashed #ccc', padding: '20px', textAlign: 'center', marginTop: '16px' }}>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                    <IonIcon icon={cameraOutline} style={{ fontSize: '48px', color: '#666' }} />
                    <p>{file ? file.name : 'Tap to upload document'}</p>
                  </label>
                </div>

                {file && (
                  <IonButton
                    expand="block"
                    onClick={handleUpload}
                    disabled={loading}
                    style={{ marginTop: '16px' }}
                  >
                    {loading ? 'Uploading...' : 'Upload Document'}
                  </IonButton>
                )}
              </>
            ) : (
              <IonText color="success">
                <p style={{ textAlign: 'center', marginTop: '16px' }}>
                  Document uploaded successfully! Your KYC is now pending review.
                </p>
                <IonButton
                  expand="block"
                  onClick={() => history.replace('/profile')}
                  style={{ marginTop: '16px' }}
                >
                  Go to Profile
                </IonButton>
              </IonText>
            )}
            
            {error && <IonText color="danger"><p>{error}</p></IonText>}
          </IonCardContent>
        </IonCard>
      </IonContent>
      <IonLoading isOpen={loading} message="Uploading..." />
    </IonPage>
  );
};

export default KycUploadPage;
