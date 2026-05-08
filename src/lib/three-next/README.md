# three-next

A lightweight React/Next.js integration layer for Three.js. It manages the WebGL renderer lifecycle, animation loop, resize handling, WebGL context loss/restoration, and error boundaries — so you only need to implement your scene logic.

---

## Architecture Overview

```
ThreeProvider          – owns the renderer, animation loop, and error state
  └── ThreeCanvas      – renders <canvas>, hidden when error is present
  └── ThreeError       – renders children only when error is present
  └── (your UI)        – access context via useThree()
```

The provider calls your `onCreate` factory once to create a `ThreeInstance`. It then drives the render loop itself (`requestAnimationFrame` → `instance.update(delta)` → `renderer.render(scene, camera)`). You never manage the loop.

---

## Core Concept: ThreeInstance

Everything revolves around the `ThreeInstance` interface. You implement it; the provider consumes it.

```ts
// src/lib/three-next/types.d.ts
type ThreeInstance = {
  scene: THREE.Scene;
  camera: THREE.Camera;
  update: (delta: number) => void; // called every frame; delta is seconds
  onResize: (canvas: HTMLCanvasElement) => void; // called on mount and window resize
  dispose: () => void; // called when provider unmounts or on error
};
```

Your factory function signature must match:

```ts
type ThreeInstanceCreationFunction = (options?: unknown) => ThreeInstance;
```

The `options` argument receives the current value of `optionsRef.current` at the moment the instance is created. Use it to pass initial configuration (e.g. camera position) from React state into your Three.js setup.

---

## API Reference

### `<ThreeProvider>`

Root provider. Must wrap all components that use `useThree`, `ThreeCanvas`, or `ThreeError`.

```tsx
<ThreeProvider
  onCreate={createInstance} // required — your ThreeInstanceCreationFunction
  disposeOnError={true} // optional — dispose instance+renderer on error (default: true)
  color={0x000000} // optional — WebGLRenderer clear color (default: 0x000000)
  alpha={0} // optional — clear alpha 0–1 (default: 0; >0 enables alpha in renderer)
  window={globalThis.window} // optional — Window reference (default: globalThis.window)
  document={globalThis.document} // optional — Document reference (default: globalThis.document)
>
  {children}
</ThreeProvider>
```

**Lifecycle managed by the provider:**

- Creates `THREE.WebGLRenderer` when `<ThreeCanvas>` mounts, with `antialias: true` and `devicePixelRatio` set from the `window` prop automatically.
- Calls `onCreate(optionsRef.current)` once to create your instance.
- Runs `requestAnimationFrame` loop via `THREE.Timer` connected to the `document` prop; pauses delta accumulation while the tab is hidden.
- Calls `instance.onResize(canvas)` and updates renderer size on `window.resize`.
- Listens for `webglcontextlost` / `webglcontextrestored` on the canvas.
  - Context lost → sets error state → `<ThreeCanvas>` unmounts, `<ThreeError>` renders.
  - Context restored → clears error state → normal rendering resumes.
- If `disposeOnError=true`, disposes the instance and renderer when an error occurs.

---

### `<ThreeCanvas>`

Renders the `<canvas>` element. Accepts all standard `<canvas>` HTML attributes (e.g. `className`, `style`).

```tsx
<ThreeCanvas className='h-full w-full' />
```

- Returns `null` when there is an active error, so the canvas disappears automatically.
- Must be rendered inside `<ThreeProvider>`.

---

### `<ThreeError>` (optional)

A convenience component that renders its `children` only when there is an active error. Accepts all standard `<div>` HTML attributes.

```tsx
<ThreeError className='absolute inset-0 flex items-center justify-center'>
  <p>Something went wrong.</p>
  <button onClick={resetError}>Retry</button>
</ThreeError>
```

