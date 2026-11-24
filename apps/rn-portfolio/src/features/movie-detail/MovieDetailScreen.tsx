import { Movie, Recommendation } from '@portfolio/models';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { errorMessage, errorStatus } from '../../api/client';
import { movieApi, recommendationApi } from '../../api/endpoints';
import { useIsAdmin } from '../../auth/session';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { CenterContainer, FadeIn } from '../../components/layout';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { Text, textStyles } from '../../components/Text';
import { TextButton } from '../../components/TextButton';
import { useBreakpoints } from '../../hooks/use-breakpoints';
import { MovieListKind } from '../../state/movie-lists';
import { toastService } from '../../state/toast';
import { absoluteFill, colors } from '../../theme';
import { mediumDate, minutes } from '../../utils/format';
import { Comments, ScrollToView } from '../comments/Comments';
import { PosterViewer } from './PosterViewer';

/** A watched movie or a recommendation, with its comments (ng-portfolio's DetailComponent). */
export function MovieDetailScreen({ kind, id, focusCommentId }: { kind: MovieListKind; id: string; focusCommentId: string | null }) {
  const isRecommended = kind === 'recommended';
  const listUrl = isRecommended ? '/recommendations' : '/movie';
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const { sm, md } = useBreakpoints();

  const [movie, setMovie] = useState<Movie | Recommendation | undefined>(undefined);
  const [posterOpen, setPosterOpen] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  const watched = !isRecommended ? movie as Movie | undefined : undefined;
  const recommendation = isRecommended ? movie as Recommendation | undefined : undefined;

  useEffect(() => {
    let current = true;
    setMovie(undefined);
    const request: Promise<Movie | Recommendation> = isRecommended ? recommendationApi.get(id) : movieApi.get(id);
    request.then(
      result => current && setMovie(result),
      () => {
        if (current) {
          toastService.error(isRecommended ? 'Recommendation not found.' : 'Movie not found.');
          router.replace(listUrl);
        }
      }
    );
    return () => {
      current = false;
    };
  }, [id, isRecommended, listUrl, router]);

  // Notification links scroll to their comment, which can be far down the page
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const contentRef = useRef<ComponentRef<typeof View>>(null);
  const scrollToView: ScrollToView = useCallback(view => {
    const content = contentRef.current;
    if (!content) {
      return;
    }
    view.measureLayout(content, (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(y - 120, 0), animated: true }));
  }, []);

  // The admin dismisses a recommendation; the recommender withdraws it. Either way it takes a second tap.
  const removeRecommendation = async () => {
    if (!recommendation || removing) {
      return;
    }
    if (!confirmingRemove) {
      setConfirmingRemove(true);
      return;
    }
    setRemoving(true);
    try {
      await recommendationApi.remove(recommendation.id);
      toastService.success(`${recommendation.title} was removed from the recommendations.`);
      router.replace('/recommendations');
    } catch (error) {
      setRemoving(false);
      setConfirmingRemove(false);
      const message = errorMessage(error);
      toastService.error(errorStatus(error) === 403 && message ? message : 'The recommendation could not be removed.');
    }
  };

  if (!movie) {
    return (
      <CenterContainer>
        <SkeletonLoader />
      </CenterContainer>
    );
  }

  // Poster on the left with the title beside it. On phones the facts drop below the poster to use the
  // full width; from sm up they stay beside it, under the title.
  const facts = (
    <View style={styles.facts}>
      <Fact label="Directed By" value={movie.director} />
      <Fact label="Rated" value={movie.mpaaRating || 'NR'} />
      {movie.runtimeMinutes ? <Fact label="Duration" value={minutes(movie.runtimeMinutes)} /> : null}
      <View style={styles.fullWidth}>
        <Fact label="Starring" value={movie.actors.join(', ')} />
      </View>
    </View>
  );

  return (
    <ScrollView ref={scrollRef} style={styles.page} keyboardShouldPersistTaps="handled">
      <FadeIn>
        <View ref={contentRef} style={styles.container} collapsable={false}>
          {/* The poster and its overlay fill the page however tall the text and comments make it */}
          <Image source={{ uri: movie.imageUrl }} style={absoluteFill} contentFit="cover" />
          <View style={styles.overlay} />

          <View style={styles.text}>
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View the ${movie.title} poster full size`}
                onPress={() => setPosterOpen(true)}
                style={[styles.posterButton, { width: md ? 192 : sm ? 144 : 96 }]}
              >
                <Image source={{ uri: movie.imageUrl }} style={styles.poster} contentFit="cover" />
              </Pressable>

              <View style={styles.headerText}>
                {/* Edit and Add to Watched are admin features, coming with the admin screens */}
                <Text weight="medium" style={[md ? textStyles.xxxl : textStyles.xxl, styles.white]} accessibilityRole="header">
                  {movie.title}{movie.year ? ` (${movie.year})` : ''}
                </Text>
                <View style={styles.subtitle}>
                  {watched && (
                    <View style={styles.rating} accessibilityLabel={`${watched.rating} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map(num => (
                        <Icon key={num} name={num <= watched.rating ? 'star' : 'star-border'} size={md ? 30 : 24} />
                      ))}
                    </View>
                  )}
                  {recommendation && (
                    <View style={styles.recommendedBy}>
                      <Icon name="recommend" size={20} />
                      <Text style={[md ? textStyles.body : textStyles.sm, styles.white]}>
                        Recommended by {recommendation.recommendedBy?.displayName ?? 'a deleted user'} on {mediumDate(recommendation.createdDate)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.genres}>
                    {movie.genre.map(genre => (
                      <View key={genre} style={styles.genreChip}>
                        <Text weight="medium" style={styles.genreText}>{genre}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                {sm && facts}
              </View>
            </View>
            {!sm && facts}

            <View style={styles.sections}>
              <View style={[styles.section, { backgroundColor: colors.dvLightBrown }]}>
                <Text weight="medium" style={[styles.sectionHeader, { backgroundColor: colors.dvBrown }]}>Synopsis</Text>
                <Text style={styles.sectionBody}>{movie.synopsis}</Text>
              </View>
              {watched && (
                <View style={[styles.section, { backgroundColor: colors.dvGreen }]}>
                  <Text weight="medium" style={[styles.sectionHeader, { backgroundColor: colors.dvGreen100 }]}>My Thoughts</Text>
                  <Text style={styles.sectionBody}>{watched.notes}</Text>
                </View>
              )}
              {recommendation?.canRemove && (
                <View style={styles.removeRow}>
                  {confirmingRemove && (
                    <>
                      <Text style={[textStyles.sm, styles.white]} accessibilityRole="alert">This also deletes its comments.</Text>
                      <TextButton dark onPress={() => setConfirmingRemove(false)}>Cancel</TextButton>
                    </>
                  )}
                  <Button variant="delete" loading={removing} onPress={removeRecommendation}>
                    {confirmingRemove ? 'Click again to remove' : isAdmin ? 'Dismiss' : 'Withdraw recommendation'}
                  </Button>
                </View>
              )}
              <Comments
                movieId={movie.id}
                subjectType={isRecommended ? 'recommendation' : 'movie'}
                focusCommentId={focusCommentId}
                scrollToView={scrollToView}
              />
            </View>
          </View>
        </View>
      </FadeIn>
      <PosterViewer imageUrl={movie.imageUrl} title={movie.title} visible={posterOpen} onClose={() => setPosterOpen(false)} />
    </ScrollView>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={[textStyles.body, styles.white]}>{label}</Text>
      <Text weight="medium" style={[textStyles.lg, styles.white, styles.factValue]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.black },
  container: { minHeight: 1280 },
  overlay: { ...absoluteFill, backgroundColor: colors.black, opacity: 0.7 },
  text: { padding: 16 },
  white: { color: colors.white },
  header: { flexDirection: 'row', gap: 16 },
  posterButton: { alignSelf: 'flex-start', aspectRatio: 2 / 3, overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1)' },
  poster: { width: '100%', height: '100%' },
  headerText: { flex: 1, minWidth: 0 },
  subtitle: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4 },
  rating: { flexDirection: 'row', marginRight: 8 },
  recommendedBy: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8, flexShrink: 1 },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // mat-chip in the accent color
  genreChip: { height: 32, paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center', backgroundColor: colors.accent },
  genreText: { color: colors.white, fontSize: 14, lineHeight: 20 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 8, marginTop: 12 },
  fullWidth: { width: '100%' },
  factValue: { marginTop: 8 },
  sections: { marginTop: 12, gap: 16 },
  section: { width: '100%' },
  sectionHeader: { padding: 8, fontSize: 16, color: colors.black },
  sectionBody: { padding: 8, marginTop: 4, fontSize: 16, color: colors.black },
  removeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }
});
