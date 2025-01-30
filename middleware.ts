import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Define public paths that do not require authentication
  const publicPaths = ["/", "/api/login", "/guest"];

  // Get the auth token from cookies
  const authToken = request.cookies.get("auth")?.value;

  // Redirect authenticated users trying to access the login page
  if (publicPaths.includes(path) && authToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users trying to access protected routes
  if (!publicPaths.includes(path) && !authToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Allow the request to proceed for other cases
  return NextResponse.next();
}

// Add your protected routes here
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|guest).*)"
  ]
};