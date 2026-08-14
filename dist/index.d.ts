import * as react_jsx_runtime from 'react/jsx-runtime';
import React from 'react';
import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';

/**
 * Union of the renderer types `ThreeProvider` knows how to drive.
 * `THREE.WebGLRenderer` is the default, created automatically when no
 * `onRendererCreate` is supplied. `THREE.WebGPURenderer` — imported from the
 * `'three/webgpu'` subpath, since it is not exported from the main `'three'`
 * entry point — can be returned from a custom `onRendererCreate` for
 * consumers who want a WebGPU-backed instance instead. Only the members
 * common to both (`setSize`, `setClearColor`, `setPixelRatio`, `render`,
 * `dispose`, ...) are safe to rely on through this type.
 */
type ThreeRenderer = THREE.WebGLRenderer | WebGPURenderer;

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
  render?: (renderer: ThreeRenderer, delta: number) => void;
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
 * Type definition for the function that creates a Three.js renderer, which
 * is expected to resolve to a new `ThreeRenderer` — a `THREE.WebGLRenderer`
 * by default, or a custom renderer such as `THREE.WebGPURenderer` (imported
 * from `'three/webgpu'`, not the main `'three'` entry point). This function
 * is used as a callback in the ThreeProvider component to initialize the
 * renderer when the canvas element is available. The canvas parameter
 * provides the HTMLCanvasElement that will be used for rendering, allowing
 * the function to configure the renderer accordingly.
 *
 * Always async, so a factory can do its own setup before construction (e.g.
 * feature-detecting WebGPU support or dynamically importing
 * `'three/webgpu'`) without special-casing a sync return. This is
 * independent of — and resolved before — the renderer's own async `init()`
 * step, which the provider awaits separately once this promise resolves.
 * A synchronous factory can simply be declared `async` (or return
 * `Promise.resolve(renderer)`); no `await` inside it is required.
 */
type ThreeRendererCreationFunction = (canvas: HTMLCanvasElement) => Promise<ThreeRenderer>;
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
 * which includes references to the WebGL renderer, the Three.js instance,
 * and any additional options. It also includes the current error state
 * and a function to reset the error.
 */
