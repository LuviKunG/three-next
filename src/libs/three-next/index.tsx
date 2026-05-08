'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { type ThreeInstance } from './types';

export interface ThreeContextValue {
  onCreate: (window: Window, document: Document, canvas: HTMLCanvasElement) => ThreeInstance;
  error?: Error;
  instance: React.RefObject<ThreeInstance | null>;
}

const ThreeContext = createContext<ThreeContextValue | undefined>(undefined);

/**
 * Hook to access the Three.js instance and creation function.
 *
 * This hook must be used within a `ThreeProvider` component.
 * It returns an object with two properties: `onCreate` and `instance`.
 * `onCreate` is the function that creates the Three.js instance, and
 * `instance` is a React ref that holds the current Three.js instance.
 *
 * @throws {Error} If used outside of a `ThreeProvider` component.
 * @returns {ThreeContextValue} An object with `onCreate` and `instance` properties.
 */
export const useThree = (): ThreeContextValue => {
  const context = useContext(ThreeContext);
  if (!context) {
    throw new Error('useThree must be used within a ThreeProvider');
  }
  return context as ThreeContextValue;
};

export function ThreeProvider({
  onCreate,
  children,
}: {
  onCreate: (window: Window, document: Document, canvas: HTMLCanvasElement) => ThreeInstance;
  children: React.ReactNode;
}) {
  const instanceRef = React.useRef<ThreeInstance | null>(null);
  const [error, setError] = React.useState<Error | null>(null);

  useEffect(() => {
    if (instanceRef.current) {
      return;
    }
  }, []);

  const contextValue: ThreeContextValue = {
    onCreate,
    instance: instanceRef,
    error: undefined,
  };
  return <ThreeContext.Provider value={contextValue}>{children}</ThreeContext.Provider>;
}
