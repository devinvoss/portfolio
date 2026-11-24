import { GENRES, GenreCount, MovieSearchCriteria, MovieSearchFields, MovieSortFields } from '@portfolio/models';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { movieApi, recommendationApi } from '../../api/endpoints';
import { Button, InteractionState } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Field, Input } from '../../components/Field';
import { Icon, IconName } from '../../components/Icon';
import { panelStyle, SlideUpIn } from '../../components/layout';
import { MOVIE_LIST_ITEM_HEIGHT, MovieListItem } from '../../components/MovieListItem';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { Span, Text, textStyles } from '../../components/Text';
import { useBreakpoints } from '../../hooks/use-breakpoints';
import { ListedMovie, MovieListKind, searchMovieList, useMovieLists } from '../../state/movie-lists';
import { usePrefs } from '../../state/prefs';
import { toastService } from '../../state/toast';
import { useHydrated } from '../../state/use-hydrated';
import { colors, fonts } from '../../theme';

export const defaultCriteria: MovieSearchCriteria = {
  page: 0,
  pageSize: 40,
  searchFields: { title: '', person: '', rating: [], genre: [] },
  sortFields: { createdDate: -1 }
};

// Delay before a text field change triggers a search, so typing doesn't spam the API
export const TEXT_SEARCH_DEBOUNCE_MS = 300;

// How many genres show before the "Show more" toggle
export const COLLAPSED_GENRE_COUNT = 10;

const RATING_OPTIONS = [5, 4, 3, 2, 1];

// Recommendations can be sorted by how much they've been talked about
export const SORT_OPTIONS: { label: string; fields: MovieSortFields }[] = [
  { label: 'Newest', fields: { createdDate: -1 } },
  { label: 'Most discussed', fields: { commentCount: -1 } }
];

// An empty cell that fills out the last row of the grid
type Spacer = { id: string; spacer: true };

// A genre chip; count is missing when counts couldn't be loaded
type GenreOption = Omit<GenreCount, 'count'> & { count?: number };

const GAP = 12;
const CONTENT_PADDING = 8;

/** The filters as searched: trimmed text and sorted choices, so equal filters compare equal. */
export function normalizeFilters(title: string, person: string, genre: string[], rating: number[]): MovieSearchFields {
  return { title: title.trim(), person: person.trim(), genre: [...genre].sort(), rating: [...rating].sort() };
}

/** Every genre in use, most popular first, with the counts from the latest search when there are some. */
export function mergeGenreCounts(allGenres: GenreOption[], filtered: GenreCount[] | null): GenreOption[] {
  if (!filtered) {
    return allGenres;
  }
  const counts = new Map(filtered.map(x => [x.genre, x.count]));
  const known = new Set(allGenres.map(x => x.genre));
  return [
    ...allGenres.map(x => ({ genre: x.genre, count: counts.get(x.genre) ?? 0 })),
    // Genres added since the overall list was fetched
    ...filtered.filter(x => !known.has(x.genre))
  ];
}

function toggle<T>(values: T[], option: T): T[] {
  return values.includes(option) ? values.filter(x => x !== option) : [...values, option];
}

