import { AlreadyWatchedError, mapTmdbGenres, Movie, Recommendation, TmdbMovieDetails, TmdbPoster, TmdbSearchResult } from '@portfolio/models';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ApiError } from '../../api/client';
import { recommendationApi, tmdbApi } from '../../api/endpoints';
import { Button, InteractionState } from '../../components/Button';
import { Field, Input } from '../../components/Field';
import { Icon } from '../../components/Icon';
import { CenterContainer, FadeIn, Page, panelStyle } from '../../components/layout';
import { ProgressBar } from '../../components/ProgressBar';
import { H1, Span, Text, textStyles } from '../../components/Text';
import { useBreakpoints } from '../../hooks/use-breakpoints';
import { toastService } from '../../state/toast';
import { colors, fonts } from '../../theme';
import { minutes } from '../../utils/format';

const MIN_TMDB_QUERY_LENGTH = 2;
const TMDB_SEARCH_DEBOUNCE_MS = 300;

// The parts of a movie that come from TMDB and are shown read-only (TMDB doesn't always know the year or runtime)
type MovieInfo = Pick<Movie, 'genre' | 'actors' | 'director' | 'synopsis' | 'mpaaRating'> & {
  year: number | null;
  runtimeMinutes: number | null;
};

/**
 * Recommending a movie: ng-portfolio's EditorComponent in its recommend mode. Pick a movie from TMDB,
 * choose a poster and add a note, which is posted as your comment.
 */
