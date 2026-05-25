import { clsx } from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
}

export function Input({ label, error, prefix, suffix, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      {label && <label htmlFor={inputId} className="block text-xs font-medium text-[#a3a3a3] mb-1.5">{label}</label>}
      <div className="relative flex items-center">
        {prefix && <span className="absolute left-3 text-sm text-[#525252] pointer-events-none">{prefix}</span>}
        <input
          id={inputId}
          className={clsx(
            "w-full bg-[#0f0f0f] border rounded-xl text-sm text-[#f5f5f5] placeholder-[#525252] focus:outline-none focus:ring-1 focus:ring-ocean transition-colors py-2.5",
            prefix ? "pl-7 pr-3" : "px-3",
            suffix ? "pr-8" : "",
            error ? "border-loss" : "border-[#2a2a2a]",
            className
          )}
          {...props}
        />
        {suffix && <span className="absolute right-3 text-sm text-[#525252] pointer-events-none">{suffix}</span>}
      </div>
      {error && <p className="text-loss text-xs mt-1">{error}</p>}
    </div>
  );
}
