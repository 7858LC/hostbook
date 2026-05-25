"use client";
import { clsx } from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

const variants = {
  primary:   "bg-ocean text-white hover:bg-sky-600 disabled:opacity-50",
  secondary: "bg-[#1a1a1a] border border-[#2a2a2a] text-[#f5f5f5] hover:bg-[#2a2a2a] disabled:opacity-50",
  danger:    "bg-loss/10 border border-loss/30 text-loss hover:bg-loss/20 disabled:opacity-50",
};
const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };

export function Button({ variant = "primary", size = "md", loading, fullWidth, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx("font-semibold rounded-xl transition-colors flex items-center justify-center gap-2", variants[variant], sizes[size], fullWidth && "w-full", className)}
    >
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  );
}
