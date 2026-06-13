"use client"
import { useState } from "react"

export function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("")
  function add() {
    const t = input.trim()
    if (t && !value.includes(t)) onChange([...value, t])
    setInput("")
  }
  return (
    <div className="flex flex-wrap gap-1.5 p-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg min-h-[40px] focus-within:border-ocean transition-colors">
      {value.map(tag => (
        <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-[#1a1a1a] text-[#f5f5f5] text-xs rounded-md">
          {tag}
          <button type="button" onClick={() => onChange(value.filter(t => t !== tag))} className="text-[#525252] hover:text-red-400 leading-none">×</button>
        </span>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add() } }}
        onBlur={add} placeholder={value.length === 0 ? placeholder : "Add more…"}
        className="flex-1 min-w-[100px] bg-transparent text-xs text-[#f5f5f5] placeholder-[#525252] outline-none" />
    </div>
  )
}
