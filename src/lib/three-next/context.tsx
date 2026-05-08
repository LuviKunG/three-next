'use client';

import React, {
  createContext,
  useState,
  useRef,
  useContext,
  useEffect,
  useCallback,
  startTransition,
} from 'react';
import * as THREE from 'three';

import { type ThreeInstance } from './types';

class WebGLContextLostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebGLContextLostError';
  }
}

type ThreeInstanceCreationFunction = (options?: unknown) => ThreeInstance;

type ThreeCanvasObserverFunction = (canvas: HTMLCanvasElement | null) => void;

interface ThreeContextValue {
  onCreate: ThreeInstanceCreationFunction;
  canvasObserverRef: ThreeCanvasObserverFunction;
  rendererRef: React.RefObject<THREE.WebGLRenderer | null>;
  instanceRef: React.RefObject<ThreeInstance | null>;
  optionsRef: React.RefObject<unknown>;
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
  children,
  onCreate,
  window = globalThis.window,
  document = globalThis.document,
  disposeOnError = true,
  color = 0x000000,
  alpha = 0,
}: {
  children: React.ReactNode;
  onCreate: ThreeInstanceCreationFunction;
  window: Window;
  document: Document;
  disposeOnError?: boolean;
  color?: number;
  alpha?: number;
}) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const instanceRef = useRef<ThreeInstance | null>(null);
  const optionsRef = useRef<unknown>(null);

  // Callback ref to observe the canvas element and create the Three.js instance when the canvas is available.
  const canvasObserverRef = useCallback((observedCanvas: HTMLCanvasElement | null) => {
    if (!observedCanvas) return;
    setCanvas(observedCanvas);
  }, []);

  const createRenderer = useCallback(
    (canvas: HTMLCanvasElement) => {
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: alpha > 0 });
      renderer.setClearColor(color, alpha);
      const rect = canvas.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      renderer.setPixelRatio(window.devicePixelRatio);
      return renderer;
    },
    [window, color, alpha]
  );

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
    if (!canvas) return;
    const renderer = createRenderer(canvas);
    rendererRef.current = renderer;
  }, [canvas, createRenderer]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setClearColor(color, alpha);
    }
  }, [color, alpha]);

  useEffect(() => {
    if (error && disposeOnError) {
      if (instanceRef.current) {
        instanceRef.current.dispose();
        instanceRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    }
  }, [error, disposeOnError]);

  // Handle the canvas change and create the Three.js instance using the provided onCreate function, with error handling to catch any issues during initialization.
  useEffect(() => {
    if (!canvas) return;
    if (instanceRef.current) return;
    try {
      const newInstance = onCreate(optionsRef.current);
      newInstance.onResize(canvas);
      instanceRef.current = newInstance;
    } catch (err) {
      startTransition(() => setError(err instanceof Error ? err : new Error(String(err))));
    }
  }, [canvas, onCreate]);

  // Set up the animation loop using THREE.Timer to call the update function on each frame, and ensure proper cleanup when the component unmounts.
  useEffect(() => {
    const timer = new THREE.Timer();
    timer.connect(document);
    let animationFrameId: number;
    const animate = (timestamp: number) => {
      timer.update(timestamp);
      if (instanceRef.current) {
        const { scene, camera, update } = instanceRef.current;
        const delta = timer.getDelta();
        if (delta > 0) {
          update(delta);
          if (rendererRef.current) {
            rendererRef.current.render(scene, camera);
          }
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => {
      timer.disconnect();
      timer.dispose();
      cancelAnimationFrame(animationFrameId);
    };
  }, [document]);

  // Listen for WebGL context loss and restoration events to handle errors gracefully.
  useEffect(() => {
    if (!canvas) return;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      const error = new WebGLContextLostError('WebGL context lost');
      console.error(error);
      setError(error);
    };
    const handleContextRestored = () => {
      console.info('WebGL context restored');
      setError(null);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost, false);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored, false);
    };
  }, [canvas]);

  // Listen the resize event on the canvas to update the Three.js instance's camera and renderer dimensions accordingly.
  useEffect(() => {
    if (!canvas) return;
    const handleResize = () => {
      if (instanceRef.current) {
        instanceRef.current.onResize(canvas);
      }
      if (rendererRef.current) {
        const rect = canvas.getBoundingClientRect();
        rendererRef.current.setSize(rect.width, rect.height, false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [window, canvas]);

  const resetError = () => {
    setError(null);
  };

  const contextValue: ThreeContextValue = {
    onCreate,
    canvasObserverRef,
    rendererRef,
    instanceRef,
    optionsRef,
    error,
    resetError,
  };
  return <ThreeContext.Provider value={contextValue}>{children}</ThreeContext.Provider>;
}

export default ThreeProvider;
export type { ThreeInstanceCreationFunction, ThreeCanvasObserverFunction, ThreeContextValue };
export { useThree, WebGLContextLostError };
