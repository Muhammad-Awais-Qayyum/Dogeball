import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Define public paths that do not require authentication
  const publicPaths = ["/", "/api/login", "/guest"];

  // Get the auth token from cookies
  const authToken = request.cookies.get("auth")?.value;

  // Create response headers with cache control
  const headers = new Headers({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
  });

  // Redirect authenticated users trying to access the login page
  if (publicPaths.includes(path) && authToken) {
    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    // Add cache control headers to the redirect response
    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Redirect unauthenticated users trying to access protected routes
  if (!publicPaths.includes(path) && !authToken) {
    const response = NextResponse.redirect(new URL("/", request.url));
    // Add cache control headers to the redirect response
    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // For other cases, add cache control headers to the next response
  const response = NextResponse.next();
  headers.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}

// Add your protected routes here, but exclude specific API routes that need to be cached
export const config = {
  matcher: [
    // Match all paths except static files and some API routes
    "/((?!api/static|_next/static|_next/image|favicon.ico).*)",
  ],
};