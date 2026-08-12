import * as THREE from 'three';

import { isDebugging } from '@/env';

import type { TestInstance } from './types';

const createInstance = (options?: unknown): TestInstance => {
  // root scene
  const scene = new THREE.Scene();

  // camera
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);

  const onResize = (canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const aspect = rect.width / rect.height;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  };

  const setCameraPosition = (x: number, y: number, z: number) => {
    camera.position.set(x, y, z);
  };

  // initial camera position
  const cameraOptions = options as { cameraPosition?: { x: number; y: number; z: number } };
  const initialCameraPosition = cameraOptions?.cameraPosition || { x: 0, y: 0, z: 5 };
  setCameraPosition(initialCameraPosition.x, initialCameraPosition.y, initialCameraPosition.z);

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

  // Main update function that will be called on each animation frame, which currently updates the cube's rotation.
  const update = (delta: number) => {
    updateCube(delta);
  };

  const render = (renderer: THREE.WebGLRenderer) => {
    renderer.render(scene, camera);
  };

  // Function to handle canvas resizing, updating the camera's aspect ratio and projection matrix accordingly.
  const dispose = () => {
    geometry.dispose();
    material.dispose();
  };

  // create a welcome message in the console with styling
  if (isDebugging) {
    console.log(
      '%cThree.js instance created',
      'color: green; font-weight: bold; background: #000; padding: 2px 4px; border-radius: 4px;'
    );
  }

  return {
    update,
    render,
    onResize,
    dispose,
    setCameraPosition,
  };
};

export default createInstance;
export type { TestInstance };
