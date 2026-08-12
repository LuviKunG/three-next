# three-next

A lightweight React/Next.js integration layer for Three.js. It manages the WebGL renderer lifecycle, animation loop, resize handling, WebGL context loss/restoration, and error boundaries — so you only need to implement your scene logic.

---

## Architecture Overview

```text
ThreeProvider          – owns the renderer, animation loop, and error state
  └── ThreeCanvas      – renders <canvas>, hidden when error is present
  └── ThreeError       – renders children only when error is present
  └── (your UI)        – access context via useThree()
```

The provider calls your `onCreate` factory once to create a `ThreeInstance`. It then drives the animation loop itself (`requestAnimationFrame` → `instance.update?.(delta)` → `instance.render?.(renderer, delta)`). Your instance is responsible for calling `renderer.render()` (or running a post-processing composer) inside its `render` method.

---

## Core Concept: ThreeInstance

Everything revolves around the `ThreeInstance` interface. You implement it; the provider consumes it.

```ts
// src/lib/three-next/types.d.ts
type ThreeInstance = {
  update?: (delta: number) => void; // called every frame; delta is seconds
  render?: (renderer: THREE.WebGLRenderer, delta: number) => void; // responsible for renderer.render()
  onResize?: (canvas: HTMLCanvasElement) => void; // called on mount and whenever the canvas size changes
  onError?: (error: Error) => void; // called when an error is set on the provider
  dispose: () => void; // required — called on unmount or error
};
```

> **Note:** `scene` and `camera` are **not** part of the `ThreeInstance` interface. They are implementation details of your factory — keep them in closure scope or in a subtype you define.

If `render` is not implemented, nothing is drawn to the screen. The provider will not call `renderer.render()` on your behalf; you must call it inside your `render` method.

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
  devicePixelRatio={undefined} // optional — overrides window.devicePixelRatio; clamped to 0.1–4.0
  frameRate={undefined} // optional — caps the animation loop to N FPS; clamped to 1–120 (default: uncapped)
  window={globalThis.window} // optional — Window reference (default: globalThis.window)
  document={globalThis.document} // optional — Document reference (default: globalThis.document)
>
  {children}
</ThreeProvider>
```

**Lifecycle managed by the provider:**

- Creates `THREE.WebGLRenderer` when `<ThreeCanvas>` mounts, with `antialias: true`.
- Sets the renderer pixel ratio from the `devicePixelRatio` prop, clamped to `0.1`–`4.0`. A missing or invalid value (`undefined`, `NaN`, `Infinity`, `<= 0`) falls back to `window.devicePixelRatio`, or `1` when no `window` is available. The prop is applied live via `setPixelRatio` on the existing renderer — the renderer is never recreated for a ratio change. Because `setPixelRatio` resizes and clears the drawing buffer, the provider calls `instance.render?.(renderer, 0)` immediately afterwards so the new buffer is repainted before the browser paints, avoiding a flash.
- Calls `onCreate(optionsRef.current)` once to create your instance.
- Runs `requestAnimationFrame` loop via `THREE.Timer` connected to the `document` prop; pauses delta accumulation while the tab is hidden.
- Caps the loop to `frameRate` FPS when set, clamped to `1`–`120`. An invalid or missing value (`undefined`, `NaN`, `Infinity`, `<= 0`) runs uncapped at the display refresh rate. Skipped frames call neither `instance.update` nor `instance.render`, and the timer is only advanced on frames that run — so `update`/`render` always receive the full delta since the previous rendered frame. The cadence is kept on a fixed interval grid (with ~1 ms of slack so a cap equal to the refresh rate is not halved by vsync jitter) and resyncs after a stall instead of emitting catch-up frames. The clamped value is stored in a ref, so changing `frameRate` takes effect on the next frame without restarting the loop or recreating anything.
- Uses `ResizeObserver` on the canvas element to detect size changes (covers window resize, container/layout changes, or any CSS-driven resize). On each change: reads dimensions from `entry.contentRect` (avoiding a synchronous layout reflow that `getBoundingClientRect()` would trigger), updates the renderer size, calls `instance.onResize?.(canvas)`, then immediately calls `instance.render?.(renderer, 0)` to repaint before the browser paints — preventing a blank-canvas flash.
- Listens for `webglcontextlost` / `webglcontextrestored` on the canvas.
  - Context lost → calls `instance.onError?.(err)` → sets error state → `<ThreeCanvas>` unmounts, `<ThreeError>` renders.
  - Context restored → clears error state → normal rendering resumes.
- If `disposeOnError=true`, disposes the instance and renderer when an error occurs.

#### Live `frameRate` and `devicePixelRatio` updates

Both props are validated, clamped, and applied to the running renderer — you can drive them from React state (or query params) and the change takes effect without remounting `<ThreeProvider>` or `<ThreeCanvas>`.

| Prop               | Valid range | Invalid / omitted falls back to                | Applied by                                                        |
| ------------------ | ----------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| `frameRate`        | `1`–`120`   | uncapped (display refresh rate)                | ref read by the animation loop — effective on the next frame      |
| `devicePixelRatio` | `0.1`–`4.0` | `window.devicePixelRatio`, or `1` if no window | `renderer.setPixelRatio()` + an immediate `instance.render(…, 0)` |

A value is "invalid" when it is `undefined`, not finite (`NaN`, `Infinity`), or `<= 0`. In-range-but-out-of-bounds values are **clamped, not rejected** — `frameRate={500}` runs at 120 FPS and `devicePixelRatio={8}` renders at 4.0. Clamping uses `THREE.MathUtils.clamp`; the bounds live in `context.tsx` as `MIN_FRAME_RATE` / `MAX_FRAME_RATE` and `MIN_DEVICE_PIXEL_RATIO` / `MAX_DEVICE_PIXEL_RATIO`.

```tsx
// Driven from URL query params (?frameRate=30&devicePixelRatio=1)
const { devicePixelRatio, frameRate } = useQueryParams();

