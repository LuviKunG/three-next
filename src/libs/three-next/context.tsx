'use client';

import React, { createContext, useState, useRef, useContext, useEffect, useCallback } from 'react';

import { type ThreeInstance } from './types';

export interface ThreeContextValue {
  onCreate: (window: Window, document: Document, canvas: HTMLCanvasElement) => ThreeInstance;
  canvasObserverRef: (canvas: HTMLCanvasElement | null) => void;
  instanceRef: React.RefObject<ThreeInstance | null>;
  error?: Error | null;
  resetError?: () => void;
}

// Create a React context for managing the Three.js instance and related state.
const ThreeContext = createContext<ThreeContextValue | undefined>(undefined);

// Custom hook to access the Three.js context, ensuring it's used within a provider.
const useThree = (): ThreeContextValue => {
  const context = useContext(ThreeContext);
  if (!context) {
    throw new Error('useThree must be used within a ThreeProvider');
  }
  return context as ThreeContextValue;
};

// Provider component that initializes the Three.js instance and manages its lifecycle, including error handling and context loss/restoration.
function ThreeProvider({
  onCreate,
  children,
}: {
  onCreate: (window: Window, document: Document, canvas: HTMLCanvasElement) => ThreeInstance;
  children: React.ReactNode;
}) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const instanceRef = useRef<ThreeInstance | null>(null);

  // Callback ref to observe the canvas element and create the Three.js instance when the canvas is available.
  const canvasObserverRef = useCallback(
    (observedCanvas: HTMLCanvasElement | null) => {
      if (!observedCanvas) return;
      setCanvas(observedCanvas);
      if (instanceRef.current) return;
      try {
        const window = globalThis.window;
        const document = globalThis.document;
        const newInstance = onCreate(window, document, observedCanvas);
        instanceRef.current = newInstance;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [onCreate]
  );

  // Listen for WebGL context loss and restoration events to handle errors gracefully.
  useEffect(() => {
    if (!canvas) return;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      if (instanceRef.current) {
        console.error('WebGL context lost, disposing instance');
        instanceRef.current.dispose();
        instanceRef.current = null;
      }
      setError(new Error('WebGL context lost'));
    };
    const handleContextRestored = () => {
      console.info('WebGL context restored, resetting error state');
      setError(null);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost, false);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored, false);
    };
  }, [canvas]);

  const resetError = () => {
    setError(null);
  };

  const contextValue: ThreeContextValue = {
    onCreate,
    error,
    instanceRef,
    canvasObserverRef,
    resetError,
  };
  return <ThreeContext.Provider value={contextValue}>{children}</ThreeContext.Provider>;
}

export default ThreeProvider;
export { useThree };