export function RecommendScreen() {
  const router = useRouter();
  const { sm, lg } = useBreakpoints();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [movieInfo, setMovieInfo] = useState<MovieInfo | null>(null);
  const [tmdbId, setTmdbId] = useState<number | null>(null);
  // Someone already recommended the chosen movie; recommending it again adds the note to theirs
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [tmdbResults, setTmdbResults] = useState<TmdbSearchResult[]>([]);
  const [posters, setPosters] = useState<TmdbPoster[]>([]);
  const [loadingTmdbMovie, setLoadingTmdbMovie] = useState(false);
  const [saving, setSaving] = useState(false);
  const [titleFocused, setTitleFocused] = useState(false);

  // The title that was just filled in, so filling it in doesn't kick off another search
  const filledTitle = useRef('');
  const tmdbIdRef = useRef<number | null>(null);
  tmdbIdRef.current = tmdbId;
  const lastQuery = useRef('');
  const searchId = useRef(0);

  // Searches TMDB as the title is typed; only the newest search's results are shown
  useEffect(() => {
    const query = title.trim();
    // Typing another title means the picked movie no longer applies
    if (query !== filledTitle.current && tmdbIdRef.current) {
      setTmdbId(null);
      setRecommendation(null);
    }

    const timer = setTimeout(() => {
      if (query === lastQuery.current) {
        return;
      }
      lastQuery.current = query;
      const id = ++searchId.current;
      if (query.length < MIN_TMDB_QUERY_LENGTH || query === filledTitle.current) {
        setTmdbResults([]);
        return;
      }
      tmdbApi.search(query).catch(() => []).then(results => {
        if (id === searchId.current) {
          setTmdbResults(results);
        }
      });
    }, TMDB_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [title]);

  // Whether someone already recommended the chosen movie, so the page can say what saving will do
  const checkForRecommendation = (id: number) => {
    setRecommendation(null);
    recommendationApi.findByTmdbId(id).catch(() => null).then(found => {
      // Ignore a late answer for a movie that's no longer selected
      if (tmdbIdRef.current === id) {
        setRecommendation(found);
      }
    });
  };

  // Fills in everything TMDB knows; the note is left alone since it's yours
  const populateFromTmdb = (details: TmdbMovieDetails) => {
    filledTitle.current = details.title;
    tmdbIdRef.current = details.tmdbId;
    setTmdbId(details.tmdbId);
    setPosters(details.posters);
    setMovieInfo({
      year: details.year,
      genre: mapTmdbGenres(details.genres),
      actors: details.actors,
      director: details.director,
      synopsis: details.synopsis,
      mpaaRating: details.mpaaRating,
      runtimeMinutes: details.runtimeMinutes
    });
    setTitle(details.title);
    setImageUrl(details.posters[0]?.fullUrl ?? '');
    checkForRecommendation(details.tmdbId);
  };

  const selectTmdbMovie = async (result: TmdbSearchResult) => {
    filledTitle.current = result.title;
    setTitle(result.title);
    setTmdbResults([]);
    setLoadingTmdbMovie(true);
    try {
      populateFromTmdb(await tmdbApi.movie(result.tmdbId));
    } catch {
      toastService.error('Could not load the movie from TMDB');
    } finally {
      setLoadingTmdbMovie(false);
    }
  };

  const recommend = async () => {
    if (saving) {
      return;
    }
    if (!tmdbId) {
      toastService.error('Pick a movie from the search results first.');
      return;
    }

    setSaving(true);
    const note = notes.trim();
    try {
      const { recommendation: saved, alreadyRecommended } = await recommendationApi.recommend({ tmdbId, imageUrl, note: note || undefined });
      toastService.success(alreadyRecommended
        ? `${saved.title} was already recommended, so ${note ? 'your note was added to it' : "you're in good company"}.`
        : `Thanks for recommending ${saved.title}!`);
      router.replace({ pathname: '/recommendations/[id]', params: { id: saved.id } });
    } catch (error) {
      setSaving(false);
      const status = error instanceof ApiError ? error.status : undefined;
      const watched = status === 409 ? (error as ApiError).body as AlreadyWatchedError : null;
      if (watched?.movieId) {
        toastService.info(`Devin has already watched ${title}. Leave your thoughts there instead.`);
        router.replace({ pathname: '/movie/detail/[id]', params: { id: watched.movieId } });
      } else if (status === 429) {
        toastService.error('You are recommending too quickly. Please wait a minute and try again.');
      } else {
        toastService.error('Your recommendation could not be saved.');
      }
    }
  };

  const posterPicker = imageUrl ? (
    <View>
      {posters.length > 1 && (
        <View style={styles.posterChoices} accessibilityRole="radiogroup" accessibilityLabel="Choose a poster">
          {posters.map((poster, index) => {
            const selected = poster.fullUrl === imageUrl;
            return (
              <Pressable
                key={poster.fullUrl}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`Poster ${index + 1}`}
                onPress={() => setImageUrl(poster.fullUrl)}
                style={(state: InteractionState) => [
                  styles.posterChoice,
                  selected ? styles.posterChoiceSelected : null,
                  state.hovered || state.focused ? styles.posterChoiceHover : null
                ]}
              >
                <Image source={{ uri: poster.thumbnailUrl }} style={styles.fill} contentFit="cover" />
              </Pressable>
            );
          })}
        </View>
      )}
      <Image
        source={{ uri: imageUrl }}
        accessibilityLabel="Selected poster"
        contentFit="contain"
        style={[styles.selectedPoster, lg ? styles.selectedPosterWide : null]}
      />
    </View>
  ) : null;

  const showResults = titleFocused && tmdbResults.length > 0;

  return (
    <Page>
      <CenterContainer>
        <FadeIn style={[styles.columns, lg ? styles.columnsWide : null]}>
          <View style={[styles.column, lg ? styles.columnLeft : null]}>
            <View style={[panelStyle, styles.panel, lg ? styles.panelWide : null]}>
              {loadingTmdbMovie && <ProgressBar />}
              <H1 style={styles.heading}>Recommend a Movie</H1>

              <View style={styles.form}>
                <Field label="Title">
                  <Input
                    icon="search"
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Search TMDB by title"
                    autoCorrect={false}
                    autoComplete="off"
                    onFocus={() => setTitleFocused(true)}
                    // Leaves time for a tap on a result to land before the list hides
                    onBlur={() => setTimeout(() => setTitleFocused(false), 200)}
                  />
                  {showResults && (
                    <View style={styles.results} accessibilityRole="list">
                      {tmdbResults.map(result => (
                        <Pressable
                          key={result.tmdbId}
                          accessibilityRole="button"
                          onPress={() => selectTmdbMovie(result)}
                          style={(state: InteractionState) => [styles.result, state.hovered || state.pressed ? styles.resultHover : null]}
                        >
                          {result.posterThumbnailUrl ? (
                            <Image source={{ uri: result.posterThumbnailUrl }} style={styles.resultPoster} contentFit="cover" />
                          ) : (
                            <View style={[styles.resultPoster, styles.resultPosterEmpty]}>
                              <Icon name="movie" color={colors.fieldMuted} />
                            </View>
                          )}
                          <View style={styles.resultText}>
                            <Text numberOfLines={1} style={styles.resultTitle}>
                              {result.title}
                              {result.year ? <Span style={styles.muted}> ({result.year})</Span> : null}
                            </Text>
                            {result.director ? <Text numberOfLines={1} style={[textStyles.sm, styles.muted]}>{result.director}</Text> : null}
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </Field>

                {recommendation && (
                  <View style={styles.recommendationNote} accessibilityRole="summary">
                    <Icon name="group" color={colors.button} />
                    <Text style={[textStyles.sm, styles.noteText]}>
                      <Span
                        style={styles.noteLink}
                        accessibilityRole="link"
                        onPress={() => router.push({ pathname: '/recommendations/[id]', params: { id: recommendation.id } })}
                      >
                        Already recommended
                      </Span>
                      {recommendation.recommendedBy ? ` by ${recommendation.recommendedBy.displayName}` : ''}
                      {` (${recommendation.commentCount} ${recommendation.commentCount === 1 ? 'comment' : 'comments'}). `}
                      Your note will be added to it as a comment.
                    </Text>
                  </View>
                )}

                {movieInfo ? (
                  <View style={styles.movieInfo} accessibilityLabel="Movie details">
                    <View style={styles.infoFacts}>
                      <InfoFact label="Directed By" value={movieInfo.director || '—'} wide={sm} />
                      <InfoFact label="Year" value={movieInfo.year ? String(movieInfo.year) : '—'} wide={sm} />
                      <InfoFact label="Rated" value={movieInfo.mpaaRating || 'NR'} wide={sm} />
                      <InfoFact label="Duration" value={movieInfo.runtimeMinutes ? minutes(movieInfo.runtimeMinutes) : '—'} wide={sm} />
                    </View>
                    {movieInfo.genre.length > 0 && (
                      <View style={styles.genreList} accessibilityLabel="Genres">
                        {movieInfo.genre.map(genre => (
                          <View key={genre} style={styles.genre}>
                            <Text weight="medium" style={styles.genreText}>{genre}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {movieInfo.actors.length > 0 && (
                      <View>
                        <Text style={textStyles.fieldLabel}>Starring</Text>
                        <Text style={[styles.infoText, styles.infoParagraph]}>{movieInfo.actors.join(', ')}</Text>
                      </View>
                    )}
                    {movieInfo.synopsis ? (
                      <View>
                        <Text style={textStyles.fieldLabel}>Synopsis</Text>
                        <Text style={[styles.infoText, styles.infoParagraph]}>{movieInfo.synopsis}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.movieInfoEmpty}>
                    <Icon name="travel-explore" color={colors.fieldMuted} />
                    <Text style={[textStyles.sm, styles.muted, styles.flexShrink]}>Search for a movie by title to fill in its details.</Text>
                  </View>
                )}

                <Field label="Notes">
                  <Input
                    multiline
                    minRows={3}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Why should Devin watch it? This is posted as your comment."
                  />
                </Field>

                {/* On smaller screens the poster lives in the form instead of beside it */}
                {!lg && posterPicker && (
                  <View style={styles.inlinePoster}>
                    <Text style={textStyles.fieldLabel}>Poster</Text>
                    {posterPicker}
                  </View>
                )}

                <Button style={styles.submit} size="base" loading={saving} onPress={recommend}>Recommend</Button>
              </View>
            </View>
          </View>

          {lg && (
            <View style={[styles.column, styles.columnRight]}>
              {posterPicker ?? (
                <View style={styles.posterPreview}>
                  <Icon name="movie-filter" size={60} color={colors.dvGreen100} />
                  <Text weight="bold" style={styles.posterPreviewText}>Poster Preview</Text>
                </View>
              )}
            </View>
          )}
        </FadeIn>
      </CenterContainer>
    </Page>
  );
}

function InfoFact({ label, value, wide }: { label: string; value: string; wide: boolean }) {
  // Two to a row on phones, all four in a row from sm
  return (
    <View style={{ width: wide ? '22%' : '46%' }}>
      <Text style={textStyles.fieldLabel}>{label}</Text>
      <Text style={[styles.infoText, styles.infoValue]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  columns: { gap: 12 },
  columnsWide: { flexDirection: 'row' },
  column: { flex: 1 },
  columnLeft: { alignItems: 'flex-end' },
  columnRight: { paddingHorizontal: 16, marginTop: 8, alignItems: 'flex-start' },
  panel: { position: 'relative', width: '100%', maxWidth: 576, alignSelf: 'center', padding: 16, marginTop: 8, overflow: 'hidden' },
  panelWide: { alignSelf: 'flex-end' },
  heading: { marginBottom: 16 },
  form: { gap: 16 },
  muted: { color: colors.fieldMuted },
  flexShrink: { flexShrink: 1 },
  results: {
    marginTop: 4,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.white,
    boxShadow: '0 2px 4px -1px rgba(0,0,0,.2), 0 4px 5px 0 rgba(0,0,0,.14), 0 1px 10px 0 rgba(0,0,0,.12)'
  },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 4, minHeight: 56 },
  resultHover: { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
  resultPoster: { width: 32, height: 48, borderRadius: 2 },
  resultPosterEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dvLightGray },
  resultText: { flex: 1, minWidth: 0 },
  resultTitle: { fontSize: 16, color: colors.text },
  recommendationNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(38, 50, 56, 0.25)',
    backgroundColor: 'rgba(38, 50, 56, 0.08)'
  },
  noteText: { flex: 1, color: colors.text },
  noteLink: { textDecorationLine: 'underline', fontFamily: fonts.medium },
  movieInfo: { gap: 16, padding: 16, borderRadius: 6, backgroundColor: colors.dvLightGray },
  infoFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  infoText: { fontSize: 16, color: colors.button },
  infoValue: { marginTop: 2 },
  infoParagraph: { marginTop: 4 },
  genreList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genre: { height: 28, paddingHorizontal: 12, borderRadius: 9999, justifyContent: 'center', backgroundColor: colors.button },
  genreText: { fontSize: 14, lineHeight: 20, color: colors.white },
  movieInfoEmpty: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, borderRadius: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.fieldBorder },
  inlinePoster: { gap: 4 },
  posterChoices: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  posterChoice: { flex: 1, minWidth: 0, maxWidth: 80, aspectRatio: 2 / 3, overflow: 'hidden', borderWidth: 4, borderColor: 'transparent', borderRadius: 6, opacity: 0.7 },
  posterChoiceHover: { opacity: 1 },
  posterChoiceSelected: { borderColor: colors.dvGreen100, opacity: 1 },
  fill: { width: '100%', height: '100%' },
  selectedPoster: { width: '100%', aspectRatio: 2 / 3, maxHeight: 800, borderRadius: 6 },
  selectedPosterWide: { width: 533, maxWidth: '100%', borderRadius: 0 },
  submit: { width: '100%', height: 56 },
  posterPreview: {
    width: '100%',
    maxWidth: 576,
    height: 320,
    marginTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.black,
    borderRadius: 8,
    backgroundColor: colors.dvLightGray
  },
  posterPreviewText: { fontSize: 16, color: colors.text }
});
