function Bone({ className }: { className?: string }) {
  return <div className={`bg-[#2a2a2a] rounded-xl animate-pulse ${className ?? ""}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="px-4 md:px-6 py-6 max-w-5xl mx-auto">
      <Bone className="h-8 w-48 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => <Bone key={i} className="h-24" />)}
      </div>
      <Bone className="h-64 mb-3" />
      <Bone className="h-48" />
    </div>
  );
}

export function CardSkeleton() {
  return <Bone className="h-32 w-full" />;
}

export function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => <Bone key={i} className="h-12 w-full" />)}
    </div>
  );
}
