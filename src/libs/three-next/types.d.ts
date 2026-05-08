import * as THREE from 'three';

type ThreeInstance = {
  renderer?: THREE.WebGLRenderer;
  dispose: () => void;
};

export type { ThreeInstance };
