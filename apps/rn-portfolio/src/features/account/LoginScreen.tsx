import { SsoProvider } from '@portfolio/models';
import { useQuery } from '@tanstack/react-query';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { authApi } from '../../api/endpoints';
import { createPkce, Pkce, signIn } from '../../auth/sign-in';
import { setSignInPending } from '../../auth/sign-in-pending';
import { GithubIcon, GoogleIcon } from '../../components/brand-icons';
import { Button } from '../../components/Button';
import { CenterContainer, Page } from '../../components/layout';
import { H1, Text } from '../../components/Text';
import { colors } from '../../theme';

const PROVIDER_NAMES: Record<SsoProvider, string> = {
  google: 'Google',
  github: 'GitHub'
};

const ERROR_MESSAGES: Record<string, string> = {
  cancelled: 'Sign-in was cancelled.',
  suspended: 'This account has been suspended.',
  failed: 'Sign-in failed. Please try again.'
};

/** Only paths inside the app, and never back to this page. */
function safeReturnTo(value: string | undefined): string {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/login') ? value : '/';
}

/** The sign-in page: Google or GitHub. */
export function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string; error?: string }>();
  const providers = useQuery({ queryKey: ['providers'], queryFn: authApi.providers, retry: false });
  const [error, setError] = useState(params.error ?? '');
  const [busy, setBusy] = useState<SsoProvider | null>(null);
  const [pkce, setPkce] = useState<Pkce | null>(null);

  // Ready before the tap, so the browser opens right away
  useEffect(() => {
    createPkce().then(setPkce);
  }, []);

  const start = async (provider: SsoProvider) => {
    if (!pkce || busy) {
      return;
    }
    setBusy(provider);
    setError('');
    setSignInPending(true);
    try {
      const result = await signIn(provider, pkce);
      if (result.type === 'success') {
        router.replace(safeReturnTo(params.returnTo) as Href);
        return;
      }
      setError(result.type === 'error' ? result.error : 'cancelled');
    } finally {
      setSignInPending(false);
      setBusy(null);
      // A PKCE pair is only good for one sign-in
      createPkce().then(setPkce);
    }
  };

  const errorMessage = ERROR_MESSAGES[error] ?? '';

  return (
    <Page>
      <CenterContainer>
        <View style={styles.card}>
          <H1>Sign In</H1>
          <Text style={styles.body}>Sign in to comment on movies and leave recommendations.</Text>
          {errorMessage ? <Text style={styles.error} accessibilityRole="alert">{errorMessage}</Text> : null}
          {providers.data && (providers.data.length ? providers.data.map(provider => (
            <Button
              key={provider}
              style={styles.provider}
              contentStyle={styles.providerContent}
              loading={busy === provider}
              disabled={!pkce}
              onPress={() => start(provider)}
            >
              <View style={styles.providerIcon}>
                {provider === 'google' ? (
                  // Google's dark-button style: the color G on a white circle
                  <View style={styles.googleCircle}><GoogleIcon size={18} /></View>
                ) : (
                  <GithubIcon size={24} />
                )}
              </View>
              <Text weight="medium" style={styles.providerLabel}>Continue with {PROVIDER_NAMES[provider]}</Text>
            </Button>
          )) : (
            <Text style={styles.body}>Sign-in isn&apos;t available right now.</Text>
          ))}
          {providers.isError && <Text style={styles.body}>Sign-in isn&apos;t available right now.</Text>}
        </View>
      </CenterContainer>
    </Page>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 576,
    alignSelf: 'center',
    gap: 12,
    padding: 16,
    marginTop: 24,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.gray200
  },
  body: { fontSize: 16, color: colors.text },
  error: { fontSize: 16, color: colors.red700 },
  provider: { width: '100%' },
  providerContent: { paddingVertical: 12 },
  providerIcon: { position: 'absolute', left: 8, top: 0, bottom: 0, justifyContent: 'center' },
  googleCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  providerLabel: { color: colors.white, fontSize: 16, lineHeight: 24 }
});
