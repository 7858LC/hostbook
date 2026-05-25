"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/Button";

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "Server configuration error. Please try again later.",
  AccessDenied: "Access was denied. Please try a different account.",
  Verification: "The sign-in link has expired. Please request a new one.",
  Default: "An error occurred during sign in. Please try again.",
};

function AuthErrorContent() {
  const params = useSearchParams();
  const error = params.get("error") ?? "Default";
  const message = ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-4xl mb-4">⚠️</p>
        <h1 className="text-xl font-bold text-[#f5f5f5] mb-2">Sign-in Error</h1>
        <p className="text-[#525252] text-sm mb-6">{message}</p>
        <Button onClick={() => window.location.href = "/auth/signin"} fullWidth>
          Try Again
        </Button>
        <a href="/" className="block mt-3 text-xs text-[#525252] hover:text-[#a3a3a3]">← Back to home</a>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense>
      <AuthErrorContent />
    </Suspense>
  );
}
