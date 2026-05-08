'use client';

import React, {
  createContext,
  useState,
  useRef,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import * as THREE from 'three';

import ThreeErrorBoundary from './error-boundary';
import { type ThreeInstance } from './types';

/**
 * Custom error class to represent WebGL context loss errors,
 * allowing for specific handling of this common issue in Three.js applications.
 * This error is thrown when the WebGL context is lost,
 * which can happen due to various reasons such as GPU resets,
 * browser limitations, or resource constraints.
 * By defining a specific error class for this scenario,
 * we can catch and handle it gracefully within our React application,
 * providing feedback to the user and attempting to restore the context when possible.
 */
class WebGLContextLostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebGLContextLostError';
  }
}

/**
 * Type definition for the function that creates a Three.js instance,
 * which is expected to return an object containing the scene,
 * camera, and update function.
 * This function is used as a callback in the ThreeProvider component
 * to initialize the Three.js instance when the canvas element
 * is available. The options parameter can be used to pass
 * any necessary configuration or data required for creating
 * the instance, allowing for flexibility in how the Three.js scene
 * is set up and managed within the React application.
 */
type ThreeInstanceCreationFunction = (options?: unknown) => ThreeInstance;

/**
 * Type definition for the function that observes the canvas element,
 * which is used to set up the Three.js renderer and instance when the canvas is available.
 * This function is passed as a ref callback to the canvas element in the ThreeProvider component,
 * allowing it to receive the canvas DOM element when it is mounted. The function can then
 * use this canvas element to create the WebGL renderer and initialize the Three.js instance,
 * ensuring that the rendering context is properly set up for displaying 3D content within the React application.
 */
type ThreeCanvasObserverFunction = (canvas: HTMLCanvasElement | null) => void;

/**
 * Type definition for the value provided by the ThreeContext,
 * which includes references to the canvas observer function,
 * the WebGL renderer, the Three.js instance, and any additional options.
 * It also includes the current error state and a function to reset the error.
 */
interface ThreeContextValue {
  canvasObserverRef: ThreeCanvasObserverFunction;
  rendererRef: React.RefObject<THREE.WebGLRenderer | null>;
  instanceRef: React.RefObject<ThreeInstance | null>;
  optionsRef: React.RefObject<unknown>;
  error: Error | null;
  resetError: () => void;
}

/**
 * Type definition for the props accepted by the ThreeProvider component,
 * which includes the children to render, the function to create the Three.js instance,
 * and optional configuration for the window, document, error handling, background color, and alpha transparency.
 * This component is responsible for providing the ThreeContext to its children,
 * managing the lifecycle of the Three.js instance, and handling any errors that may occur during initialization or rendering.
 */
interface ThreeProviderProps {
  children: React.ReactNode;
  onCreate: ThreeInstanceCreationFunction;
  window?: Window;
  document?: Document;
  disposeOnError?: boolean;
  color?: number;
  alpha?: number;
}

// Create a React context for managing the Three.js instance and related state.
const ThreeContext = createContext<ThreeContextValue | undefined>(undefined);

/**
 * Custom hook to access the ThreeContext, providing the current state of the Three.js instance,
 * the WebGL renderer, and any errors that may have occurred during initialization or rendering.
 * This hook ensures that it is used within a ThreeProvider component, throwing an error if it is not,
 * which helps to prevent issues with accessing the context in components that are not properly wrapped.
 * @returns The current value of the ThreeContext, including the canvas observer, renderer, instance, options, error state, and reset function.
 */
const useThree = (): ThreeContextValue => {
  const context = useContext(ThreeContext);
  if (!context) {
    throw new Error('useThree must be used within a ThreeProvider');
  }
  return context as ThreeContextValue;
};

/**
 * React component that provides the ThreeContext to its children, managing the lifecycle of the Three.js instance,
 * handling errors, and providing a consistent API for interacting with the Three.js instance.
 * @param props The props for the ThreeProvider component, including the children to render, the function to create the Three.js instance, and optional configuration for the window, document, error handling, background color, and alpha transparency.
 * @returns A React element that provides the ThreeContext to its children, allowing them to access the Three.js instance and related state. The component also includes error handling to catch and manage any issues that arise during the creation or rendering of the Three.js instance, ensuring a more robust and user-friendly experience when working with 3D content in a React application.
 */
