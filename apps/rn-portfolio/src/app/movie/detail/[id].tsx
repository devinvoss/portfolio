import { useLocalSearchParams } from 'expo-router';
import { MovieDetailScreen } from '../../../features/movie-detail/MovieDetailScreen';

/** A watched movie. ?comment=<id> (from a notification) shows that comment's thread first. */
export default function WatchedMovieDetail() {
  const { id, comment } = useLocalSearchParams<{ id: string; comment?: string }>();
  return <MovieDetailScreen kind="watched" id={id} focusCommentId={comment ?? null} />;
}
