import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { ADMIN_EMAIL } from "@/lib/auth"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(toSet) {
        try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
      },
    },
  })
}

/** Verifies the request's session belongs to the admin user. Used to gate routes that trigger paid API calls. */
export async function isAdminRequest(): Promise<boolean> {
  if (!ADMIN_EMAIL) return false
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}
