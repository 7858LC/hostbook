import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { logger } from "./logger";

const REFRESH_BUFFER_SECONDS = 300;

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: (token.refreshToken as string) ?? "",
    });
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const refreshed = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
    if (!res.ok || refreshed.error) {
      logger.warn("Token refresh failed", { error: refreshed.error });
      return { ...token, error: "RefreshAccessTokenError" };
    }
    logger.info("Access token refreshed", { email: token.email });
    return {
      ...token,
      accessToken: refreshed.access_token ?? (token.accessToken as string),
      accessTokenExpires: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
      error: undefined,
    };
  } catch (err) {
    logger.error("refreshAccessToken threw", err);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/drive.file",
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/signin", error: "/auth/error" },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user?.email) {
        token.email = user.email;
        token.accessToken = account.access_token ?? "";
        token.refreshToken = account.refresh_token ?? "";
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000;
        logger.info("User signed in", { email: user.email });
        return token;
      }
      const expiresAt = (token.accessTokenExpires as number | undefined) ?? 0;
      if (Date.now() + REFRESH_BUFFER_SECONDS * 1000 < expiresAt) return token;
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (token.email && session.user) session.user.email = token.email as string;
      session.spreadsheetId = (token.spreadsheetId as string) ?? "";
      session.subscriptionStatus = (token.subscriptionStatus as string) ?? "trialing";
      session.trialEndDate = (token.trialEndDate as string) ?? "";
      session.accessToken = (token.accessToken as string) ?? "";
      if (token.error === "RefreshAccessTokenError") session.error = "RefreshAccessTokenError";
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
