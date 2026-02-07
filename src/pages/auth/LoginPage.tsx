import { IonContent, IonPage, IonIcon } from '@ionic/react';
import { useState, useEffect } from 'react';
import { useHistory } from 'react-router';
import { SignIn } from '@clerk/clerk-react';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Mail, Lock, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

const LoginPage = () => {
  const [showClerkSignIn, setShowClerkSignIn] = useState(false);
  const { user, isClerkLoaded } = useAuth();
  const history = useHistory();

  useEffect(() => {
    if (isClerkLoaded && user) {
      history.replace('/home');
    }
  }, [isClerkLoaded, user, history]);

  return (
    <IonPage>
      <IonContent className="ion-padding bg-gray-50">
        <div className="min-h-screen flex flex-col">
          {!showClerkSignIn ? (
            <div className="flex-1 flex flex-col justify-center px-4 animate-fade-in">
              <button
                onClick={() => history.goBack()}
                className="absolute top-4 left-4 p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>

              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl mb-6 shadow-medium">
                  <span className="text-white text-3xl font-bold">R</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
                <p className="text-gray-500">Sign in to continue to RiderApp</p>
              </div>

              <div className="space-y-3 max-w-md mx-auto w-full">
                <button
                  onClick={() => setShowClerkSignIn(true)}
                  className="w-full btn btn-primary flex items-center justify-center gap-3 py-4"
                >
                  <Mail className="w-5 h-5" />
                  Sign In with Email or Phone
                </button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 bg-gray-50 text-sm text-gray-500">or continue with</span>
                  </div>
                </div>

                <button className="w-full btn btn-secondary flex items-center justify-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </button>

                <button className="w-full btn btn-secondary flex items-center justify-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.21-1.96 1.07-3.11-1.05.05-2.31.74-3.02 1.61-.69.84-1.22 2.04-1.07 3.11 1.17.09 2.36-.85 3.02-1.61z" />
                  </svg>
                  Apple
                </button>
              </div>

              <div className="mt-8 text-center">
                <p className="text-gray-500">
                  Don't have an account?{' '}
                  <button onClick={() => history.push('/register')} className="text-primary-600 font-medium hover:text-primary-700">
                    Sign up
                  </button>
                </p>
              </div>

              <div className="mt-12 max-w-md mx-auto">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Secure Authentication</p>
                    <p className="text-sm text-blue-700 mt-1">Your data is protected with end-to-end encryption</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center px-4 animate-slide-up">
              <div className="max-w-md mx-auto w-full">
                <button
                  onClick={() => setShowClerkSignIn(false)}
                  className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>

                <div className="card p-6">
                  <SignIn
                    afterSignInUrl="/home"
                    afterSignUpUrl="/home"
                    appearance={{
                      elements: {
                        rootBox: 'clerk-root-box',
                        card: 'clerk-card-box',
                        headerTitle: 'text-2xl font-bold text-gray-900',
                        headerSubtitle: 'text-gray-500 mt-2',
                        formButtonPrimary: 'btn btn-primary py-4 text-base',
                        formFieldLabel: 'clerk-form-label',
                        footerActionLink: 'clerk-footer-link',
                        socialButtonsBlockButton: 'btn btn-secondary',
                        dividerText: 'text-sm text-gray-500',
                        formFieldInput: 'input',
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default LoginPage;
