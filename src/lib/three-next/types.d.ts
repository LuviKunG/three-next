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

export type { ThreeInstance };
