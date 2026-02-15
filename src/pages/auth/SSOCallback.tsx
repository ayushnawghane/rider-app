import { useEffect } from 'react';
import { useHistory } from 'react-router';
import { AuthenticateWithRedirectCallback, useClerk } from '@clerk/clerk-react';
import LoadingOverlay from '../../components/LoadingOverlay';

const SSOCallback = () => {
  const history = useHistory();
  const { session } = useClerk();

  useEffect(() => {
    if (session) {
      history.replace('/home');
    }
  }, [session, history]);

  return (
    <>
      <AuthenticateWithRedirectCallback />
      <LoadingOverlay isOpen variant="fullscreen" message="Completing sign in..." />
    </>
  );
};

export default SSOCallback;
