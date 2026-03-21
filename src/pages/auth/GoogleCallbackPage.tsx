import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { authClient } from '../../lib/authClient';

const GoogleCallbackPage = () => {
    const history = useHistory();
    const location = useLocation();
    const { refreshUser } = useAuth();
    const [status, setStatus] = useState('Verifying your Google sign-in...');

    useEffect(() => {
        const handleGoogleCallback = async () => {
            try {
                // 1. Better Auth session should be set now (cookies)
                const { data: sessionData, error } = await authClient.getSession();

                if (error || !sessionData?.user) {
                    throw new Error(error?.message || 'No Better Auth session found');
                }

                setStatus('Linking your Supabase profile...');

                // 2. We need to tell Supabase we logged in. Since our backend mirror
                // creates a Supabase user with the same email, we can try to "sign in via OTP"
                // purely to generate a Supabase token, or if we built a custom JWT flow
                // For minimal invasiveness and security, we can use Supabase's 'signInWithOtp'
                // But since we just want a session without email clicking, the BEST way
                // is for our server to issue a custom token or we just trigger Supabase OAuth.

                // *WAIT* - The most resilient way that requires zero backend Supabase admin
                // wrestling is to just use standard Supabase Google OAuth natively,
                // which completely bypasses the need for Better Auth at all for Google!

                // BUT, since we implemented Better Auth for Google, we need a session.
                // Let's call a custom endpoint on our server to get a Supabase custom token.
                setStatus('Ready!');

                // We will implement the custom token bridge next.
                // For now, redirect to home.
                history.replace('/home');

            } catch (err: any) {
                console.error('Google Auth Error:', err);
                setStatus(`Sign-in failed: ${err.message}`);
                setTimeout(() => history.replace('/login'), 3000);
            }
        };

        handleGoogleCallback();
    }, [history, location]);

    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }} />
                <p style={{ color: '#64748b' }}>{status}</p>
            </div>
            <style>{`
        .spinner {
          width: 40px; height: 40px;
          border: 3px solid #e2e8f0; border-top-color: #f97316;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
};

export default GoogleCallbackPage;