interface ThreeContextValue {
    /**
     * Ref to the renderer currently backing the canvas — a `THREE.WebGLRenderer`
     * by default, or whatever `onRendererCreate` returns (e.g. a
     * `THREE.WebGPURenderer`). Null before the canvas element has mounted, and
     * also null while a renderer with an async `init()` step (like
     * `WebGPURenderer`) is still initializing. Reassigned whenever
     * `<ThreeCanvas>`'s underlying canvas element changes.
     */
    rendererRef: React.RefObject<ThreeRenderer | null>;
    /**
     * Ref to the Three.js instance created by the `onCreate` function passed
     * to `ThreeProvider`. Null until the canvas mounts and the instance is
     * successfully created, and is cleared if an error occurs and
     * `disposeOnError` causes the instance to be disposed.
     */
    instanceRef: React.RefObject<ThreeInstance | null>;
    /**
     * Ref holding the options passed through to `onCreate` when the Three.js
     * instance is created. Consumers can mutate this before the canvas mounts
     * to influence how the instance is constructed, since it is read once at
     * creation time rather than being reactive.
     */
    optionsRef: React.RefObject<unknown>;
    /**
     * Multiplier applied to the delta time passed to the instance's `update`
     * method on each animation frame. A value of 1 runs at real time, values
     * above 1 fast-forward the simulation, and values below 1 (including 0)
     * slow it down or pause it without stopping the render loop itself.
     */
    timescale: number;
    /**
     * Updates `timescale`, changing how quickly simulation time advances on
     * subsequent animation frames. Takes effect on the next frame since the
     * current value is read from a ref inside the animation loop.
     */
    setTimescale: (timescale: number) => void;
    /**
     * Whether the animation loop is currently calling the instance's `update`
     * and `render` methods each frame. When false, the render loop keeps
     * running (so resizing and context-loss handling still work) but the
     * scene is frozen in place.
     */
    isUpdating: boolean;
    /**
     * Updates `isUpdating`, pausing or resuming the per-frame
     * `update`/`render` calls on the Three.js instance without tearing down
     * the renderer or canvas.
     */
    setIsUpdating: (isUpdating: boolean) => void;
    /**
     * The current error state, or null if no error has occurred. Set when the
     * instance creation callback throws, the WebGL context is lost, or any
     * other error is reported through `setError`. While set, `<ThreeCanvas>`
     * stops rendering the canvas element.
     */
    error: Error | null;
    /**
     * Reports an error to the provider. Passing an Error updates `error`
     * state, notifies the instance via its optional `onError` method, and
     * (when `disposeOnError` is true) disposes of the instance and renderer.
     * Passing null clears the error, allowing `<ThreeCanvas>` to render the
     * canvas again.
     */
    setError: (err: Error | null) => void;
    /**
     * Clears the current error state. Equivalent to calling `setError(null)`,
     * provided as a convenience so consumers don't need to remember the
     * argument.
     */
    resetError: () => void;
    /**
     * Whether both the Three.js instance and the WebGL renderer have been
     * successfully created and are ready to render. False before the canvas
     * mounts, and reset to false whenever the instance or renderer is
     * disposed due to an error.
     */
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
    /**
     * The tree of components rendered inside the provider, typically
     * including a `<ThreeCanvas>` and, optionally, a `<ThreeError>` fallback.
     */
    children: React.ReactNode;
    /**
     * Called once, when the canvas element first mounts, to construct the
     * Three.js instance (scene, camera, and lifecycle methods) that the
     * provider will drive. Receives the current value of `optionsRef` so
     * callers can pass configuration through without triggering a re-render.
     */
    onCreate: ThreeInstanceCreationFunction;
    /**
     * Optional callback to create the renderer, allowing a custom renderer
     * (e.g. `THREE.WebGPURenderer` — imported from `'three/webgpu'`, not the
     * main `'three'` entry point) to be used instead of the default
     * `THREE.WebGLRenderer`. If the returned renderer exposes an async `init()`
     * method, the provider awaits it before treating the renderer as ready:
     * `rendererRef` stays null and rendering is skipped until it resolves.
     * If not provided, a default `THREE.WebGLRenderer` is created with
     * antialiasing enabled and alpha enabled if the `alpha` prop is greater
     * than 0.
     */
    onRendererCreate?: ThreeRendererCreationFunction;
    /**
     * The Window object used to read `devicePixelRatio` when none is supplied
     * via props. Defaults to `globalThis.window`; overriding it is mainly
     * useful for testing or non-browser rendering environments.
     */
    window?: Window;
    /**
     * The Document used to drive `THREE.Timer`'s visibility-aware clock.
     * Defaults to `globalThis.document`; overriding it is mainly useful for
     * testing or non-browser rendering environments.
     */
    document?: Document;
    /**
     * Whether the Three.js instance and renderer should be disposed
     * automatically when an error is reported. Defaults to true; set to
     * false if a caller needs to inspect or recover the instance/renderer
     * after an error instead of having them torn down immediately.
     */
    disposeOnError?: boolean;
    /**
     * The renderer's clear color, applied on creation and whenever this prop
     * changes. Defaults to black (0x000000).
     */
    color?: number;
    /**
     * The renderer's clear alpha, and whether the canvas is created with an
     * alpha channel at all (enabled whenever this value is greater than 0).
     * Defaults to 0 (fully opaque).
     */
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
 * @returns The current value of the ThreeContext, including the renderer, instance, options, error state, and reset function.
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
declare function ThreeProvider({ children, onCreate, onRendererCreate, window, document, disposeOnError, color, alpha, devicePixelRatio, frameRate, }: ThreeProviderProps): react_jsx_runtime.JSX.Element;

/**
 * Renders the `<canvas>` element that backs the Three.js instance, wiring
 * its ref callback to `ThreeProvider` so the renderer and instance are
 * created as soon as the element mounts. Renders nothing while the
 * provider is in an error state, since there is no valid renderer to
 * display until the error is cleared.
 */
declare function ThreeCanvas(props: React.CanvasHTMLAttributes<HTMLCanvasElement>): react_jsx_runtime.JSX.Element | null;

/**
 * Renders its children as a fallback UI whenever `ThreeProvider` is in an
 * error state, and renders nothing otherwise. Pass any `<div>` props
 * (e.g. `className`) to style the fallback container.
 */
declare function ThreeError(props: React.HTMLAttributes<HTMLDivElement>): react_jsx_runtime.JSX.Element | null;

export { ThreeCanvas, type ThreeCanvasObserverFunction, type ThreeContextValue, ThreeError, type ThreeInstance, type ThreeInstanceCreationFunction, ThreeProvider, type ThreeRenderer, type ThreeRendererCreationFunction, WebGLContextLostError, useThree };
