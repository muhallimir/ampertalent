import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkOnboardingStatusForMiddleware, getDashboardPath } from './lib/middleware-onboarding';


// Check for user invitations and handle admin invitations
// This function is ONLY called when a user doesn't have a profile yet (during onboarding)
// This optimization prevents unnecessary API calls for existing users
async function checkUserInvitation(request: NextRequest, userId: string) {
  try {
    // Create internal API call to check for user invitations
    const baseUrl = request.nextUrl.origin;
    const response = await fetch(`${baseUrl}/api/user/invitation`, {
      headers: {
        Cookie: request.headers.get('cookie') || '',
        'User-Agent': request.headers.get('user-agent') || '',
      },
      // Use a shorter timeout for middleware to avoid blocking
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      console.warn(`Middleware user invitation check failed: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // If there's no invitation, continue with normal flow
    if (!data.invitation) {
      return null;
    }

    const invitation = data.invitation;

    // If invitation role is admin, create user profile and redirect to admin dashboard
    if (invitation.role === 'admin') {
      try {
        // Create internal API call to process admin invitation
        const adminResponse = await fetch(`${baseUrl}/api/user/invitation/validate/admin`, {
          method: 'POST',
          headers: {
            Cookie: request.headers.get('cookie') || '',
            'User-Agent': request.headers.get('user-agent') || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            invitationId: invitation.id,
          }),
          // Use a shorter timeout for middleware to avoid blocking
          signal: AbortSignal.timeout(5000),
        });

        if (adminResponse.ok) {
          const result = await adminResponse.json();
          if (result.success) {
            // Redirect to admin dashboard
            if (process.env.DEBUG_MODE === 'true') {
              console.log('🔄 MIDDLEWARE: Redirecting admin user to admin dashboard');
            }
            return NextResponse.redirect(new URL('/admin/dashboard', request.url));
          }
        }
      } catch (adminError) {
        console.error('🚨 MIDDLEWARE: Admin invitation processing failed:', adminError);
        // Continue with normal flow if admin processing fails
        return null;
      }
    }

    // For seeker/employer invitations, continue with normal flow
    // The onboarding page will handle skipping the role selection
    return null;
  } catch (error) {
    console.error('Middleware user invitation check error:', error);
    // Return null to allow fallback to client-side logic
    return null;
  }
}

// Define protected routes and their required roles
const protectedRoutes = {
  '/seeker': ['seeker'],
  '/employer': ['employer'],
  '/admin': ['admin'],
  '/api/seeker': ['seeker'],
  '/api/employer': ['employer'],
  '/api/admin': ['admin'],
};

// Special routes that allow onboarding users (with 'user' role) to access
const onboardingAllowedRoutes = [
  '/api/seeker/subscription/checkout', // Allow onboarding users to create checkout sessions
  '/api/onboarding', // Already unprotected but listed for clarity
  '/api/onboarding/pending-signup/draft', // Allow onboarding users to save draft pending signup data
  '/seeker/subscription/paypal-return', // Allow onboarding users to complete PayPal payment flow
  '/api/payments/paypal', // Allow onboarding users to execute PayPal billing agreements
];

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback(.*)', // Clerk SSO callback
  '/handler(.*)', // Clerk handlers for email verification.
  '/api/__clerk(.*)', // Clerk internal API routes
  '/api/auth(.*)',
  '/api/ghl(.*)',
  '/api/health(.*)',
  '/api/webhooks(.*)',
  '/checkout/authnet(.*)', // Allow public access to checkout for marketing integration
]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const middlewareStartTime = Date.now();
  const { pathname } = request.nextUrl;

  if (process.env.DEBUG_MODE === 'true') {
    console.log(`🔍 MIDDLEWARE: Processing ${pathname}`);
  }

  // Allow public routes to pass through without any processing
  // This includes Clerk's sign-in/sign-up flows and API routes
  if (isPublicRoute(request)) {
    if (process.env.DEBUG_MODE === 'true') {
      console.log(`🔓 MIDDLEWARE: Public route ${pathname} - bypassing middleware`);
    }
    return NextResponse.next();
  }

  // Get authentication status from Clerk
  const { userId } = await auth();

  // Handle root path redirect logic (similar to app/page.tsx)
  if (['/', '/onboarding'].includes(pathname)) {
    try {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('🏠 MIDDLEWARE: Handling root path redirect');
      }

      if (!userId) {
        if (process.env.DEBUG_MODE === 'true') {
          console.log('🔄 MIDDLEWARE: Redirecting unauthenticated user from root to sign-in');
        }
        const loginUrl = new URL('/sign-in', request.url);
        return NextResponse.redirect(loginUrl);
      }

      // Get user role via API route (Edge Runtime compatible)
      let userProfile: { role: string } | null = null;
      try {
        const roleResponse = await fetch(new URL('/api/auth/user-role', request.url), {
          headers: {
            cookie: request.headers.get('cookie') || '',
          },
        });

        if (roleResponse.ok) {
          const { role } = await roleResponse.json();
          userProfile = role ? { role } : null;

          // Check for user invitations only if no profile exists
          // This is the only place where invitation check is needed
          if (userProfile === null) {
            const userInvitationResponse = await checkUserInvitation(request, userId);
            if (userInvitationResponse) {
              return userInvitationResponse;
            }
          }
        }
      } catch (error) {
        console.error('🚨 MIDDLEWARE: Role lookup failed in root redirect:', error || 'Unknown error');
        userProfile = null;
      }

      // Special handling for team members - redirect to employer dashboard
      if (userProfile?.role === 'team_member') {
        if (process.env.DEBUG_MODE === 'true') {
          console.log('🔄 MIDDLEWARE: Redirecting team member to employer dashboard');
        }
        return NextResponse.redirect(new URL('/employer/dashboard', request.url));
      }

      // If there's a user role redirect to dashboard
      if (userProfile?.role) {
        // Super admins and regular admins both go to admin dashboard
        const dashboardPath =
          userProfile.role === 'super_admin' || userProfile.role === 'admin' ? '/admin/dashboard' : `/${userProfile.role}/dashboard`;
        if (process.env.DEBUG_MODE === 'true') {
          console.log(`🔄 MIDDLEWARE: Redirecting user with role ${userProfile.role} from root to ${dashboardPath}`);
        }
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      } else if (pathname !== '/onboarding') {
        // redirect to onboarding if there's a user but don't have a role
        if (process.env.DEBUG_MODE === 'true') {
          console.log('🔄 MIDDLEWARE: Redirecting user without role from root to onboarding');
        }
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }
    } catch (error) {
      console.error('🚨 MIDDLEWARE: Root path redirect error:', error);
      // Fallback to client-side handling
      return NextResponse.next();
    }
  }

  // Check if the route needs protection
  const protectedRoute = Object.keys(protectedRoutes).find((route) => pathname.startsWith(route));

  if (!protectedRoute) {
    if (process.env.DEBUG_MODE === 'true') {
      console.log(`🌐 MIDDLEWARE: Unprotected route ${pathname}`);
    }
    return NextResponse.next();
  }

  try {
    if (process.env.DEBUG_MODE === 'true') {
      console.log(`🔒 MIDDLEWARE: Protected route ${pathname}`);
    }

    if (!userId) {
      if (process.env.DEBUG_MODE === 'true') {
        const totalDuration = Date.now() - middlewareStartTime;
        console.log(`🔄 MIDDLEWARE: Redirecting unauthenticated user from ${pathname} to sign-in (${totalDuration}ms)`);
      }
      // Redirect to login if not authenticated
      const loginUrl = new URL('/sign-in', request.url);
      loginUrl.searchParams.set('redirect_url', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Skip invitation check for protected routes - invitations should only be checked during onboarding
    // This prevents unnecessary API calls and improves performance

    // Special handling for onboarding route
    if (pathname === '/onboarding') {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('🎯 MIDDLEWARE: Checking onboarding status for redirect');
        console.log('👤 MIDDLEWARE: User ID:', userId);
      }

      try {
        const onboardingStatus = await checkOnboardingStatusForMiddleware(request, userId);

        if (process.env.DEBUG_MODE === 'true') {
          console.log('📊 MIDDLEWARE: Onboarding status result:', onboardingStatus);
        }

        if (onboardingStatus && onboardingStatus.completed && onboardingStatus.role) {
          // Special handling for team members - redirect to employer dashboard
          if (onboardingStatus.role === 'team_member') {
            if (process.env.DEBUG_MODE === 'true') {
              const totalDuration = Date.now() - middlewareStartTime;
              console.log(`🔄 MIDDLEWARE: Redirecting team member from onboarding to /employer/dashboard (${totalDuration}ms)`);
            }
            return NextResponse.redirect(new URL('/employer/dashboard', request.url));
          }

          const dashboardPath = getDashboardPath(onboardingStatus.role);
          if (process.env.DEBUG_MODE === 'true') {
            const totalDuration = Date.now() - middlewareStartTime;
            console.log(`🔄 MIDDLEWARE: Redirecting completed user from onboarding to ${dashboardPath} (${totalDuration}ms)`);
          }

          return NextResponse.redirect(new URL(dashboardPath, request.url));
        }

        // If onboarding not completed, allow through to onboarding page
        if (process.env.DEBUG_MODE === 'true') {
          console.log('📝 MIDDLEWARE: User needs onboarding, allowing access to onboarding page');
        }
        return NextResponse.next();
      } catch (error) {
        console.error('🚨 MIDDLEWARE: Onboarding check failed, allowing access to onboarding page:', error);
        // Allow access to onboarding page if check fails
        return NextResponse.next();
      }
    }

    // Get user role from database
    const dbStartTime = Date.now();
    let userRole: string | string = 'user';

    try {
      const roleResponse = await fetch(new URL('/api/auth/user-role', request.url), {
        headers: { cookie: request.headers.get('cookie') || '' },
      });

      if (roleResponse.ok) {
        const { role } = await roleResponse.json();
        userRole = role;
      }

      if (process.env.DEBUG_MODE === 'true') {
        const dbDuration = Date.now() - dbStartTime;
        console.log(`📊 MIDDLEWARE: Role lookup took ${dbDuration}ms - Role: ${userRole}`);
      }
    } catch (error) {
      console.error('🚨 MIDDLEWARE: Role lookup failed:', error);

      // For admin routes, if role lookup fails, try to continue with a fallback check
      if (pathname.startsWith('/admin')) {
        if (process.env.DEBUG_MODE === 'true') {
          console.log('🔄 MIDDLEWARE: Admin route detected, attempting fallback role check');
        }

        // Try a fallback API call with retry
        try {
          const fallbackResponse = await fetch(new URL('/api/auth/user-role', request.url), {
            headers: { cookie: request.headers.get('cookie') || '' },
          });

          if (fallbackResponse.ok) {
            const { role } = await fallbackResponse.json();
            if (role === 'admin') {
              if (process.env.DEBUG_MODE === 'true') {
                console.log('✅ MIDDLEWARE: Fallback admin role confirmed');
              }
              userRole = 'admin';
            } else {
              if (process.env.DEBUG_MODE === 'true') {
                console.log('🚫 MIDDLEWARE: Fallback check - not admin, redirecting to sign-in');
              }
              return NextResponse.redirect(new URL('/sign-in', request.url));
            }
          } else {
            if (process.env.DEBUG_MODE === 'true') {
              console.log('🚫 MIDDLEWARE: Fallback API call failed, redirecting to sign-in');
            }
            return NextResponse.redirect(new URL('/sign-in', request.url));
          }
        } catch (fallbackError) {
          console.error('🚨 MIDDLEWARE: Fallback role check also failed:', fallbackError || 'Unknown error');
          return NextResponse.redirect(new URL('/sign-in', request.url));
        }
      } else {
        // For non-admin routes, redirect to sign-in when role lookup fails
        // This prevents redirect loops for users who have completed onboarding
        // but have role lookup issues
        if (process.env.DEBUG_MODE === 'true') {
          const totalDuration = Date.now() - middlewareStartTime;
          console.log(`🔄 MIDDLEWARE: Redirecting to sign-in due to role lookup error (${totalDuration}ms)`);
        }
        return NextResponse.redirect(new URL('/sign-in', request.url));
      }
    }

    // For admin users, allow access to all sections (impersonation will be handled client-side)
    if (userRole === 'admin' || userRole === 'super_admin') {
      if (process.env.DEBUG_MODE === 'true') {
        const totalDuration = Date.now() - middlewareStartTime;
        console.log(`✅ MIDDLEWARE: Admin access granted to ${pathname} (${totalDuration}ms)`);
      }
      return NextResponse.next();
    }

    // Special handling for team members in protected routes
    if (userRole === 'team_member' && pathname.startsWith('/employer')) {
      // Allow team members to access employer/team routes
      if (process.env.DEBUG_MODE === 'true') {
        const totalDuration = Date.now() - middlewareStartTime;
        console.log(`✅ MIDDLEWARE: Team member access granted to ${pathname} (${totalDuration}ms)`);
      }
      return NextResponse.next();
    }

    // Check if this is an onboarding-allowed route
    const isOnboardingAllowed = onboardingAllowedRoutes.some((route) => pathname.startsWith(route));

    // Check if user has required role for this route
    const requiredRoles = protectedRoutes[protectedRoute as keyof typeof protectedRoutes];
    const hasAccess = userRole && requiredRoles.includes(userRole);

    // Allow access if user has proper role OR if it's an onboarding-allowed route and user has 'user' role
    const allowOnboardingAccess = isOnboardingAllowed && userRole === 'user';

    if (!hasAccess && !allowOnboardingAccess) {
      if (process.env.DEBUG_MODE === 'true') {
        const totalDuration = Date.now() - middlewareStartTime;
        console.log(`🚫 MIDDLEWARE: Access denied for role '${userRole}' to ${pathname} (${totalDuration}ms)`);
      }

      // Redirect to sign-in for access denied, rather than trying to guess the correct dashboard
      // This prevents redirect loops and ensures users re-authenticate if there are role issues
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    // Log if we're allowing onboarding access
    if (allowOnboardingAccess && process.env.DEBUG_MODE === 'true') {
      const totalDuration = Date.now() - middlewareStartTime;
      console.log(`✅ MIDDLEWARE: Onboarding access granted for role '${userRole}' to ${pathname} (${totalDuration}ms)`);
    }

    if (process.env.DEBUG_MODE === 'true') {
      const totalDuration = Date.now() - middlewareStartTime;
      console.log(`✅ MIDDLEWARE: Protected route processed in ${totalDuration}ms`);
    }
    return NextResponse.next();
  } catch (error) {
    const totalDuration = Date.now() - middlewareStartTime;
    console.error(`🚨 MIDDLEWARE ERROR after ${totalDuration}ms:`, error);

    // Redirect to login on error
    const loginUrl = new URL('/sign-in', request.url);
    loginUrl.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (Clerk auth routes)
     * - api/ghl (GoHighLevel webhook endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - static assets (.png, .jpg, .svg, .css, .js, .ico, .woff, .woff2)
     * - api/health or other monitoring endpoints
     */
    '/((?!api/webhooks/clerk|_next/static|_next/image|favicon.ico|public|.*\\.(?:png|jpg|jpeg|gif|svg|css|js|ico|woff|woff2|ttf|eot|webp|avif)$|api/health).*)',
  ],
};
