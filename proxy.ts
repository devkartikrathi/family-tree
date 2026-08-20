import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Page routes redirect to sign-in when signed out. API routes deliberately do
 * *not* go through `auth.protect()` — every handler calls `requireUserId()`
 * itself, so an unauthenticated request gets our own JSON error envelope
 * instead of a redirect the client cannot parse.
 */
const isProtectedPage = createRouteMatcher(['/tree(.*)', '/join(.*)']);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedPage(request)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next internals and static files unless they carry search params.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
