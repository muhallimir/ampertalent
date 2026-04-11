import { redirect } from 'next/navigation';

export default function AuthSignInRedirect() {
  // Redirect old auth sign-in route to new Clerk sign-in route
  redirect('/sign-in');
}