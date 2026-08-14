import * as THREE from 'three';
import type { WebGPURenderer } from 'three/webgpu';

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

export type { ThreeInstance, ThreeRenderer };
