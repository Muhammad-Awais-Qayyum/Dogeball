import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const publicPaths = ["/", "/api/login", "/guest"];
  const authToken = request.cookies.get("auth")?.value;

  // Cache control
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  if (publicPaths.includes(path) && authToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!publicPaths.includes(path) && !authToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};