import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { deleteAccount, updateDisplayName, useUser } from '../../auth/session';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Field, Input } from '../../components/Field';
import { CenterContainer, Page } from '../../components/layout';
import { H1, H2, Text } from '../../components/Text';
import { toastService } from '../../state/toast';
import { colors } from '../../theme';

const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 40;

/** A member's account: their display name, and deleting the account. */
export function AccountScreen() {
  const router = useRouter();
  const user = useUser();
  const [saved, setSaved] = useState(user?.displayName ?? '');
  const [displayName, setDisplayName] = useState(saved);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const trimmedLength = displayName.trim().length;
  const invalid = trimmedLength < DISPLAY_NAME_MIN_LENGTH || displayName.length > DISPLAY_NAME_MAX_LENGTH;
  // Like mat-error, the error waits until the field has been left so it doesn't flash while typing
  const showError = invalid && touched;
  const pristine = displayName === saved;

  const save = async () => {
    if (saving || invalid) {
      return;
    }
    setSaving(true);
    try {
      const updated = await updateDisplayName(displayName.trim());
      setSaved(updated.displayName);
      setDisplayName(updated.displayName);
      setTouched(false);
      toastService.success('Your display name was updated.');
    } catch {
      toastService.error('Your display name could not be updated.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteAccount();
      toastService.success('Your account was deleted.');
      router.replace('/home');
    } catch {
      setDeleting(false);
      toastService.error('Your account could not be deleted.');
    }
  };

  return (
    <Page>
      <CenterContainer>
        <View style={styles.card}>
          <View style={styles.heading}>
            {user?.avatarUrl ? <Avatar uri={user.avatarUrl} size={48} style={styles.avatar} /> : null}
            <H1>Your Account</H1>
          </View>

          <Field
            label="Display name"
            error={showError ? `Use ${DISPLAY_NAME_MIN_LENGTH} to ${DISPLAY_NAME_MAX_LENGTH} characters.` : undefined}
            hint="Shown next to your comments and recommendations."
          >
            <Input
              icon="badge"
              value={displayName}
              onChangeText={setDisplayName}
              onBlur={() => setTouched(true)}
              onSubmitEditing={save}
              maxLength={DISPLAY_NAME_MAX_LENGTH}
              autoComplete="nickname"
              accessibilityLabel="Display name"
              invalid={showError}
              returnKeyType="done"
            />
          </Field>
          <Button style={styles.fullWidth} disabled={invalid || pristine} loading={saving} onPress={save}>Save</Button>

          <H2 style={styles.deleteHeading}>Delete account</H2>
          <Text style={styles.body}>This removes your account. You can sign in again later to create a new one.</Text>
          <Button variant="delete" style={[styles.fullWidth, styles.deleteButton]} loading={deleting} onPress={remove}>
            {confirmingDelete ? 'Click again to delete your account' : 'Delete my account'}
          </Button>
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
    padding: 16,
    marginTop: 24,
    borderWidth: 2,
    borderColor: colors.gray200,
    backgroundColor: colors.dvLightGray
  },
  heading: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { marginRight: 12 },
  fullWidth: { width: '100%', marginTop: 16 },
  deleteHeading: { marginTop: 32, marginBottom: 8 },
  body: { fontSize: 16, color: colors.text, marginBottom: 12 },
  deleteButton: { marginTop: 0 }
});