/** The list page, for both the watched movies and the recommendations (ng-portfolio's SearchComponent). */
export function MovieListScreen({ kind }: { kind: MovieListKind }) {
  const isRecommended = kind === 'recommended';
  const router = useRouter();
  const { sm, lg, xxl, xxxl } = useBreakpoints();
  const hydrated = useHydrated(useMovieLists);
  const list = useMovieLists(state => state[kind]);
  const filtersOpen = usePrefs(state => state.filtersOpen);
  const setFiltersOpen = usePrefs(state => state.setFiltersOpen);

  const [criteria, setCriteria] = useState<MovieSearchCriteria>({ ...defaultCriteria });
  const criteriaRef = useRef(criteria);
  criteriaRef.current = criteria;
  // A fresh search, which replaces the results
  const [loading, setLoading] = useState(false);
  // The next page of the current results, which is appended
  const [loadingMore, setLoadingMore] = useState(false);

  const [title, setTitle] = useState('');
  const [person, setPerson] = useState('');
  const [genre, setGenre] = useState<string[]>([]);
  const [rating, setRating] = useState<number[]>([]);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const movies = list.searchResults;
  const hasMoreMovies = movies.length < (criteria.totalCount ?? 0);
  const filters = useMemo(() => normalizeFilters(title, person, genre, rating), [title, person, genre, rating]);
  const activeFilterCount = (filters.title ? 1 : 0) + (filters.person ? 1 : 0) + filters.genre.length + filters.rating.length;
  const hasFilters = activeFilterCount > 0;

  // Every genre in use, most popular overall first. This fixes the chip order so it doesn't shuffle as filters change.
  // Falls back to the static list (without counts) if the request fails.
  const allGenres = useQuery({
    queryKey: ['genre-counts', kind],
    queryFn: (): Promise<GenreOption[]> => (isRecommended ? recommendationApi.genreCounts() : movieApi.genreCounts())
      .catch(() => GENRES.map(genre => ({ genre })))
  });
  const genreOptions = useMemo(() => mergeGenreCounts(allGenres.data ?? [], list.genreCounts), [allGenres.data, list.genreCounts]);
  // Collapsed, show the most popular genres plus any selected ones so active filters stay visible
  const visibleGenres = showAllGenres ? genreOptions : genreOptions.filter((x, index) => index < COLLAPSED_GENRE_COUNT || genre.includes(x.genre));
  const hasMoreGenres = genreOptions.length > COLLAPSED_GENRE_COUNT;

  const search = useCallback(async (next: MovieSearchCriteria) => {
    setCriteria(next);
    setLoading(true);
    try {
      // false when a newer search replaced this one, which then finishes the loading
      if (await searchMovieList(kind, next)) {
        const saved = useMovieLists.getState()[kind].lastSearchCriteria;
        if (saved) {
          setCriteria({ ...saved });
        }
        setLoading(false);
      }
    } catch {
      setLoading(false);
      toastService.error(isRecommended ? 'Loading recommendations failed.' : 'Movie search failed.');
    }
  }, [kind, isRecommended]);

  // What was last searched, and the filters as of the last change, for deciding when to search again
  const searchedFilters = useRef('');
  const previousFilters = useRef(filters);
  const pendingSearch = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Picks up where the last visit left off: same filters and sort, reloaded from the first page
  useEffect(() => {
    if (!hydrated || initialized) {
      return;
    }
    const previous = useMovieLists.getState()[kind].lastSearchCriteria;
    const fields = previous?.searchFields ?? defaultCriteria.searchFields;
    const restored = normalizeFilters(fields.title || '', fields.person || '', fields.genre || [], fields.rating || []);
    setTitle(restored.title);
    setPerson(restored.person);
    setGenre(restored.genre);
    setRating(restored.rating);
    previousFilters.current = restored;
    searchedFilters.current = JSON.stringify(restored);
    setInitialized(true);
    search({ ...(previous ?? defaultCriteria), page: 0, searchFields: restored });
  }, [hydrated, initialized, kind, search]);

  // New filters mean a new result set, so start back at the first page. Only text changes are
  // debounced; toggling a genre or rating searches right away.
  useEffect(() => {
    if (!initialized) {
      return;
    }
    const textChanged = previousFilters.current.title !== filters.title || previousFilters.current.person !== filters.person;
    previousFilters.current = filters;
    clearTimeout(pendingSearch.current);

    const key = JSON.stringify(filters);
    if (key === searchedFilters.current) {
      return;
    }
    pendingSearch.current = setTimeout(() => {
      searchedFilters.current = key;
      search({ ...criteriaRef.current, page: 0, searchFields: filters });
    }, textChanged ? TEXT_SEARCH_DEBOUNCE_MS : 0);
  }, [filters, initialized, search]);

  useEffect(() => () => clearTimeout(pendingSearch.current), []);

  const loadMore = async () => {
    if (!hasMoreMovies || loading || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      if (await searchMovieList(kind, { ...criteria, page: criteria.page + 1 })) {
        const saved = useMovieLists.getState()[kind].lastSearchCriteria;
        if (saved) {
          setCriteria({ ...saved });
        }
      }
    } catch {
      toastService.error('Loading more movies failed.');
    } finally {
      setLoadingMore(false);
    }
  };

  const isSortedBy = (option: typeof SORT_OPTIONS[number]) =>
    JSON.stringify(criteria.sortFields ?? defaultCriteria.sortFields) === JSON.stringify(option.fields);

  const sortBy = (option: typeof SORT_OPTIONS[number]) => {
    if (!isSortedBy(option)) {
      search({ ...criteria, sortFields: option.fields, page: 0, searchFields: filters });
    }
  };

  const clearFilters = () => {
    setTitle('');
    setPerson('');
    setGenre([]);
    setRating([]);
  };

  const openMovie = (movie: ListedMovie) => {
    router.push(isRecommended
      ? { pathname: '/recommendations/[id]', params: { id: movie.id } }
      : { pathname: '/movie/detail/[id]', params: { id: movie.id } });
  };

  // One per row on phones, two from sm, four from 2xl and five from 3xl. A short last row is filled out
  // with empty cells so its movies keep the grid's column width instead of stretching.
  const numColumns = !sm ? 1 : !xxl ? 2 : !xxxl ? 4 : 5;
  const rows: (ListedMovie | Spacer)[] = [...movies];
  while (rows.length % numColumns) {
    rows.push({ id: `spacer-${rows.length}`, spacer: true });
  }

  const header = (
    <View>
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <Text weight="medium" style={textStyles.xxl} accessibilityRole="header">
            {isRecommended ? 'Recommendations' : "Devin's Watched"}
          </Text>
          <Text style={[textStyles.sm, textStyles.muted]}>
            {isRecommended
              ? 'Movies visitors think I should watch. Add your own, or chime in on one already here.'
              : "Every movie I've watched since 2020, with my rating and thoughts. Open one to leave a hot take."}
          </Text>
        </View>
        {/* Adding a watched movie is an admin feature, coming with the admin screens */}
        {isRecommended && (
          <Button contentStyle={styles.addButton} onPress={() => router.push('/recommendations/add')}>
            <Icon name="add" size={18} />
            <Text weight="medium" style={styles.addButtonLabel}>Recommend a movie</Text>
          </Button>
        )}
      </View>

      <View style={[panelStyle, styles.panel]} accessibilityRole="search">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: filtersOpen }}
          onPress={() => setFiltersOpen(!filtersOpen)}
          style={(state: InteractionState) => [styles.filtersToggle, state.hovered || state.pressed ? styles.filtersToggleHover : null]}
        >
          <Icon name="tune" />
          <Text weight="medium" style={styles.filtersLabel}>Filters</Text>
          {activeFilterCount > 0 && (
            <View style={styles.filtersCount}>
              <Text weight="medium" style={styles.filtersCountText}>{activeFilterCount} active</Text>
            </View>
          )}
          <Icon name="expand-more" style={[styles.chevron, filtersOpen ? styles.chevronOpen : null]} />
        </Pressable>

        {filtersOpen && (
          <View style={styles.filtersBody}>
            {/* At full width the rating chips sit beside the text inputs instead of on their own row */}
            <View style={[styles.fieldsGrid, sm ? styles.fieldsGridWide : null]}>
              <Field label="Title" style={sm ? styles.textField : null}>
                <Input icon="movie" value={title} onChangeText={setTitle} placeholder="Search by title" autoCorrect={false} returnKeyType="search" />
              </Field>
              <Field label="Person" style={sm ? styles.textField : null}>
                <Input icon="person" value={person} onChangeText={setPerson} placeholder="Director, actor, writer..." autoCorrect={false} returnKeyType="search" />
              </Field>
              {!isRecommended && (
                <Field label="Rating" style={sm && !lg ? styles.fullRow : null}>
                  <View style={styles.ratingRow}>
                    {RATING_OPTIONS.map(option => (
                      <Chip
                        key={option}
                        label={String(option)}
                        selected={rating.includes(option)}
                        accessibilityLabel={`${option} star${option === 1 ? '' : 's'}`}
                        onPress={() => setRating(current => toggle(current, option))}
                      >
                        <Icon name="star" size={16} color={colors.dvOrange} />
                      </Chip>
                    ))}
                  </View>
                </Field>
              )}
            </View>

            <Field label="Genre">
              <View style={styles.chips}>
                {visibleGenres.map(item => (
                  <Chip
                    key={item.genre}
                    label={item.genre}
                    selected={genre.includes(item.genre)}
                    empty={item.count === 0}
                    count={item.count}
                    onPress={() => setGenre(current => toggle(current, item.genre))}
                  />
                ))}
                {hasMoreGenres && (
                  <PlainButton
                    label={showAllGenres ? 'Show less' : 'Show more'}
                    icon={showAllGenres ? 'expand-less' : 'expand-more'}
                    iconAfter
                    onPress={() => setShowAllGenres(!showAllGenres)}
                  />
                )}
              </View>
            </Field>
          </View>
        )}

        <View style={styles.statusRow}>
          <Text style={[textStyles.sm, textStyles.muted]} accessibilityLiveRegion="polite">
            {loading ? 'Searching...' : criteria.totalCount !== undefined
              ? `${criteria.totalCount} ${criteria.totalCount === 1 ? 'movie' : 'movies'}`
              : ''}
          </Text>
          <View style={styles.statusActions}>
            {isRecommended && (
              <View style={styles.sortChips} accessibilityLabel="Sort by">
                {SORT_OPTIONS.map(option => (
                  <Chip key={option.label} label={option.label} selected={isSortedBy(option)} onPress={() => sortBy(option)} />
                ))}
              </View>
            )}
            {hasFilters && <PlainButton label="Clear filters" icon="close" onPress={clearFilters} />}
          </View>
        </View>
      </View>
    </View>
  );

  const skeletons = (
    <View style={styles.skeletonGrid}>
      {/* Four placeholders, laid out in the grid's columns */}
      {Array.from({ length: Math.ceil(4 / numColumns) }, (_, row) => (
        <View key={row} style={styles.skeletonRow}>
          {Array.from({ length: numColumns }, (_, column) => (
            <View key={column} style={styles.cell}>
              {row * numColumns + column < 4 && <SkeletonLoader style={styles.skeleton} />}
            </View>
          ))}
        </View>
      ))}
    </View>
  );

  return (
    <FlatList
      key={numColumns}
      style={styles.page}
      contentContainerStyle={styles.content}
      data={rows}
      keyExtractor={movie => movie.id}
      numColumns={numColumns}
      columnWrapperStyle={numColumns > 1 ? styles.columns : undefined}
      ItemSeparatorComponent={Separator}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      ListHeaderComponentStyle={styles.headerSpacing}
      renderItem={({ item }) => 'spacer' in item ? <View style={styles.cell} /> : (
        <SlideUpIn style={[styles.cell, loading ? styles.resultsLoading : null]}>
          <View pointerEvents={loading ? 'none' : 'auto'}>
            <MovieListItem movie={item} onSelect={openMovie} />
          </View>
        </SlideUpIn>
      )}
      ListEmptyComponent={loading || !initialized ? skeletons : (
        <Text style={[styles.empty, textStyles.muted]}>
          {isRecommended && !hasFilters ? (
            <>
              Nobody has recommended a movie yet.{' '}
              <Span style={textStyles.underline} accessibilityRole="link" onPress={() => router.push('/recommendations/add')}>Be the first.</Span>
            </>
          ) : 'No movies match those filters.'}
        </Text>
      )}
      ListFooterComponent={loadingMore ? <View style={styles.footer}>{skeletons}</View> : undefined}
      // Loads the next page well before the end, so content is ready by the time it's reached
      onEndReached={loadMore}
      onEndReachedThreshold={1.5}
    />
  );
}

