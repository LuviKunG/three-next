// `THREE.WebGPURenderer` is NOT exported from the main 'three' entry point —
// importing it from there resolves to `undefined` at runtime even though it
// type-checks fine (the ambient `THREE` namespace still declares the type).
// It has to be imported from the 'three/webgpu' subpath instead.
import { WebGPURenderer } from 'three/webgpu';

import type { ThreeRendererCreationFunction } from '@/lib/three-next';

const createCustomRenderer: ThreeRendererCreationFunction = async (canvas: HTMLCanvasElement) => {
  // Create a custom WebGPURenderer with specific options. `ThreeProvider`
  // awaits `renderer.init()` before treating it as ready, so if the browser
  // has no WebGPU support the resulting rejection surfaces through
  // `useThree().error` instead of throwing at render time.
  const renderer = new WebGPURenderer({
    canvas,
    antialias: true,
    alpha: true, // Enable alpha for transparency
  });
  await renderer.init();
  return renderer;
};

export { createCustomRenderer };
