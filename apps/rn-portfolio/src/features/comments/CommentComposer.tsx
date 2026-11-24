import { COMMENT_MAX_LENGTH } from '@portfolio/models';
import { useState } from 'react';
import { StyleSheet, TextInputKeyPressEvent, View } from 'react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Field';
import { Text, textStyles } from '../../components/Text';
import { TextButton } from '../../components/TextButton';
import { colors } from '../../theme';

// The character count appears once a comment gets near the limit
const COUNTER_THRESHOLD = COMMENT_MAX_LENGTH - 200;

// react-native-web passes the modifier keys along with the key
type KeyPress = TextInputKeyPressEvent['nativeEvent'] & { ctrlKey?: boolean; metaKey?: boolean };

/**
 * A text box for writing a comment, reply or edit. Ctrl+Enter submits on the web.
 * onSubmit resolves true when the comment was saved, which empties the box.
 */
export function CommentComposer({
  label = 'Add a comment',
  placeholder = 'Add a comment...',
  submitLabel = 'Post',
  initialValue = '',
  busy = false,
  autoFocus = false,
  onSubmit,
  onCancel
}: {
  label?: string;
  placeholder?: string;
  submitLabel?: string;
  initialValue?: string;
  busy?: boolean;
  autoFocus?: boolean;
  onSubmit: (body: string) => Promise<boolean>;
  /** Shows a Cancel button */
  onCancel?: () => void;
}) {
  const [text, setText] = useState(initialValue);
  const canSubmit = !busy && text.trim().length > 0 && text !== initialValue;

  const submit = async () => {
    if (canSubmit && await onSubmit(text.trim())) {
      setText('');
    }
  };

  const onKeyPress = (event: TextInputKeyPressEvent) => {
    const { key, ctrlKey, metaKey } = event.nativeEvent as KeyPress;
    if (key === 'Enter' && (ctrlKey || metaKey)) {
      event.preventDefault();
      submit();
    } else if (key === 'Escape' && onCancel) {
      onCancel();
    }
  };

  return (
    <View>
      <Input
        dark
        multiline
        minRows={2}
        maxRows={12}
        accessibilityLabel={label}
        placeholder={placeholder}
        maxLength={COMMENT_MAX_LENGTH}
        value={text}
        onChangeText={setText}
        onKeyPress={onKeyPress}
        autoFocus={autoFocus}
      />
      <View style={styles.actions}>
        {text.length > COUNTER_THRESHOLD && (
          <Text style={[textStyles.fieldHint, styles.counter]} accessibilityLiveRegion="polite">{text.length} / {COMMENT_MAX_LENGTH}</Text>
        )}
        {onCancel && <TextButton dark onPress={onCancel}>Cancel</TextButton>}
        <Button dark disabled={!canSubmit} loading={busy} onPress={submit}>{submitLabel}</Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  counter: { marginRight: 'auto', color: colors.darkMuted }
});
