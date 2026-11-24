import { Guard } from '../components/Guard';
import { AccountScreen } from '../features/account/AccountScreen';

export default function Account() {
  return (
    <Guard require="member">
      <AccountScreen />
    </Guard>
  );
}
