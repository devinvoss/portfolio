import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { ListedMovie } from '../state/movie-lists';
import { absoluteFill, colors } from '../theme';
import { InteractionState } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

// Recommendations keep TMDB's full-size poster; a smaller size is plenty for the list
const TMDB_FULL_SIZE = 'https://image.tmdb.org/t/p/original/';
const TMDB_LIST_SIZE = 'https://image.tmdb.org/t/p/w780/';
// Watched movies' posters are on ImageKit, which resizes them; the website asks for 700px wide
const IMAGEKIT_LIST_WIDTH = 700;

export const MOVIE_LIST_ITEM_HEIGHT = 128;

export function listPosterUrl(imageUrl: string | undefined): string | undefined {
  if (!imageUrl) {
    return undefined;
  }
  if (imageUrl.startsWith(TMDB_FULL_SIZE)) {
    return imageUrl.replace(TMDB_FULL_SIZE, TMDB_LIST_SIZE);
  }
  return `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}tr=w-${IMAGEKIT_LIST_WIDTH}`;
}

/** dvoss-movie-list-item: the poster behind the title, with the rating or the comment count. */
export function MovieListItem({ movie, onSelect }: { movie: ListedMovie; onSelect: (movie: ListedMovie) => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={movie.title}
      onPress={() => onSelect(movie)}
      style={(state: InteractionState) => [styles.container, state.hovered ? styles.containerHover : null]}
    >
      {(state: InteractionState) => (
        <>
          <Image source={{ uri: listPosterUrl(movie.imageUrl) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          <View style={[styles.overlay, { opacity: state.hovered || state.pressed || state.focused ? 0.3 : 0.6 }]} />
          <View style={styles.text} pointerEvents="none">
            <Text weight="medium" style={styles.title} numberOfLines={2}>{movie.title}</Text>
            {movie.rating !== undefined ? (
              <View style={styles.row}>
                {[1, 2, 3, 4, 5].map(num => (
                  <Icon key={num} name={num <= (movie.rating ?? 0) ? 'star' : 'star-border'} size={24} />
                ))}
              </View>
            ) : movie.commentCount !== undefined ? (
              <View style={[styles.row, styles.comments]}>
                <Icon name="chat-bubble-outline" size={20} />
                <Text weight="medium" style={styles.commentCount}>
                  {movie.commentCount} {movie.commentCount === 1 ? 'comment' : 'comments'}
                </Text>
              </View>
            ) : null}
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: MOVIE_LIST_ITEM_HEIGHT,
    overflow: 'hidden',
    backgroundColor: colors.white,
    boxShadow: '0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1)'
  },
  containerHover: { boxShadow: '0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1)' },
  overlay: { ...absoluteFill, backgroundColor: colors.black },
  text: { ...absoluteFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  title: { color: colors.white, fontSize: 24, lineHeight: 32, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  comments: { gap: 4 },
  commentCount: { color: colors.white, fontSize: 16, lineHeight: 24 }
});