<ThreeProvider
  onCreate={createInstance}
  devicePixelRatio={devicePixelRatio ?? undefined}
  frameRate={frameRate ?? undefined}
>
  <Scene />
</ThreeProvider>;
```

Notes on the pixel-ratio path:

- `setPixelRatio` resizes and clears the drawing buffer, so the provider immediately calls `instance.render?.(renderer, 0)` to repaint the new buffer — without it the canvas flashes blank until the next animation frame.
- `instance.onResize` is **not** called for a pixel-ratio change: the canvas CSS size is unchanged, so camera aspect and any size-derived state stay valid. Only `ResizeObserver` (an actual element size change) triggers `onResize`.
- The ratio is applied by its own effect, separate from renderer creation, so **the renderer is never recreated for a ratio change** — recreating it would rebuild every compiled program, render target and uploaded GPU resource, and could not change the already-created WebGL context's attributes anyway.
- That effect also runs once right after the renderer is created (and after any rebuild caused by a new canvas or a `color`/`alpha` change), because a fresh `THREE.WebGLRenderer` starts at a pixel ratio of `1` and would otherwise lose the configured value.

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

The hook is generic — pass your `ThreeInstance` subtype to get a typed `instanceRef`:

```ts
const {
  rendererRef, // React.RefObject<THREE.WebGLRenderer | null>
  instanceRef, // React.RefObject<T | null> — typed when useThree<T>() is used
  optionsRef, // React.RefObject<unknown> — write options here before instance creation
  timescale, // number — delta multiplier applied each frame (default: 1.0)
  setTimescale, // (timescale: number) => void — change the playback speed
  isUpdating, // boolean — when false, update/render are skipped each frame (default: true)
  setIsUpdating, // (isUpdating: boolean) => void — pause or resume the animation loop
  error, // Error | null — current error state
  setError, // (err: Error | null) => void — manually set or clear the error state
  resetError, // () => void — clears the error and re-triggers instance creation
  isReady, // boolean — true once the instance and renderer are both initialized
  canvasObserverRef, // internal callback ref used by <ThreeCanvas> — do not use directly
} = useThree<MyInstance>();
```

**Common patterns:**

```ts
// Typed instance access
interface MyInstance extends ThreeInstance {
  setCameraPosition: (x: number, y: number, z: number) => void;
}
const { instanceRef } = useThree<MyInstance>();
instanceRef.current?.setCameraPosition(0, 0, 5);

// Read the renderer (e.g. to force WebGL context loss in tests)
const { rendererRef } = useThree();
const gl = rendererRef.current?.getContext();

// Sync React state into options so it's available if the instance is recreated
const { optionsRef } = useThree();
useEffect(() => {
  optionsRef.current = { cameraPosition: { x: 0, y, z } };
}, [y, z, optionsRef]);

// Gate UI on initialization
const { isReady } = useThree();
if (!isReady) return <Spinner />;

// Pause and resume the animation loop
const { setIsUpdating } = useThree();
setIsUpdating(false); // freeze — update() and render() are skipped each frame
setIsUpdating(true);  // resume

// Slow-motion or fast-forward playback
const { setTimescale } = useThree();
setTimescale(0.5); // half speed — delta passed to update/render is halved
setTimescale(2.0); // double speed
setTimescale(1.0); // normal speed (default)
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

