import { Guard } from '../../components/Guard';
import { RecommendScreen } from '../../features/recommend/RecommendScreen';

export default function RecommendMovie() {
  return (
    <Guard require="signedIn">
      <RecommendScreen />
    </Guard>
  );
}
