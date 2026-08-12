import * as react_jsx_runtime from 'react/jsx-runtime';
import React from 'react';
import * as THREE from 'three';

/**
 * Defines the structure of the ThreeInstance, which includes the scene, camera,
 * and optional lifecycle methods for updating, resizing, and handling renderer updates and errors.
 * The dispose method is required for cleaning up resources when the instance is no longer needed.
 */
type ThreeInstance = {
  /**
   * Optional update method called on each animation frame with the delta time.
   */
  update?: (delta: number) => void;
  /**
   * Optional render method called after update on each animation frame.
   * When present, the provider defers all rendering to this method so the
   * instance can choose between raw renderer.render() and a post-processing
   * composer. When absent, the provider falls back to renderer.render().
   */
  render?: (renderer: THREE.WebGLRenderer, delta: number) => void;
  /**
   * Optional method called when the canvas is resized.
   */
  onResize?: (canvas: HTMLCanvasElement) => void;
  /**
   * Optional method called when an error occurs within the instance.
   */
  onError?: (error: Error) => void;
  /**
   * Method to dispose of the instance and clean up resources.
   * This method is required to ensure that any resources allocated
   * by the instance are properly released when the instance is no longer needed,
   * preventing memory leaks and ensuring optimal performance.
   */
  dispose: () => void;
};

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
declare class WebGLContextLostError extends Error {
    constructor(message: string);
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
/**
 * Custom hook to access the ThreeContext, providing the current state of the Three.js instance,
 * the WebGL renderer, and any errors that may have occurred during initialization or rendering.
 * This hook ensures that it is used within a ThreeProvider component, throwing an error if it is not,
 * which helps to prevent issues with accessing the context in components that are not properly wrapped.
 * @returns The current value of the ThreeContext, including the canvas observer, renderer, instance, options, error state, and reset function.
 */
declare const useThree: <T extends ThreeInstance = ThreeInstance>() => Omit<ThreeContextValue, "instanceRef"> & {
    instanceRef: React.RefObject<T | null>;
};
/**
 * React component that provides the ThreeContext to its children, managing the lifecycle of the Three.js instance,
 * handling errors, and providing a consistent API for interacting with the Three.js instance.
 * @param props The props for the ThreeProvider component, including the children to render, the function to create the Three.js instance, and optional configuration for the window, document, error handling, background color, and alpha transparency.
 * @returns A React element that provides the ThreeContext to its children, allowing them to access the Three.js instance and related state. The component also includes error handling to catch and manage any issues that arise during the creation or rendering of the Three.js instance, ensuring a more robust and user-friendly experience when working with 3D content in a React application.
 */
declare function ThreeProvider({ children, onCreate, window, document, disposeOnError, color, alpha, devicePixelRatio, frameRate, }: ThreeProviderProps): react_jsx_runtime.JSX.Element;

declare function ThreeCanvas(props: React.CanvasHTMLAttributes<HTMLCanvasElement>): react_jsx_runtime.JSX.Element | null;

declare function ThreeError(props: React.HTMLAttributes<HTMLDivElement>): react_jsx_runtime.JSX.Element | null;

export { ThreeCanvas, type ThreeCanvasObserverFunction, type ThreeContextValue, ThreeError, type ThreeInstance, type ThreeInstanceCreationFunction, ThreeProvider, WebGLContextLostError, useThree };
