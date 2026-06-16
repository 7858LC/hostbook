import { NextRequest, NextResponse } from "next/server"
import { createMiddlewareSupabase, ADMIN_EMAIL } from "@/lib/auth"

const ADMIN_ROUTES = ["/", "/leads", "/buyers"]
const BUYER_ROUTES = ["/portal"]
const PUBLIC_ROUTES = ["/login", "/join", "/claim", "/intake", "/auth", "/tos", "/privacy"]

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  const isAdminRoute = ADMIN_ROUTES.some(r => pathname === r || (r !== "/" && pathname.startsWith(r)))
  const isBuyerRoute = BUYER_ROUTES.some(r => pathname.startsWith(r))
  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r))

  if (!isAdminRoute && !isBuyerRoute) return response

  const supabase = createMiddlewareSupabase(request, response)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if (isAdminRoute && ADMIN_EMAIL && user.email !== ADMIN_EMAIL) {
    return NextResponse.redirect(new URL("/portal", request.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
}
