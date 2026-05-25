"use client";
import React from "react";

interface State { hasError: boolean; message: string; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) { super(props); this.state = { hasError: false, message: "" }; }
  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : "Unexpected error" };
  }
  componentDidCatch(error: unknown, info: React.ErrorInfo) { console.error("[ErrorBoundary]", error, info.componentStack); }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-[#f5f5f5] mb-2">Something went wrong</h2>
        <p className="text-sm text-[#a3a3a3] mb-6 max-w-sm">{this.state.message}</p>
        <div className="flex gap-3">
          <button onClick={() => this.setState({ hasError: false, message: "" })} className="px-4 py-2 text-sm font-semibold bg-ocean text-white rounded-lg hover:bg-sky-600 transition-colors">Try again</button>
          <button onClick={() => window.location.reload()} className="px-4 py-2 text-sm font-semibold bg-[#1a1a1a] border border-[#2a2a2a] text-[#a3a3a3] rounded-lg hover:text-[#f5f5f5] transition-colors">Reload</button>
        </div>
      </div>
    );
  }
}