function Separator() {
  return <View style={{ height: GAP }} />;
}

/** The plain text buttons: Show more and Clear filters */
function PlainButton({ label, icon, iconAfter, onPress }: { label: string; icon: IconName; iconAfter?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={(state: InteractionState) => [styles.plainButton, state.hovered || state.pressed ? styles.plainButtonHover : null]}
    >
      {!iconAfter && <Icon name={icon} size={18} color={colors.button} />}
      <Text weight="medium" style={styles.plainButtonLabel}>{label}</Text>
      {iconAfter && <Icon name={icon} size={18} color={colors.button} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.dvLightGray },
  content: { padding: CONTENT_PADDING, flexGrow: 1 },
  headerSpacing: { marginBottom: 8 },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 4, marginTop: 16 },
  titleText: { flexShrink: 1, flexGrow: 1, flexBasis: 280 },
  addButton: { paddingHorizontal: 12, paddingVertical: 8 },
  addButtonLabel: { color: colors.white, fontSize: 14, lineHeight: 20 },
  panel: { gap: 8, padding: 16, marginTop: 8 },
  filtersToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: colors.button },
  filtersToggleHover: { backgroundColor: colors.buttonFocus },
  filtersLabel: { color: colors.white, fontSize: 14, lineHeight: 20, letterSpacing: 0.35, textTransform: 'uppercase' },
  filtersCount: { paddingHorizontal: 8, borderRadius: 9999, backgroundColor: colors.white },
  filtersCountText: { fontSize: 12, lineHeight: 16, color: colors.button },
  chevron: { marginLeft: 'auto' },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  filtersBody: { gap: 12 },
  fieldsGrid: { gap: 12, paddingTop: 8 },
  fieldsGridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  textField: { flex: 1, minWidth: 200 },
  fullRow: { width: '100%' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32, gap: 8, flexWrap: 'wrap' },
  statusActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: 8, flexWrap: 'wrap' },
  sortChips: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  plainButton: { flexDirection: 'row', alignItems: 'center', height: 32, gap: 2, paddingHorizontal: 8, borderRadius: 6 },
  plainButtonHover: { backgroundColor: colors.dvLightGray },
  plainButtonLabel: { fontSize: 14, lineHeight: 20, color: colors.button, fontFamily: fonts.medium },
  columns: { gap: GAP },
  cell: { flex: 1, minWidth: 0 },
  resultsLoading: { opacity: 0.5 },
  skeletonGrid: { gap: GAP, marginVertical: 4 },
  skeletonRow: { flexDirection: 'row', gap: GAP },
  skeleton: { height: MOVIE_LIST_ITEM_HEIGHT },
  footer: { marginTop: GAP },
  empty: { marginVertical: 40, textAlign: 'center', fontSize: 16 }
});
