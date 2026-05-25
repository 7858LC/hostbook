import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/auth", "/api/auth", "/subscribe", "/landing", "/legal", "/_next", "/favicon", "/manifest", "/robots", "/sitemap"];
const ALWAYS_ALLOWED = ["/subscribe", "/settings", "/api/stripe"];

export async function middleware(request: NextRequest) {
  // Demo mode: let everything through so the UI is visible without Google login
  if (process.env.DEMO_MODE === "true") return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next();

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    if (pathname === "/") return NextResponse.redirect(new URL("/landing", request.url));
    const url = new URL("/auth/signin", request.url);
    url.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(url);
  }

  const status = (token.subscriptionStatus as string) ?? "";
  if (!status) return NextResponse.next();

  const isActive =
    status === "active" ||
    (status === "trialing" && token.trialEndDate && new Date(token.trialEndDate as string) > new Date());

  if (!isActive && !ALWAYS_ALLOWED.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/subscribe", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
