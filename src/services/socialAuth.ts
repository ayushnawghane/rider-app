import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type SocialProvider = 'google' | 'apple';

interface SocialAuthResult {
  success: boolean;
  /** Empty string means the user cancelled — callers should stay silent. */
  error?: string;
  cancelled?: boolean;
}

// Apple "Services ID" — used by the web OAuth flow. Native iOS uses the bundle id.
const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID?.trim();
const APPLE_REDIRECT_URL = import.meta.env.VITE_APPLE_REDIRECT_URL?.trim();

const isNative = Capacitor.isNativePlatform();

// Deep link the native OAuth browser returns to. Registered as scheme
// `com.blinkcar.app`, host `auth`, path `/callback` in Info.plist (iOS) and
// AndroidManifest.xml (Android). Must also be in Supabase's redirect allow-list.
const NATIVE_OAUTH_REDIRECT = 'com.blinkcar.app://auth/callback';

// Google goes through Supabase's web OAuth on every platform (system browser on
// native), so it needs no Google client id. Apple uses the native sheet on iOS
// and the web redirect elsewhere; it is hidden on Android.
export const isGoogleSignInAvailable = true;
export const isAppleSignInAvailable = Capacitor.getPlatform() !== 'android';

let appleInitPromise: Promise<void> | null = null;

const ensureAppleInitialized = () => {
  if (!isNative) return Promise.resolve();
  if (!appleInitPromise) {
    appleInitPromise = SocialLogin.initialize({
      apple: {
        clientId: APPLE_CLIENT_ID,
        redirectUrl: APPLE_REDIRECT_URL,
      },
    }).catch((error) => {
      appleInitPromise = null; // allow retry
      throw error;
    });
  }
  return appleInitPromise;
};

const isUserCancellation = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /cancel|canceled|cancelled|user closed|dismiss|popup_closed/i.test(message);
};

const extractIdToken = (result: unknown): string | null => {
  if (result && typeof result === 'object' && 'idToken' in result) {
    const token = (result as { idToken?: string | null }).idToken;
    return typeof token === 'string' && token.length > 0 ? token : null;
  }
  return null;
};

const parseCallback = (url: string): { code?: string; error?: string } => {
  const code = url.match(/[?&]code=([^&]+)/);
  if (code) return { code: decodeURIComponent(code[1]) };
  const err = url.match(/[?&]error(?:_description)?=([^&]+)/);
  if (err) return { error: decodeURIComponent(err[1].replace(/\+/g, ' ')) };
  return {};
};

// Web: full-page OAuth redirect. The browser navigates away and the session is
// completed on return via supabase's detectSessionInUrl.
const webOAuthRedirect = async (provider: SocialProvider): Promise<SocialAuthResult> => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/home` },
  });
  if (error) {
    return { success: false, error: error.message };
  }
  // Redirect is in flight; nothing more to do on this page.
  return { success: true };
};

// Native: open the OAuth page in the system browser, wait for the deep-link
// callback, then exchange the returned code for a session (PKCE).
const nativeOAuthViaBrowser = async (provider: SocialProvider): Promise<SocialAuthResult> => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: NATIVE_OAUTH_REDIRECT,
      skipBrowserRedirect: true,
    },
  });
  if (error) {
    return { success: false, error: error.message };
  }
  if (!data?.url) {
    return { success: false, error: 'Could not start sign-in. Please try again.' };
  }

  return new Promise<SocialAuthResult>((resolve) => {
    let settled = false;
    let gotCallback = false;
    let urlSub: PluginListenerHandle | undefined;
    let finishSub: PluginListenerHandle | undefined;

    const settle = (result: SocialAuthResult) => {
      if (settled) return;
      settled = true;
      urlSub?.remove();
      finishSub?.remove();
      resolve(result);
    };

    App.addListener('appUrlOpen', async ({ url }) => {
      if (!url.startsWith(NATIVE_OAUTH_REDIRECT)) return;
      gotCallback = true;
      await Browser.close().catch(() => undefined);

      const { code, error: callbackError } = parseCallback(url);
      if (callbackError) {
        settle({ success: false, error: callbackError });
        return;
      }
      if (!code) {
        settle({ success: false, error: 'Sign-in did not return a code. Please try again.' });
        return;
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      settle(
        exchangeError
          ? { success: false, error: exchangeError.message }
          : { success: true },
      );
    }).then((handle) => {
      urlSub = handle;
      if (settled) handle.remove();
    });

    // User dismissed the browser before completing → treat as a silent cancel.
    Browser.addListener('browserFinished', () => {
      if (!gotCallback) settle({ success: false, cancelled: true, error: '' });
    }).then((handle) => {
      finishSub = handle;
      if (settled) handle.remove();
    });

    Browser.open({ url: data.url }).catch((openError) => {
      settle({
        success: false,
        error: openError instanceof Error ? openError.message : 'Could not open the sign-in page.',
      });
    });
  });
};

const signInWithProvider = async (provider: SocialProvider): Promise<SocialAuthResult> => {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'App configuration is missing. Please install the latest build.' };
  }

  try {
    if (!isNative) {
      return await webOAuthRedirect(provider);
    }

    // Apple → native sheet on iOS for the best UX (exchange its ID token directly).
    if (provider === 'apple') {
      await ensureAppleInitialized();
      const response = await SocialLogin.login({
        provider: 'apple',
        options: { scopes: ['name', 'email'] },
      });
      const idToken = extractIdToken(response?.result);
      if (!idToken) {
        return { success: false, error: 'No identity token was returned. Please try again.' };
      }
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: idToken });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    }

    // Google → system-browser OAuth redirect (no Google client id required).
    return await nativeOAuthViaBrowser(provider);
  } catch (error) {
    if (isUserCancellation(error)) {
      return { success: false, cancelled: true, error: '' };
    }
    console.error(`Social sign-in (${provider}) failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sign-in failed. Please try again.',
    };
  }
};

export const socialAuthService = {
  signInWithGoogle: () => signInWithProvider('google'),
  signInWithApple: () => signInWithProvider('apple'),
};
