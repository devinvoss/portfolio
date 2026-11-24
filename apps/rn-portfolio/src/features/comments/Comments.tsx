import { CommentSubjectType, MovieComment } from '@portfolio/models';
import { useRouter } from 'expo-router';
import { ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { errorStatus } from '../../api/client';
import { commentApi } from '../../api/endpoints';
import { useUser } from '../../auth/session';
import { Button } from '../../components/Button';
import { Span, Text } from '../../components/Text';
import { TextButton } from '../../components/TextButton';
import { useBreakpoints } from '../../hooks/use-breakpoints';
import { loginHref, useCurrentPath } from '../../hooks/use-current-path';
import { toastService } from '../../state/toast';
import { colors } from '../../theme';
import { CommentComposer } from './CommentComposer';
import { CommentItem } from './CommentItem';
import { addReplyPage, postErrorMessage, removeComment, replaceComment, replyPlaceholder, ThreadView, toThreadView } from './threads';

/** Scrolls the page so a view is in sight. */
export type ScrollToView = (view: ComponentRef<typeof View>) => void;

/** The comments on a movie or recommendation (ng-portfolio's CommentsComponent). */
export function Comments({ movieId, subjectType, focusCommentId, scrollToView }: {
  movieId: string;
  subjectType: CommentSubjectType;
  /** A comment to show first and highlight, from a notification. */
  focusCommentId: string | null;
  scrollToView: ScrollToView;
}) {
  const router = useRouter();
  const currentPath = useCurrentPath();
  const user = useUser();
  const { sm } = useBreakpoints();

  const [threads, setThreads] = useState<ThreadView[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [posting, setPosting] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ threadId: string; target: MovieComment } | null>(null);
  const [replying, setReplying] = useState(false);

  const cursor = useRef<string | undefined>(undefined);
  // Only the latest load counts, if the movie changes while one is in flight
  const loadId = useRef(0);

  const load = useCallback(async () => {
    const id = ++loadId.current;
    setLoading(true);
    setLoadFailed(false);
    setReplyingTo(null);
    try {
      const [page, focused] = await Promise.all([
        commentApi.list(movieId, undefined, subjectType),
        focusCommentId ? commentApi.thread(focusCommentId).catch(() => null) : Promise.resolve(null)
      ]);
      if (id !== loadId.current) {
        return;
      }
      const pinned = focused?.movieId === movieId ? focused : null;
      const listed = page.comments.filter(comment => comment.id !== pinned?.id);
      setThreads((pinned ? [pinned, ...listed] : listed).map(toThreadView));
      setTotalCount(page.totalCount);
      setHasMore(page.hasMore);
      cursor.current = page.comments[page.comments.length - 1]?.id;
      setLoading(false);

      setHighlightId(pinned ? focusCommentId : null);
      setScrollTarget(pinned ? focusCommentId : null);
      if (focusCommentId && !pinned) {
        toastService.info('That comment has been deleted.');
      }
    } catch {
      if (id === loadId.current) {
        setLoading(false);
        setLoadFailed(true);
      }
    }
  }, [movieId, subjectType, focusCommentId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateThread = (id: string, change: (thread: ThreadView) => ThreadView | null) => {
    setThreads(current => current.flatMap(thread => {
      if (thread.comment.id !== id) {
        return [thread];
      }
      const next = change(thread);
      return next ? [next] : [];
    }));
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const page = await commentApi.list(movieId, cursor.current, subjectType);
      setThreads(current => {
        const known = new Set(current.map(thread => thread.comment.id));
        return [...current, ...page.comments.filter(comment => !known.has(comment.id)).map(toThreadView)];
      });
      setHasMore(page.hasMore);
      cursor.current = page.comments[page.comments.length - 1]?.id ?? cursor.current;
    } catch {
      toastService.error('More comments could not be loaded.');
    } finally {
      setLoadingMore(false);
    }
  };

  const loadMoreReplies = async (thread: ThreadView) => {
    const id = thread.comment.id;
    updateThread(id, t => ({ ...t, loadingReplies: true }));
    try {
      const page = await commentApi.replies(id, thread.cursor);
      updateThread(id, t => addReplyPage(t, page));
    } catch {
      updateThread(id, t => ({ ...t, loadingReplies: false }));
      toastService.error('Replies could not be loaded.');
    }
  };

  const post = async (body: string): Promise<boolean> => {
    setPosting(true);
    try {
      const comment = await commentApi.add(movieId, body, undefined, subjectType);
      setThreads(current => [toThreadView(comment), ...current]);
      setTotalCount(count => count + 1);
      return true;
    } catch (error) {
      toastService.error(postErrorMessage(errorStatus(error)));
      return false;
    } finally {
      setPosting(false);
    }
  };

  const postReply = async (body: string): Promise<boolean> => {
    if (!replyingTo) {
      return false;
    }
    setReplying(true);
    try {
      const reply = await commentApi.add(movieId, body, replyingTo.target.id, subjectType);
      setReplyingTo(null);
      updateThread(replyingTo.threadId, t => ({ ...t, replies: [...t.replies, reply] }));
      setTotalCount(count => count + 1);
      return true;
    } catch (error) {
      toastService.error(postErrorMessage(errorStatus(error)));
      return false;
    } finally {
      setReplying(false);
    }
  };

  const onRemoved = (thread: ThreadView, comment: MovieComment) => {
    setTotalCount(count => count - 1);
    updateThread(thread.comment.id, t => removeComment(t, comment.id));
    if (replyingTo?.target.id === comment.id) {
      setReplyingTo(null);
    }
  };

  const signIn = () => router.push(loginHref(currentPath));

  const renderComment = (thread: ThreadView, comment: MovieComment) => (
    <CommentItem
      comment={comment}
      user={user}
      highlighted={highlightId === comment.id}
      scrollIntoView={scrollTarget === comment.id ? view => { setScrollTarget(null); scrollToView(view); } : undefined}
      onReply={() => setReplyingTo({ threadId: thread.comment.id, target: comment })}
      onChange={updated => updateThread(thread.comment.id, t => replaceComment(t, updated))}
      onRemoved={() => onRemoved(thread, comment)}
      onBanned={load}
    />
  );

  return (
    <View style={styles.comments} accessibilityLabel="Comments">
      <Text weight="medium" style={styles.header} accessibilityRole="header">
        Comments{!loading && totalCount > 0 ? <Span style={styles.muted}> ({totalCount})</Span> : null}
      </Text>

      <View style={styles.body}>
        {user ? (
          <View style={styles.composer}>
            <CommentComposer busy={posting} onSubmit={post} />
          </View>
        ) : (
          <View style={styles.signInPrompt}>
            <Text style={styles.text}>Sign in to join the conversation.</Text>
            <Button dark onPress={signIn}>Sign in to comment</Button>
          </View>
        )}

        {loading ? (
          <Text style={[styles.text, styles.muted]}>Loading comments...</Text>
        ) : loadFailed ? (
          <View style={styles.row}>
            <Text style={[styles.text, styles.muted]}>Comments could not be loaded.</Text>
            <TextButton dark onPress={load}>Try again</TextButton>
          </View>
        ) : !threads.length ? (
          <Text style={[styles.text, styles.muted]}>No comments yet. Be the first!</Text>
        ) : (
          <>
            <View style={styles.threads}>
              {threads.map(thread => (
                <View key={thread.comment.id}>
                  {renderComment(thread, thread.comment)}

                  {(thread.replies.length > 0 || thread.hiddenReplies > 0 || replyingTo?.threadId === thread.comment.id) && (
                    // Replies sit under their comment, lined up with its text rather than its avatar
                    <View style={[styles.replies, { marginLeft: sm ? 40 : 24 }]}>
                      <View style={styles.replyList}>
                        {thread.replies.map(reply => <View key={reply.id}>{renderComment(thread, reply)}</View>)}
                      </View>

                      {thread.hiddenReplies > 0 && (
                        <TextButton dark style={styles.moreReplies} disabled={thread.loadingReplies} onPress={() => loadMoreReplies(thread)}>
                          {thread.loadingReplies
                            ? 'Loading...'
                            : `Show ${thread.hiddenReplies}${thread.hiddenReplies === 1 ? ' more reply' : ' more replies'}`}
                        </TextButton>
                      )}

                      {replyingTo?.threadId === thread.comment.id && (
                        <View style={styles.replyComposer}>
                          <CommentComposer
                            key={replyingTo.target.id}
                            label="Write a reply"
                            submitLabel="Reply"
                            placeholder={replyPlaceholder(replyingTo.target)}
                            busy={replying}
                            autoFocus
                            onSubmit={postReply}
                            onCancel={() => setReplyingTo(null)}
                          />
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>

            {hasMore && (
              <View style={styles.showMore}>
                <Button dark loading={loadingMore} onPress={loadMore}>Show more comments</Button>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // A dark panel under My Thoughts, with a header bar like Synopsis and My Thoughts have
  comments: { width: '100%', backgroundColor: colors.darkPanel },
  header: { padding: 8, fontSize: 16, lineHeight: 24, color: colors.darkText, backgroundColor: colors.darkHeader },
  muted: { color: colors.darkMuted },
  body: { padding: 8, marginTop: 4 },
  text: { fontSize: 16, lineHeight: 24, color: colors.darkText },
  composer: { marginBottom: 8 },
  signInPrompt: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    marginBottom: 24,
    borderRadius: 6,
    backgroundColor: colors.darkSurface
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  threads: { gap: 16 },
  replies: { marginTop: 4, paddingTop: 4, paddingLeft: 16, backgroundColor: colors.darkSurface },
  replyList: { gap: 4 },
  moreReplies: { marginLeft: 40, alignSelf: 'flex-start' },
  replyComposer: { paddingBottom: 12, paddingRight: 16, marginTop: 8 },
  showMore: { marginTop: 24, alignItems: 'center' }
});
