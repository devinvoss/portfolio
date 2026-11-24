import { MovieComment, SessionUser } from '@portfolio/models';
import { useRouter } from 'expo-router';
import { ComponentRef, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { commentApi } from '../../api/endpoints';
import { Avatar } from '../../components/Avatar';
import { Span, Text, textStyles } from '../../components/Text';
import { TextButton } from '../../components/TextButton';
import { loginHref, useCurrentPath } from '../../hooks/use-current-path';
import { toastService } from '../../state/toast';
import { colors, fonts } from '../../theme';
import { timeAgo } from '../../utils/format';
import { CommentComposer } from './CommentComposer';

type Confirming = 'delete' | 'ban' | null;

/** One comment or reply. It makes its own API calls and reports the outcome to the thread. */
export function CommentItem({ comment: c, user, highlighted, scrollIntoView, onReply, onChange, onRemoved, onBanned }: {
  comment: MovieComment;
  user: SessionUser | null;
  highlighted: boolean;
  /** Scroll the page to this comment once it's laid out (it was opened from a notification) */
  scrollIntoView?: (view: ComponentRef<typeof View>) => void;
  onReply: () => void;
  onChange: (comment: MovieComment) => void;
  onRemoved: () => void;
  onBanned: () => void;
}) {
  const router = useRouter();
  const currentPath = useCurrentPath();
  const viewRef = useRef<ComponentRef<typeof View>>(null);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [busy, setBusy] = useState(false);

  const isMine = !!user && !!c.author && c.author.id === user.id && c.author.role === user.role;
  const isAdmin = user?.role === 'admin';
  const canDelete = isMine || isAdmin;
  const canBan = isAdmin && c.author?.role === 'member';
  const initial = c.author?.displayName.charAt(0).toUpperCase() || '?';

  const toggleLike = async () => {
    if (!user) {
      router.push(loginHref(currentPath));
      return;
    }
    // Shows the change straight away, then settles on the server's count
    const liked = !c.likedByMe;
    onChange({ ...c, likedByMe: liked, likeCount: c.likeCount + (liked ? 1 : -1) });
    try {
      const result = await commentApi.setLiked(c.id, liked);
      onChange({ ...c, ...result });
    } catch {
      onChange(c);
      toastService.error('Your like could not be saved.');
    }
  };

  const saveEdit = async (body: string): Promise<boolean> => {
    setBusy(true);
    try {
      const updated = await commentApi.edit(c.id, body);
      setEditing(false);
      onChange({ ...c, body: updated.body, editedDate: updated.editedDate });
      return true;
    } catch {
      toastService.error('Your comment could not be saved.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await commentApi.remove(c.id);
      setConfirming(null);
      onRemoved();
    } catch {
      toastService.error('The comment could not be deleted.');
    } finally {
      setBusy(false);
    }
  };

  const confirmBan = async () => {
    const name = c.author?.displayName;
    setBusy(true);
    try {
      const { removedComments } = await commentApi.banAuthor(c.id);
      setConfirming(null);
      toastService.success(`${name} was banned and ${removedComments} ${removedComments === 1 ? 'comment was' : 'comments were'} removed.`);
      onBanned();
    } catch {
      toastService.error(`${name} could not be banned.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      ref={viewRef}
      collapsable={false}
      onLayout={() => scrollIntoView && viewRef.current && scrollIntoView(viewRef.current)}
      style={[styles.comment, highlighted ? styles.highlighted : null]}
    >
      {c.author?.avatarUrl ? (
        <Avatar uri={c.author.avatarUrl} size={36} />
      ) : (
        <View style={styles.initial}>
          <Text weight="bold" style={styles.initialText}>{initial}</Text>
        </View>
      )}

      <View style={styles.main}>
        {c.deleted ? (
          <Text style={[styles.text, styles.deleted]}>[deleted]</Text>
        ) : (
          <>
            <View style={styles.byline}>
              <Text weight="medium" style={styles.text}>{c.author?.displayName ?? 'Deleted user'}</Text>
              {c.author?.role === 'admin' && (
                <View style={styles.badge}><Text weight="bold" style={styles.badgeText}>Author</Text></View>
              )}
              <Text style={[textStyles.xs, styles.muted]}>{timeAgo(c.createdDate)}</Text>
              {c.editedDate ? <Text style={[textStyles.xs, styles.muted]}>(edited)</Text> : null}
            </View>

            {editing ? (
              <View style={styles.editor}>
                <CommentComposer
                  label="Edit your comment"
                  submitLabel="Save"
                  initialValue={c.body}
                  busy={busy}
                  autoFocus
                  onSubmit={saveEdit}
                  onCancel={() => setEditing(false)}
                />
              </View>
            ) : (
              // Comments are plain text; line breaks people typed are kept
              <Text style={styles.text}>
                {c.replyTo ? <Span style={styles.mention}>@{c.replyTo.displayName} </Span> : null}
                {c.body}
              </Text>
            )}

            {!editing && (
              <View style={styles.actions}>
                <TextButton
                  dark
                  active={c.likedByMe}
                  icon={c.likedByMe ? 'thumb-up' : 'thumb-up-off-alt'}
                  accessibilityLabel={`${c.likedByMe ? 'Unlike' : 'Like'}, ${c.likeCount} ${c.likeCount === 1 ? 'like' : 'likes'}`}
                  accessibilityState={{ selected: c.likedByMe }}
                  onPress={toggleLike}
                >
                  {c.likeCount > 0 ? c.likeCount : undefined}
                </TextButton>
                {user && <TextButton dark onPress={onReply}>Reply</TextButton>}
                {isMine && <TextButton dark onPress={() => { setEditing(true); setConfirming(null); }}>Edit</TextButton>}
                {canDelete && <TextButton dark onPress={() => setConfirming('delete')}>Delete</TextButton>}
                {canBan && <TextButton dark danger onPress={() => setConfirming('ban')}>Ban</TextButton>}
              </View>
            )}

            {confirming && (
              <View style={styles.confirm} accessibilityRole="alert">
                <Text style={[styles.text, textStyles.sm, styles.confirmText]}>
                  {confirming === 'delete'
                    ? 'Delete this comment?'
                    : `Ban ${c.author?.displayName}? This signs them out, blocks them from signing in, and removes all of their comments.`}
                </Text>
                <View style={styles.confirmActions}>
                  <TextButton dark danger disabled={busy} onPress={confirming === 'delete' ? confirmDelete : confirmBan}>
                    {confirming === 'delete' ? 'Delete' : 'Ban'}
                  </TextButton>
                  <TextButton dark disabled={busy} onPress={() => setConfirming(null)}>Cancel</TextButton>
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  comment: { flexDirection: 'row', gap: 12, paddingVertical: 4, borderRadius: 6 },
  // A comment opened from a notification
  highlighted: { backgroundColor: 'rgba(165, 214, 167, 0.2)' },
  initial: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fieldMuted },
  initialText: { color: colors.white, fontSize: 16 },
  main: { flex: 1, minWidth: 0 },
  text: { fontSize: 16, lineHeight: 24, color: colors.darkText },
  deleted: { fontFamily: fonts.italic, color: colors.darkMuted },
  muted: { color: colors.darkMuted },
  byline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8 },
  badge: { paddingHorizontal: 6, borderRadius: 4, backgroundColor: colors.dvOrange },
  badgeText: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.white },
  editor: { marginTop: 8 },
  mention: { fontFamily: fonts.medium, color: colors.darkLink },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginLeft: -8, columnGap: 4 },
  confirm: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: 8,
    marginTop: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(227, 19, 37, 0.18)'
  },
  confirmText: { flexShrink: 1 },
  confirmActions: { flexDirection: 'row', gap: 4 }
});
