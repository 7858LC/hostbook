import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    spreadsheetId: string;
    subscriptionStatus: string;
    trialEndDate: string;
    accessToken: string;
    error?: string;
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    spreadsheetId?: string;
    subscriptionStatus?: string;
    trialEndDate?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
  }
}
