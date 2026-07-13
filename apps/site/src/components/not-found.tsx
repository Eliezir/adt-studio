import { Navigate } from '@tanstack/react-router';

/**
 * There is no dedicated 404 page — any unknown URL redirects to the home page.
 * (The static host also needs a 404.html fallback that boots the SPA so this
 * client-side redirect can run; see the deploy workflow.)
 */
export function NotFound() {
  return <Navigate to="/" replace />;
}
