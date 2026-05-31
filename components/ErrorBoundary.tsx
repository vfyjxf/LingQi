"use client";

import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <AlertCircle className="w-12 h-12 text-[#f85149] mx-auto" />
            <h2 className="text-lg font-semibold">页面渲染异常</h2>
            <p className="text-sm text-[#8b949e]">
              {this.state.error?.message || "发生了未知渲染错误。"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-md text-sm font-semibold"
            >
              <RefreshCw className="w-4 h-4" />
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