- Returns `null` when there is no error.
- Must be rendered inside `<ThreeProvider>`.
- **This component is optional.** You can handle error rendering yourself using the `error` value from `useThree()` — see [Handling errors without `<ThreeError>`](#handling-errors-without-threeerror).

---

### `useThree()`

Hook that returns the current `ThreeContextValue`. Must be called inside `<ThreeProvider>`.

```ts
const {
  rendererRef, // React.RefObject<THREE.WebGLRenderer | null>
  instanceRef, // React.RefObject<ThreeInstance | null>
  optionsRef, // React.RefObject<unknown> — write options here before instance creation
  error, // Error | null — current error state
  resetError, // () => void — clears the error and re-triggers instance creation
  onCreate, // ThreeInstanceCreationFunction — the factory passed to <ThreeProvider>
  canvasObserverRef, // internal callback ref used by <ThreeCanvas> — do not use directly
} = useThree();
```

**Common patterns:**

```ts
// Read the renderer (e.g. to force WebGL context loss in tests)
const gl = rendererRef.current?.getContext();

// Read or call methods on your instance
const { setCameraPosition } = instanceRef.current as MyInstance;

// Sync React state into options so it's available if the instance is recreated
useEffect(() => {
  optionsRef.current = { cameraPosition: { x: 0, y, z } };
}, [y, z, optionsRef]);
```

---

### `WebGLContextLostError`

A typed `Error` subclass thrown (and set as the error state) when the WebGL context is lost.

```ts
import { WebGLContextLostError } from '@/lib/three-next';

if (error instanceof WebGLContextLostError) {
  // show context-specific recovery UI
}
```

---

## Step-by-Step Implementation Guide

### Step 1 — Implement `ThreeInstance`

Create a factory function in your own module (e.g. `src/core/three/instance.ts`). Return an object that satisfies `ThreeInstance`. Add any extra methods you need on top.

```ts
import * as THREE from 'three';
import type { ThreeInstance } from '@/lib/three-next';

interface MyInstance extends ThreeInstance {
  setCameraPosition: (x: number, y: number, z: number) => void;
}

export const createInstance = (options?: unknown): MyInstance => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);

  // Apply initial options
  const opts = options as {
    cameraPosition?: { x: number; y: number; z: number };
  } | null;
  const pos = opts?.cameraPosition ?? { x: 0, y: 0, z: 5 };
  camera.position.set(pos.x, pos.y, pos.z);
  scene.add(camera);

  // Scene objects
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial({ color: 0x0077ff });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  // Required: update — called every frame with delta in seconds
  const update = (delta: number) => {
    cube.rotation.x += THREE.MathUtils.degToRad(45) * delta;
    cube.rotation.y += THREE.MathUtils.degToRad(45) * delta;
  };

  // Required: onResize — called on mount and window resize
  const onResize = (canvas: HTMLCanvasElement) => {
    const { width, height } = canvas.getBoundingClientRect();
    (camera as THREE.PerspectiveCamera).aspect = width / height;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  };

  // Required: dispose — release GPU resources
  const dispose = () => {
    geometry.dispose();
    material.dispose();
  };

  // Custom method
  const setCameraPosition = (x: number, y: number, z: number) => {
    camera.position.set(x, y, z);
  };

  return { scene, camera, update, onResize, dispose, setCameraPosition };
};
```

### Step 2 — Wire up the provider and canvas

Wrap your page in `<ThreeProvider>` and render `<ThreeCanvas>` for WebGL output. Handling errors is optional — pick the approach that fits your needs.

**Option A — Use `error` from `useThree()` directly (recommended)**

Read `error` and `resetError` from `useThree()` and write your own conditional rendering. This is the most flexible approach.

```tsx
'use client';

import { ThreeProvider, ThreeCanvas, useThree } from '@/lib/three-next';
import { createInstance } from '@/core/three';

function Scene() {
  const { error, resetError } = useThree();
  return (
    <div className='relative h-screen w-screen'>
      {error ? (
        <div className='absolute inset-0 flex items-center justify-center'>
          <div>
            <p>WebGL error occurred.</p>
            <button onClick={resetError}>Retry</button>
          </div>
        </div>
      ) : (
        <ThreeCanvas className='h-full w-full' />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <ThreeProvider
      onCreate={createInstance}
      disposeOnError
      color={0x333333}
      alpha={1}
    >
      <Scene />
    </ThreeProvider>
  );
}
```

**Option B — Use `<ThreeError>` component (optional convenience)**

`<ThreeError>` and `<ThreeCanvas>` both read `error` internally, so they automatically swap in/out without explicit conditionals.

```tsx
'use client';

import {
  ThreeProvider,
  ThreeCanvas,
  ThreeError,
  useThree,
} from '@/lib/three-next';
import { createInstance } from '@/core/three';

function Scene() {
  const { resetError } = useThree();
  return (
    <div className='relative h-screen w-screen'>
      <ThreeCanvas className='h-full w-full' />
      <ThreeError className='absolute inset-0 flex items-center justify-center'>
        <div>
          <p>WebGL error occurred.</p>
          <button onClick={resetError}>Retry</button>
        </div>
      </ThreeError>
    </div>
  );
}

export default function Page() {
  return (
    <ThreeProvider
      onCreate={createInstance}
      disposeOnError
      color={0x333333}
      alpha={1}
    >
      <Scene />
    </ThreeProvider>
  );
}
```

### Step 3 — Drive React state into your instance

Use `optionsRef` to push initial configuration and `instanceRef` to call methods live.

```tsx
function Scene() {
  const { instanceRef, optionsRef } = useThree();
  const [posY, setPosY] = useState(0);
  const [posZ, setPosZ] = useState(5);

  // Keep optionsRef in sync so instance recreations (after error reset) use current values
  useEffect(() => {
    optionsRef.current = { cameraPosition: { x: 0, y: posY, z: posZ } };
  }, [posY, posZ, optionsRef]);

  // Drive the live instance directly
  useEffect(() => {
    if (!instanceRef.current) return;
    (instanceRef.current as MyInstance).setCameraPosition(0, posY, posZ);
  }, [posY, posZ, instanceRef]);

  return (
    <>
      <ThreeCanvas className='h-full w-full' />
      <input
        type='range'
        min={-10}
        max={10}
        step={0.1}
        value={posY}
        onChange={(e) => setPosY(parseFloat(e.target.value))}
      />
    </>
  );
}
```

---

## Handling errors without `<ThreeError>`

`<ThreeError>` is a thin convenience wrapper — it just checks `error` from context and conditionally renders a `<div>`. You can replicate (and extend) this yourself using `error` and `resetError` from `useThree()`.

```tsx
const { error, resetError } = useThree();

// Conditional render
{
  error ? (
    <MyErrorUI onRetry={resetError} />
  ) : (
    <ThreeCanvas className='h-full w-full' />
  );
}

// Type-narrow the error for specific handling
import { WebGLContextLostError } from '@/lib/three-next';

if (error instanceof WebGLContextLostError) {
  // context was lost — browser may restore it automatically
} else if (error) {
  // initialization or other runtime error
}
```

`<ThreeCanvas>` already hides itself on error, so if you render your own error UI alongside it you can leave both in the tree — the canvas will unmount automatically.

```tsx
<div className='relative h-screen w-screen'>
  <ThreeCanvas className='h-full w-full' />
  {error && (
    <div className='absolute inset-0 flex items-center justify-center'>
      <button onClick={resetError}>Retry</button>
    </div>
  )}
</div>
```

---

## Error Handling Flow

```
webglcontextlost event
  → error state set (WebGLContextLostError)
  → ThreeCanvas returns null  (canvas unmounts)
  → ThreeError renders children
  → if disposeOnError=true: instance.dispose() + renderer.dispose()

webglcontextrestored event  (browser auto-restores context)
  → error state cleared
  → ThreeCanvas mounts again  (new canvas element)
  → provider re-runs onCreate with current optionsRef.current
  → animation loop resumes

resetError() called manually
  → same as context-restored path above
```

---

## Exports

```ts
import {
  ThreeProvider, // component
  ThreeCanvas, // component
  ThreeError, // component
  useThree, // hook
  WebGLContextLostError, // error class
  type ThreeInstance, // implement this for your scene
  type ThreeInstanceCreationFunction, // (options?: unknown) => ThreeInstance
  type ThreeCanvasObserverFunction, // internal — rarely needed
  type ThreeContextValue, // return type of useThree()
} from '@/lib/three-next';
```

---

## Constraints and Notes

- All components and the hook require a `'use client'` boundary — they use React hooks and browser APIs.
- The animation loop always runs (`requestAnimationFrame`). Frame rendering is skipped when `delta === 0` (tab hidden), but the loop itself keeps ticking. Pause/stop logic must be implemented inside `update()` if needed.
- `optionsRef` is a plain mutable ref (`React.RefObject<unknown>`). Writing to it does not trigger a re-render and does not recreate the instance. It is read only when `onCreate` is called (on initial mount and after `resetError`).
- `rendererRef` and `instanceRef` are also mutable refs. Reading `.current` outside of React effects is safe for imperative operations (e.g. forcing context loss in tests).
- `devicePixelRatio` is set automatically from `window.devicePixelRatio` when the renderer is created. You do not need to set it yourself.
- The `window` and `document` props default to `globalThis.window` and `globalThis.document`. Pass custom references when testing in a non-browser environment (e.g. jsdom) or when you need to scope event listeners to a specific window (e.g. iframes).
