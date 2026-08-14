# three-next

<div align="center">
  <img src="./assets/logo.png" alt="@luvikung/three-next logo" width="600px">
</div>

[![npm version](https://shields.io/npm/v/@luvikung/three-next)](https://www.npmjs.com/package/@luvikung/three-next)
[![npm downloads](https://shields.io/npm/dm/@luvikung/three-next)](https://npmtrends.com/@luvikung/three-next)
[![npm license](https://shields.io/npm/l/@luvikung/three-next)](https://www.npmjs.com/package/@luvikung/three-next)

A lightweight React/Next.js integration layer for Three.js. It manages the WebGL renderer lifecycle, animation loop, resize handling, WebGL context loss/restoration, and error boundaries — so you only need to implement your scene logic.

`react` and `three` are peer dependencies.

## Why "three-next" not "R3F"?

- **Fully customizable** — build Three.js instances natively, with full TypeScript support via `@types/three`.
- **Fully custom shader initialization** — you own instance creation, so advanced shader pipelines (e.g. Subsurface Scattering with Screen Space Shadows) that need custom setup before the Three.js instance exists are straightforward to wire up.
- **No forced FPS cap** — R3F caps your framerate for performance reasons; here the animation loop is uncapped by default, with an optional `frameRate` prop if you want to cap it yourself, live, in real time.
- **Lightweight** — it doesn't rely on a React reconciler; your scene is plain Three.js, not React components.
- **Debuggable** — works naturally with tools like [stats.js](https://github.com/mrdoob/stats.js).
- **Error handling built in** — WebGL context loss is caught for you as a typed `WebGLContextLostError`, your instance gets an `onError` callback, and the provider swaps to your error UI and disposes cleanly — no need to hand-roll context-loss recovery.

## Install

```bash
npm install @luvikung/three-next@latest
```

## Getting started

Implement a `ThreeInstance` factory with your scene setup, then wrap it in `<ThreeProvider>` and render `<ThreeCanvas>`.

```tsx
'use client';

import * as THREE from 'three';
import { ThreeProvider, ThreeCanvas, type ThreeInstance } from '@luvikung/three-next';

function createInstance(): ThreeInstance {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  camera.position.z = 5;

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshStandardMaterial({ color: 0x0077ff })
  );
  scene.add(cube, new THREE.AmbientLight(0xffffff, 1));

  return {
    update: delta => {
      cube.rotation.x += delta;
      cube.rotation.y += delta;
    },
    render: renderer => renderer.render(scene, camera),
    onResize: canvas => {
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    },
    dispose: () => {
      cube.geometry.dispose();
      (cube.material as THREE.Material).dispose();
    },
  };
}

export default function Page() {
  return (
    <ThreeProvider onCreate={createInstance}>
      <ThreeCanvas className='h-screen w-screen' />
    </ThreeProvider>
  );
}
```

That's it — the provider owns the renderer, the animation loop, resizing, and context-loss recovery. Your instance just decides what to draw.

## Learn more

- [Full API reference](docs/API.md) — every prop, hook value, and lifecycle detail
- [Changelog](CHANGELOG.md)

## License

MIT — see [LICENSE.md](LICENSE.md).
