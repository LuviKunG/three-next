import * as THREE from 'three';

import { isDebugging } from '@/env';

interface Instance {
  renderer: THREE.WebGLRenderer;
  setCameraPosition: (x: number, y: number, z: number) => void;
  dispose: () => void;
}

const createInstance = (
  window: Window,
  document: Document,
  canvas: HTMLCanvasElement
): Instance => {
  // renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });

  renderer.setClearColor(0x000000, 0);

  const updateRendererSize = () => {
    const rect = canvas.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
  };

  // root scene
  const scene = new THREE.Scene();

  // camera
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);

  const updateCameraAspect = () => {
    const rect = canvas.getBoundingClientRect();
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  };

  const setCameraPosition = (x: number, y: number, z: number) => {
    camera.position.set(x, y, z);
  };

  // initial camera position
  const cameraPosition = { x: 0, y: 0, z: 5 };
  setCameraPosition(cameraPosition.x, cameraPosition.y, cameraPosition.z);

  scene.add(camera);

  // lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  // Add spinning cube for testing
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial({ color: 0x0077ff });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  // Function to update the cube's rotation based on the elapsed time.
  const updateCube = (delta: number) => {
    const anglePerSecond = 45;
    const anglePerFrame = THREE.MathUtils.degToRad(anglePerSecond) * delta;
    cube.rotation.x += anglePerFrame;
    cube.rotation.y += anglePerFrame;
  };

  // update handler
  const timer = new THREE.Timer();

  timer.connect(document);

  let animationFrameId: number;

  const update = (time: DOMHighResTimeStamp) => {
    animationFrameId = requestAnimationFrame(update);
    timer.update(time);
    const delta = timer.getDelta();
    updateCube(delta);
    renderer.render(scene, camera);
  };

  animationFrameId = requestAnimationFrame(update);

  // resize handler
  const onResize = () => {
    updateRendererSize();
    updateCameraAspect();
  };

  window.addEventListener('resize', onResize);

  // call it once to set initial size
  onResize();

  // dispose function
  const dispose = () => {
    renderer.dispose();
    window.removeEventListener('resize', onResize);
    cancelAnimationFrame(animationFrameId);
  };

  // create a welcome message in the console with styling
  if (isDebugging) {
    console.log(
      '%cThree.js instance created',
      'color: green; font-weight: bold; background: #000; padding: 2px 4px; border-radius: 4px;'
    );
  }

  return {
    renderer,
    setCameraPosition,
    dispose,
  };
};

export default createInstance;
export type { Instance };
