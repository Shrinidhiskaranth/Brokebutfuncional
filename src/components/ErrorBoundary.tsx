import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { STORAGE_KEY } from '../constants';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Catches render errors so one broken component shows a recovery message instead of a blank page. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Kept for debugging in development; no data leaves the browser.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console -- surface render errors while developing
      console.error(error, info.componentStack);
    }
  }

  private readonly reset = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors; reloading is still the right recovery.
    }
    window.location.reload();
  };

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="error-screen" id="main">
        <div className="card">
          <h1>Something went wrong</h1>
          <p>Your month couldn&apos;t be shown. Resetting starts a fresh example month.</p>
          <button type="button" className="btn orange" onClick={this.reset}>
            Reset and reload
          </button>
        </div>
      </main>
    );
  }
}
