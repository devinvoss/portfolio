import { Redirect } from 'expo-router';
import { ReactNode, useEffect } from 'react';
import { loadSession, useSession } from '../auth/session';
import { loginHref, useCurrentPath } from '../hooks/use-current-path';
import { SkeletonLoader } from './SkeletonLoader';
import { CenterContainer } from './layout';

type Requirement = 'signedIn' | 'member';

/**
 * ng-portfolio's route guards. signedIn: anyone signed in, else the sign-in page.
 * member: a signed-in member; the admin goes home, everyone else to the sign-in page.
 */
export function Guard({ require, children }: { require: Requirement; children: ReactNode }) {
  const { user, ready } = useSession();
  const path = useCurrentPath();

  useEffect(() => {
    loadSession();
  }, []);

  if (!ready) {
    return (
      <CenterContainer>
        <SkeletonLoader />
      </CenterContainer>
    );
  }
  if (!user) {
    return <Redirect href={loginHref(path)} />;
  }
  if (require === 'member' && user.role !== 'member') {
    return <Redirect href="/home" />;
  }
  return children;
}
