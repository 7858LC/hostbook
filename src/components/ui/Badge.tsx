import { clsx } from "clsx";

interface BadgeProps { children: React.ReactNode; variant?: "profit" | "loss" | "warning" | "ocean" | "neutral"; }

const variants = {
  profit:  "bg-profit/10 text-profit border-profit/20",
  loss:    "bg-loss/10 text-loss border-loss/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  ocean:   "bg-ocean/10 text-ocean border-ocean/20",
  neutral: "bg-[#2a2a2a] text-[#a3a3a3] border-[#3a3a3a]",
};

export function Badge({ children, variant = "neutral" }: BadgeProps) {
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", variants[variant])}>
      {children}
    </span>
  );
}
