import { Redirect } from 'expo-router';

// Like the website's '**' route: anything unknown goes home
export default function NotFound() {
  return <Redirect href="/home" />;
}
