"use client";

import { Component, type ReactNode } from "react";

// DEMO ONLY — remove this file with the /demo-errores section.
// Error boundaries are still class-only in React 19: there is no hook
// equivalent. Unlike a segment error.tsx, this boundary replaces only its
// children; the rest of the page keeps working.
type SectionBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

type SectionBoundaryState = {
  hasError: boolean;
};

export class SectionBoundary extends Component<
  SectionBoundaryProps,
  SectionBoundaryState
> {
  state: SectionBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SectionBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // In a real app this is where you report to your error tracker.
    console.error("[demo] component boundary caught:", error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
