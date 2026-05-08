import * as THREE from 'three';

type ThreeInstance = {
  scene: THREE.Scene;
  camera: THREE.Camera;
  update: (delta: number) => void;
  onResize: (canvas: HTMLCanvasElement) => void;
  dispose: () => void;
};

export type { ThreeInstance };
