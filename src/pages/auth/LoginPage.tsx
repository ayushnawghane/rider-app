import { useState, useEffect } from 'react';
import { useHistory } from 'react-router';
import { SignIn } from '@clerk/clerk-react';
import { useAuth } from '../../context/AuthContext';

const LoginPage = () => {
  const [showClerkSignIn, setShowClerkSignIn] = useState(false);
  const { user, isClerkLoaded } = useAuth();
  const history = useHistory();

  useEffect(() => {
    if (isClerkLoaded && user) {
      history.replace('/home');
    }
  }, [isClerkLoaded, user, history]);

  const containerStyle: React.CSSProperties = {
    height: '100vh',
    overflow: 'auto',
    background: '#f9fafb',
    WebkitOverflowScrolling: 'touch'
  };

  const contentStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '24px 16px'
  };

  const backButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '16px',
    left: '16px',
    background: 'transparent',
    border: 'none',
    padding: '12px',
    cursor: 'pointer',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const logoContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '32px'
  };

  const logoStyle: React.CSSProperties = {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    borderRadius: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 25px rgba(99, 102, 241, 0.3)'
  };

  const logoTextStyle: React.CSSProperties = {
    color: 'white',
    fontSize: '32px',
    fontWeight: '700'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    margin: '0 0 8px 0'
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '16px',
    color: '#6b7280',
    textAlign: 'center',
    margin: '0 0 32px 0'
  };

  const buttonBaseStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px 24px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px'
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    background: '#6366f1',
    color: 'white',
    boxShadow: '0 4px 6px rgba(99, 102, 241, 0.2)'
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    background: 'white',
    color: '#374151',
    border: '1px solid #e5e7eb'
  };

  const dividerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    margin: '24px 0'
  };

  const dividerLineStyle: React.CSSProperties = {
    flex: 1,
    height: '1px',
    background: '#e5e7eb'
  };

  const dividerTextStyle: React.CSSProperties = {
    padding: '0 16px',
    color: '#9ca3af',
    fontSize: '14px'
  };

  const footerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginTop: '32px'
  };

  const footerTextStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280'
  };

  const footerLinkStyle: React.CSSProperties = {
    color: '#6366f1',
    fontWeight: '600',
    textDecoration: 'none',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0
  };

  const securityBadgeStyle: React.CSSProperties = {
    background: '#dbeafe',
    border: '1px solid #bfdbfe',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginTop: '32px'
  };

  const securityIconStyle: React.CSSProperties = {
    fontSize: '20px'
  };

  const securityTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e40af',
    margin: '0 0 4px 0'
  };

  const securityTextStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#3b82f6',
    margin: 0
  };

  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  };

  return (
    <div style={containerStyle}>
      {!showClerkSignIn ? (
        <div style={contentStyle}>
          <button 
            onClick={() => history.goBack()}
            style={backButtonStyle}
          >
            <span style={{ fontSize: '24px' }}>←</span>
          </button>

          <div style={{ maxWidth: '360px', width: '100%', margin: '0 auto' }}>
            <div style={logoContainerStyle}>
              <div style={logoStyle}>
                <span style={logoTextStyle}>R</span>
              </div>
            </div>

            <h1 style={titleStyle}>Welcome Back</h1>
            <p style={subtitleStyle}>Sign in to continue to RiderApp</p>

            <button
              onClick={() => setShowClerkSignIn(true)}
              style={primaryButtonStyle}
            >
              <span>✉️</span>
              Sign In with Email or Phone
            </button>

            <div style={dividerStyle}>
              <div style={dividerLineStyle} />
              <span style={dividerTextStyle}>or continue with</span>
              <div style={dividerLineStyle} />
            </div>

            <button style={secondaryButtonStyle}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>

            <button style={{ ...secondaryButtonStyle, marginTop: '12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.21-1.96 1.07-3.11-1.05.05-2.31.74-3.02 1.61-.69.84-1.22 2.04-1.07 3.11 1.17.09 2.36-.85 3.02-1.61z" />
              </svg>
              Apple
            </button>

            <div style={footerStyle}>
              <p style={footerTextStyle}>
                Don't have an account?{' '}
                <button 
                  onClick={() => history.push('/register')}
                  style={footerLinkStyle}
                >
                  Sign up
                </button>
              </p>
            </div>

            <div style={securityBadgeStyle}>
              <span style={securityIconStyle}>✅</span>
              <div>
                <p style={securityTitleStyle}>Secure Authentication</p>
                <p style={securityTextStyle}>Your data is protected with end-to-end encryption</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={contentStyle}>
          <div style={{ maxWidth: '360px', width: '100%', margin: '0 auto' }}>
            <button
              onClick={() => setShowClerkSignIn(false)}
              style={{
                ...backButtonStyle,
                position: 'static',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#6b7280'
              }}
            >
              <span style={{ fontSize: '20px' }}>←</span>
              <span>Back</span>
            </button>

            <div style={cardStyle}>
              <SignIn
                afterSignInUrl="/home"
                afterSignUpUrl="/home"
                appearance={{
                  elements: {
                    rootBox: { width: '100%' },
                    card: { boxShadow: 'none', border: 'none' },
                    headerTitle: { fontSize: '24px', fontWeight: '700', color: '#1f2937' },
                    headerSubtitle: { color: '#6b7280', marginTop: '8px' },
                    formButtonPrimary: { 
                      background: '#6366f1',
                      borderRadius: '12px',
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: '600'
                    },
                    formFieldLabel: { color: '#374151', fontWeight: '500' },
                    footerActionLink: { color: '#6366f1' },
                    socialButtonsBlockButton: { borderRadius: '12px' },
                    dividerText: { color: '#9ca3af' },
                    formFieldInput: { 
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      padding: '12px 16px'
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