function ThreeProvider({
  children,
  onCreate,
  window = globalThis.window,
  document = globalThis.document,
  disposeOnError = true,
  color = 0x000000,
  alpha = 0,
}: ThreeProviderProps) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const instanceRef = useRef<ThreeInstance | null>(null);
  const optionsRef = useRef<unknown>(null);

  // Callback ref to observe the canvas element and create the Three.js instance when the canvas is available.
  const canvasObserverRef = useCallback(
    (observedCanvas: HTMLCanvasElement | null) => {
      // If the canvas is null, it means the component is unmounting,
      // But keep the reference to the canvas for the 'webglcontextrestored' event listener to work properly.
      if (!observedCanvas) return;
      if (!instanceRef.current) {
        const newInstance = onCreate(optionsRef.current);
        newInstance.onResize?.(observedCanvas);
        instanceRef.current = newInstance;
      }
      setCanvas(observedCanvas);
    },
    [onCreate],
  );

  const setRenderer = (renderer: THREE.WebGLRenderer) => {
    rendererRef.current = renderer;
    if (instanceRef.current) {
      instanceRef.current.onRendererUpdated?.(renderer);
    }
  };

  const createRenderer = useCallback(
    (canvas: HTMLCanvasElement) => {
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: alpha > 0,
      });
      renderer.setClearColor(color, alpha);
      const rect = canvas.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      renderer.setPixelRatio(window.devicePixelRatio);
      return renderer;
    },
    [window, color, alpha],
  );

  // Create the Three.js renderer when the canvas is available, and dispose of the previous renderer if the canvas changes to free up resources.
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
    if (!canvas) return;
    const newRenderer = createRenderer(canvas);
    setRenderer(newRenderer);
  }, [canvas, createRenderer]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setClearColor(color, alpha);
    }
  }, [color, alpha]);

  // Dispose of the Three.js instance and renderer when an error occurs, if the disposeOnError option is enabled, to free up resources and allow for potential recovery.
  useEffect(() => {
    if (!error) return;
    if (instanceRef.current) {
      instanceRef.current.onError?.(error);
      if (disposeOnError) {
        instanceRef.current.dispose();
        instanceRef.current = null;
      }
    }
    if (rendererRef.current) {
      if (disposeOnError) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    }
  }, [error, disposeOnError]);

  // Set up the animation loop using THREE.Timer to call the update function on each frame, and ensure proper cleanup when the component unmounts.
  useEffect(() => {
    const timer = new THREE.Timer();
    timer.connect(document);
    let animationFrameId: number;
    const animate = (timestamp: number) => {
      timer.update(timestamp);
      if (instanceRef.current && !error) {
        const delta = timer.getDelta();
        if (delta > 0) {
          instanceRef.current.update?.(delta);
          if (rendererRef.current) {
            rendererRef.current.render(
              instanceRef.current.scene,
              instanceRef.current.camera,
            );
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
      setError(new WebGLContextLostError('WebGL context lost'));
    };
    const handleContextRestored = () => {
      setError(null);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener(
      'webglcontextrestored',
      handleContextRestored,
      false,
    );
    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost, false);
      canvas.removeEventListener(
        'webglcontextrestored',
        handleContextRestored,
        false,
      );
    };
  }, [canvas]);

  // Listen the resize event on the canvas to update the Three.js instance's camera and renderer dimensions accordingly.
  useEffect(() => {
    if (!canvas) return;
    const handleResize = () => {
      if (instanceRef.current) {
        instanceRef.current.onResize?.(canvas);
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
    canvasObserverRef,
    rendererRef,
    instanceRef,
    optionsRef,
    error,
    resetError,
  };
  return (
    <ThreeContext.Provider value={contextValue}>
      <ThreeErrorBoundary setError={setError}>{children}</ThreeErrorBoundary>
    </ThreeContext.Provider>
  );
}

export default ThreeProvider;
export type {
  ThreeInstanceCreationFunction,
  ThreeCanvasObserverFunction,
  ThreeContextValue,
};
export { useThree, WebGLContextLostError };
