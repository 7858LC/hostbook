"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function SubscribeSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push("/"), 5000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-5xl mb-4">🎉</p>
        <h1 className="text-2xl font-bold text-[#f5f5f5] mb-2">You&apos;re in!</h1>
        <p className="text-[#525252] mb-6">
          Your HostBook subscription is active. Start adding properties and tracking your rental income.
        </p>
        <Button onClick={() => router.push("/")} fullWidth>Go to Dashboard →</Button>
        <p className="text-xs text-[#525252] mt-4">Redirecting automatically in 5 seconds…</p>
      </div>
    </div>
  );
}
