'use client';

import React, { createContext, useState, useRef, useContext, useEffect, useCallback } from 'react';
import * as THREE from 'three';

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
  timescale: number;
  setTimescale: (timescale: number) => void;
  isUpdating: boolean;
  setIsUpdating: (isUpdating: boolean) => void;
  error: Error | null;
  setError: (err: Error | null) => void;
  resetError: () => void;
  isReady: boolean;
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
  /**
   * Optional device pixel ratio for the WebGL renderer, allowing for control over the rendering resolution and quality of the Three.js instance.
   * If specified, the renderer will use this value to determine the pixel ratio for rendering, which can help improve visual quality on high-DPI displays.
   * If not specified, the renderer will use the default device pixel ratio of the window, which may result in lower visual quality on high-DPI displays.
   */
  devicePixelRatio?: number;
  /**
   * Optional frame rate limit for the animation loop, allowing for control over the rendering performance and resource usage of the Three.js instance.
   * If specified, the animation loop will be throttled to the given frame rate, which can help reduce CPU/GPU load and improve battery life on mobile devices.
   * If not specified, the animation loop will run at the default frame rate of the browser (typically 60 FPS).
   */
  frameRate?: number;
}

// Create a React context for managing the Three.js instance and related state.
const ThreeContext = createContext<ThreeContextValue | undefined>(undefined);

/**
 * Slack (in milliseconds) allowed when deciding whether a frame is due.
 * `requestAnimationFrame` timestamps are aligned to the display refresh, so a
 * cap that matches the refresh rate (e.g. 60 FPS on a 60 Hz display) produces
 * deltas a fraction of a millisecond short of the interval. Without this slack
 * every other frame would be dropped, halving the effective frame rate.
 */
const FRAME_DUE_TOLERANCE_MS = 1;

/**
 * Bounds for the renderer's pixel ratio. Below the minimum the drawing buffer
 * degrades past the point of being readable; above the maximum the extra fill
 * rate buys no visible detail on any display the kiosk runs on.
 */
const MIN_DEVICE_PIXEL_RATIO = 0.1;
const MAX_DEVICE_PIXEL_RATIO = 4.0;

/**
 * Bounds for the target frame rate. Below the minimum the animation is
 * effectively frozen; above the maximum the cap buys no visible benefit on
 * any display the kiosk runs on.
 */
const MIN_FRAME_RATE = 1;
const MAX_FRAME_RATE = 120;

/**
 * Custom hook to access the ThreeContext, providing the current state of the Three.js instance,
 * the WebGL renderer, and any errors that may have occurred during initialization or rendering.
 * This hook ensures that it is used within a ThreeProvider component, throwing an error if it is not,
 * which helps to prevent issues with accessing the context in components that are not properly wrapped.
 * @returns The current value of the ThreeContext, including the canvas observer, renderer, instance, options, error state, and reset function.
 */
const useThree = <T extends ThreeInstance = ThreeInstance>(): Omit<
  ThreeContextValue,
  'instanceRef'
