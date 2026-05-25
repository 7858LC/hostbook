interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: { value: string; label: string }[];
  error?: string;
  children?: React.ReactNode;
}

export function Select({ label, options, error, id, children, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      {label && <label htmlFor={selectId} className="block text-xs font-medium text-[#a3a3a3] mb-1.5">{label}</label>}
      <select
        id={selectId}
        className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-sm text-[#f5f5f5] px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-ocean transition-colors"
        {...props}
      >
        {children ?? options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-loss text-xs mt-1">{error}</p>}
    </div>
  );
}
