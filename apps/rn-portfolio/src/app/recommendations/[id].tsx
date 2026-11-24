import { useLocalSearchParams } from 'expo-router';
import { MovieDetailScreen } from '../../features/movie-detail/MovieDetailScreen';

/** A recommendation. ?comment=<id> (from a notification) shows that comment's thread first. */
export default function RecommendationDetail() {
  const { id, comment } = useLocalSearchParams<{ id: string; comment?: string }>();
  return <MovieDetailScreen kind="recommended" id={id} focusCommentId={comment ?? null} />;
}
