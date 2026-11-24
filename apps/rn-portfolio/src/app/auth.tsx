import { Redirect } from 'expo-router';
import { isSignInPending } from '../auth/sign-in-pending';
import { CenterContainer } from '../components/layout';
import { SkeletonLoader } from '../components/SkeletonLoader';

/**
 * Where the API sends the browser back to after Google or GitHub. The sign-in page reads the code from
 * the browser session and moves on; this only shows if the link opens the app (Android) or the web popup.
 */
export default function AuthRedirect() {
  if (!isSignInPending()) {
    return <Redirect href="/home" />;
  }
  return (
    <CenterContainer>
      <SkeletonLoader />
    </CenterContainer>
  );
}
