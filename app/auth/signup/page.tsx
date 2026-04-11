import { redirect } from 'next/navigation';

export default function AuthSignUpRedirect() {
  // Redirect old auth sign-up route to new Clerk sign-up route
  redirect('/sign-up');
}