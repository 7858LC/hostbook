import { clsx } from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

const padMap = { sm: "p-3", md: "p-4", lg: "p-6" };

export function Card({ children, className, padding = "md" }: CardProps) {
  return (
    <div className={clsx("bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl mb-3", padMap[padding], className)}>
      {children}
    </div>
  );
}