Create a factory function in your own module (e.g. `src/core/three/instance.ts`). Return an object that satisfies `ThreeInstance`. The `render` method is where you call `renderer.render()` — or run a post-processing composer. Add any extra methods you need on top.

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

  // Scene objects
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial({ color: 0x0077ff });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  // Optional: update — called every frame with delta in seconds
  const update = (delta: number) => {
    cube.rotation.x += THREE.MathUtils.degToRad(45) * delta;
    cube.rotation.y += THREE.MathUtils.degToRad(45) * delta;
  };

  // Required for anything to appear: render — call renderer.render() here
  const render = (renderer: THREE.WebGLRenderer) => {
    renderer.render(scene, camera);
  };

  // Optional: onResize — called on mount and whenever the canvas element changes size
  const onResize = (canvas: HTMLCanvasElement) => {
    const { width, height } = canvas.getBoundingClientRect();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
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

  return { update, render, onResize, dispose, setCameraPosition };
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
    <ThreeProvider onCreate={createInstance} disposeOnError color={0x333333} alpha={1}>
      <Scene />
    </ThreeProvider>
  );
}
```

**Option B — Use `<ThreeError>` component (optional convenience)**

`<ThreeError>` and `<ThreeCanvas>` both read `error` internally, so they automatically swap in/out without explicit conditionals.

```tsx
'use client';

import { ThreeProvider, ThreeCanvas, ThreeError, useThree } from '@/lib/three-next';
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
    <ThreeProvider onCreate={createInstance} disposeOnError color={0x333333} alpha={1}>
      <Scene />
    </ThreeProvider>
  );
}
```

### Step 3 — Drive React state into your instance

Use `optionsRef` to push initial configuration and `instanceRef` to call methods live.

```tsx
function Scene() {
  const { instanceRef, optionsRef } = useThree<MyInstance>();
  const [posY, setPosY] = useState(0);
  const [posZ, setPosZ] = useState(5);

  // Keep optionsRef in sync so instance recreations (after error reset) use current values
  useEffect(() => {
    optionsRef.current = { cameraPosition: { x: 0, y: posY, z: posZ } };
  }, [posY, posZ, optionsRef]);

  // Drive the live instance directly
  useEffect(() => {
    instanceRef.current?.setCameraPosition(0, posY, posZ);
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
        onChange={e => setPosY(parseFloat(e.target.value))}
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
  error ? <MyErrorUI onRetry={resetError} /> : <ThreeCanvas className='h-full w-full' />;
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

```text
webglcontextlost event
  → instance.onError?.(err) called
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
  useThree, // hook — generic: useThree<MyInstance>()
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
- The animation loop always runs (`requestAnimationFrame`). When `isUpdating` is `true` and there is no active error: `update()` is called only when `delta > 0` (skipped when the tab is hidden, since `THREE.Timer` stops accumulating time via the Page Visibility API), but `render()` is called every frame regardless of delta. Use `setIsUpdating(false)` to pause — when `isUpdating` is `false`, both `update()` and `render()` are skipped each frame without stopping the `requestAnimationFrame` loop. Use `setTimescale` to scale the delta passed to `update()` and `render()` (e.g. `0.5` for half-speed, `2.0` for double-speed). Both values default to `true` / `1.0` respectively.
- **The instance owns rendering.** The provider calls `instance.render?.(renderer, delta)` each frame. If `render` is not defined, nothing is drawn. This lets you use a post-processing composer or any other rendering strategy without provider changes.
- `optionsRef` is a plain mutable ref (`React.RefObject<unknown>`). Writing to it does not trigger a re-render and does not recreate the instance. It is read only when `onCreate` is called (on initial mount and after `resetError`).
- `rendererRef` and `instanceRef` are also mutable refs. Reading `.current` outside of React effects is safe for imperative operations (e.g. forcing context loss in tests).
- `devicePixelRatio` defaults to `window.devicePixelRatio`. Pass the prop explicitly to override it (e.g. to cap at 2 for performance); the value is clamped to `0.1`–`4.0` and can be changed at runtime. `frameRate` is clamped to `1`–`120` and also applies at runtime — see [Live `frameRate` and `devicePixelRatio` updates](#live-framerate-and-devicepixelratio-updates).
- The `window` and `document` props default to `globalThis.window` and `globalThis.document`. Pass custom references when testing in a non-browser environment (e.g. jsdom) or when you need to scope event listeners to a specific window (e.g. iframes).

---

## License

This project is licensed under the MIT License — see the [LICENSE.md](LICENSE.md) file for details.

- `isReady` becomes `true` once both the instance and renderer have been successfully created. Use it to gate UI that depends on initialization being complete.
