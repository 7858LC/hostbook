import { createBrowserClient } from "@supabase/ssr"
import type { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ""

export function createBrowserSupabase() {
  if (!url || !key) return null
  return createBrowserClient(url, key)
}

export function createMiddlewareSupabase(request: NextRequest, response: NextResponse) {
  return createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(toSet) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value))
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
}
