'use client';

import React from 'react';

type Props = {
  /** The tree of components to render as long as no error has been caught. */
  children: React.ReactNode;
  /**
   * Called with the caught error when a child component throws during
   * render, so it can be surfaced through `ThreeProvider`'s error state
   * (e.g. via `useThreeInternal().setError`).
   */
  setError: (error: Error | null) => void;
};

type State = {
  /** Whether an error has been caught from a descendant component. */
  hasError: boolean;
  /** The most recently caught error, or null if none has been caught yet. */
  error: Error | null;
};

/**
 * A React error boundary component that catches errors in its child component tree, logs them, and allows resetting the error state. This is particularly useful for catching and handling errors that occur during Three.js rendering or instance creation, preventing the entire application from crashing and providing a way to recover gracefully.
 * The component uses the `getDerivedStateFromError` lifecycle method to update its state when an error is caught, and the `componentDidCatch` method to log the error and pass it to a provided `setError` function. The `render` method conditionally renders the children or a fallback UI based on whether an error has been caught.
 */
class ThreeErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(error, errorInfo);
    this.props.setError(error);
  }

  // NOTE: Always render children, let the 'useThree().error' handle whether to render.
  render() {
    return this.props.children;
  }
}

export default ThreeErrorBoundary;