> & { instanceRef: React.RefObject<T | null> } => {
  const context = useContext(ThreeContext);
  if (!context) {
    throw new Error('useThree must be used within a ThreeProvider');
  }
  return context as unknown as Omit<ThreeContextValue, 'instanceRef'> & {
    instanceRef: React.RefObject<T | null>;
  };
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
  devicePixelRatio = undefined,
  frameRate = undefined,
}: ThreeProviderProps) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const instanceRef = useRef<ThreeInstance | null>(null);
  const optionsRef = useRef<unknown>(null);

  const [timescale, setTimescale] = useState(1.0);
  const timescaleRef = useRef(timescale);

  const [isUpdating, setIsUpdating] = useState(true);
  const isUpdatingRef = useRef(isUpdating);

  const errorRef = useRef<Error | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const [isReady, setIsReady] = useState(false);

  const targetFrameRateRef = useRef<number>(0);

  // Update refs when state changes to ensure the latest values are available in callbacks and effects.
  useEffect(() => {
    timescaleRef.current = timescale;
  }, [timescale]);

  useEffect(() => {
    const isValidFrameRate = frameRate !== undefined && Number.isFinite(frameRate) && frameRate > 0;
    targetFrameRateRef.current = isValidFrameRate
      ? 1000 / THREE.MathUtils.clamp(frameRate, MIN_FRAME_RATE, MAX_FRAME_RATE)
      : 0;
  }, [frameRate]);

  useEffect(() => {
    isUpdatingRef.current = isUpdating;
  }, [isUpdating]);

  // Clean up the Three.js instance and renderer when the component unmounts to free up resources and prevent memory leaks.
  useEffect(() => {
    return () => {
      instanceRef.current?.dispose();
      rendererRef.current?.dispose();
    };
  }, []);

  const setErrorInternal = useCallback(
    (err: Error | null) => {
      if (!err) {
        errorRef.current = null;
        setError(null);
        return;
      }
      errorRef.current = err;
      setError(err);
      if (instanceRef.current) {
        instanceRef.current.onError?.(err);
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
      setIsReady(instanceRef.current !== null && rendererRef.current !== null);
    },
    [disposeOnError]
  );

  // Callback ref to observe the canvas element and create the Three.js instance when the canvas is available.
  const canvasObserverRef = useCallback(
    (observedCanvas: HTMLCanvasElement | null) => {
      // If the canvas is null, it means the component is unmounting,
      // But keep the reference to the canvas for the 'webglcontextrestored' event listener to work properly.
      if (!observedCanvas) return;
      if (!instanceRef.current) {
        try {
          const newInstance = onCreate(optionsRef.current);
          newInstance.onResize?.(observedCanvas);
          instanceRef.current = newInstance;
          setIsReady(true);
        } catch (err) {
          setErrorInternal(err instanceof Error ? err : new Error(String(err)));
        }
      }
      setCanvas(observedCanvas);
    },
    [onCreate, setErrorInternal]
  );

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
      return renderer;
    },
    [color, alpha]
  );

  /**
   * Applies a pixel ratio to the current renderer, clamped to the supported
   * range. A missing or invalid ratio falls back to the display's own ratio,
   * which is itself unavailable outside the browser — 1 is the neutral default.
   */
  const setDevicePixelRatio = useCallback(
    (dpr: number | null) => {
      if (rendererRef.current) {
        const isValidDpr = dpr !== null && Number.isFinite(dpr) && dpr > 0;
        rendererRef.current.setPixelRatio(
          isValidDpr
            ? THREE.MathUtils.clamp(dpr, MIN_DEVICE_PIXEL_RATIO, MAX_DEVICE_PIXEL_RATIO)
            : (window?.devicePixelRatio ?? 1)
        );
        instanceRef.current?.render?.(rendererRef.current, 0);
      }
    },
    [window]
  );

  // Create the Three.js renderer when the canvas is available, and dispose of the previous renderer if the canvas changes to free up resources.
  // `devicePixelRatio` is deliberately not a dependency here: recreating the
  // renderer for a ratio change would rebuild every compiled program, render
  // target and uploaded GPU resource. The effect below applies the ratio instead.
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
    if (!canvas) return;
    const newRenderer = createRenderer(canvas);
    rendererRef.current = newRenderer;
  }, [canvas, createRenderer]);

  // Apply the pixel ratio to the current renderer: once after it is created and
  // again whenever the prop changes. `canvas` and `createRenderer` are listed so
  // the ratio is re-applied to any renderer the effect above rebuilds — a fresh
  // WebGLRenderer starts at a pixel ratio of 1 and would otherwise lose it.
  useEffect(() => {
    setDevicePixelRatio(devicePixelRatio ?? null);
  }, [canvas, createRenderer, setDevicePixelRatio, devicePixelRatio]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setClearColor(color, alpha);
    }
  }, [color, alpha]);

  // Set up the animation loop using THREE.Timer to call the update function on each frame, and ensure proper cleanup when the component unmounts.
  useEffect(() => {
    const timer = new THREE.Timer();
    timer.connect(document);
    let animationFrameId: number;
    // Timestamp of the last frame that was actually updated/rendered, kept on
    // the frame rate grid so the cap does not drift; null until the first frame.
    let lastFrameTimestamp: number | null = null;
    const animate = (timestamp: number) => {
      // Always queue the next frame first so an early return below (or a throw
      // from the instance) cannot stall the loop permanently.
      animationFrameId = requestAnimationFrame(animate);
      const interval = targetFrameRateRef.current;
      if (interval > 0 && lastFrameTimestamp !== null) {
        const elapsed = timestamp - lastFrameTimestamp;
        // Not due yet — skip the frame entirely, leaving the timer untouched so
        // the next rendered frame receives the full accumulated delta.
        if (elapsed + FRAME_DUE_TOLERANCE_MS < interval) return;
        // Advance by whole intervals rather than snapping to `timestamp`, so the
        // cadence stays on the grid. After a stall (hidden tab, long GC pause)
        // the elapsed time covers many intervals at once and the grid resyncs
        // to the current timestamp instead of firing a burst of catch-up frames.
        lastFrameTimestamp += Math.floor((elapsed + FRAME_DUE_TOLERANCE_MS) / interval) * interval;
      } else {
        lastFrameTimestamp = timestamp;
      }
      timer.update(timestamp);
      if (isUpdatingRef.current && !errorRef.current) {
        const delta = timer.getDelta();
        if (delta > 0) {
          if (instanceRef.current) {
            const scaledDelta = delta * timescaleRef.current;
            instanceRef.current.update?.(scaledDelta);
            if (rendererRef.current) {
              instanceRef.current.render?.(rendererRef.current, scaledDelta);
            }
          }
        }
      }
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
      setErrorInternal(new WebGLContextLostError('WebGL context lost'));
    };
    const handleContextRestored = () => {
      setErrorInternal(null);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost, false);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored, false);
    };
  }, [canvas, setErrorInternal]);

  // Listen for canvas size changes and force an immediate render to prevent the flash caused by the canvas buffer being cleared.
  useEffect(() => {
    if (!canvas) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (rendererRef.current) {
        rendererRef.current.setSize(width, height, false);
      }
      if (instanceRef.current) {
        instanceRef.current.onResize?.(canvas);
        if (rendererRef.current) {
          instanceRef.current.render?.(rendererRef.current, 0);
        }
      }
    });
    observer.observe(canvas);
    return () => {
      observer.disconnect();
    };
  }, [canvas]);

  const resetError = () => {
    setErrorInternal(null);
  };

  const contextValue: ThreeContextValue = {
    canvasObserverRef,
    rendererRef,
    instanceRef,
    optionsRef,
    timescale,
    setTimescale,
    isUpdating,
    setIsUpdating,
    error,
    setError: setErrorInternal,
    resetError,
    isReady,
  };
  return <ThreeContext.Provider value={contextValue}>{children}</ThreeContext.Provider>;
}

export default ThreeProvider;
export type { ThreeInstanceCreationFunction, ThreeCanvasObserverFunction, ThreeContextValue };
export { useThree, WebGLContextLostError };
