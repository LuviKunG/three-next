'use client';

import { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';

import { useThree, ThreeCanvas, ThreeProvider } from '@/lib/three-next';
import { createInstance, type TestInstance } from '@/core/three';
import { createCustomRenderer } from '@/core/three/renderer';
import useLocalStorage from '@/hooks/useLocalStorage';
import useTheme from '@/hooks/useTheme';
import useQueryParams from './hooks/useQueryParams';

function PageContent(props: {
  frameRate: number | null;
  setFrameRate: (value: number | null) => void;
  devicePixelRatio: number | null;
  setDevicePixelRatio: (value: number | null) => void;
}) {
  // Access the Three.js instance and related functions from the context.
  const {
    rendererRef,
    instanceRef,
    optionsRef,
    timescale,
    setTimescale,
    isUpdating,
    setIsUpdating,
    error,
    setError,
    resetError,
  } = useThree<TestInstance>();
  // Access the current theme (light/dark) for styling purposes.
  const theme = useTheme();

  // State to toggle the visibility of the debugging area, hidden by default.
  const [showDebug, setShowDebug] = useState(false);

  // State for camera position controls
  const [cameraPositionY, setCameraPositionY] = useLocalStorage<number>('cameraPositionY', 0);
  // State for camera distance control
  const [cameraPositionZ, setCameraPositionZ] = useLocalStorage<number>('cameraPositionZ', 5);

  // Function to force a lost WebGL context on the Three.js instance, with error handling if the instance or renderer is not available.
  // Only meaningful for a THREE.WebGLRenderer — a WebGPURenderer's context
  // isn't a WebGLRenderingContext and has no 'WEBGL_lose_context' extension.
  const forceLostContext = useCallback(() => {
    if (!instanceRef.current) {
      console.warn('Instance not available to force lost context');
      return;
    }
    const renderer = rendererRef.current;
    if (!renderer) {
      console.warn('Renderer not available to force lost context');
      return;
    }
    if (!(renderer instanceof THREE.WebGLRenderer)) {
      console.warn('Forcing lost context is only supported for WebGLRenderer');
      return;
    }
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) {
      ext.loseContext();
    }
  }, [rendererRef, instanceRef]);

  // Utility function to simulate a lost WebGL context after a specified delay, then automatically restore it.
  // Only meaningful for a THREE.WebGLRenderer — see `forceLostContext` above.
  const timeoutLostContext = useCallback(
    (delay: number) => {
      if (!instanceRef.current) {
        console.warn('Instance not available to force lost context');
        return;
      }
      const renderer = rendererRef.current;
      if (!renderer) {
        console.warn('Renderer not available to force lost context');
        return;
      }
      if (!(renderer instanceof THREE.WebGLRenderer)) {
        console.warn('Forcing lost context is only supported for WebGLRenderer');
        return;
      }
      const gl = renderer.getContext();
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) {
        ext.loseContext();
        setTimeout(() => {
          ext.restoreContext();
        }, delay);
      }
    },
    [rendererRef, instanceRef]
  );

  const testError = useCallback(() => {
    if (!instanceRef.current) {
      console.warn('Instance not available to test error');
      return;
    }
    setError(new Error('Test error triggered'));
  }, [instanceRef, setError]);

  // Update optionsRef with the latest camera position whenever it changes
  useEffect(() => {
    optionsRef.current = {
      cameraPosition: {
        x: 0,
        y: cameraPositionY,
        z: cameraPositionZ,
      },
    };
  }, [cameraPositionY, cameraPositionZ, optionsRef]);

  // Update camera position on the Three.js instance whenever the camera position state changes.
  useEffect(() => {
    if (!instanceRef.current) return;
    const { setCameraPosition } = instanceRef.current;
    setCameraPosition(0, cameraPositionY, cameraPositionZ);
  }, [cameraPositionY, cameraPositionZ, instanceRef]);

  return (
    <div
      className={`relative h-screen w-screen overflow-hidden transition-colors ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-stone-100 text-slate-900'
      }`}
    >
      <div className='absolute top-0 left-0 h-screen w-screen'>
        {error ? (
          <div className='absolute top-0 left-0 h-full w-full flex items-center justify-center p-4'>
            <div className='max-w-md rounded-lg border p-6 text-center shadow-lg backdrop-blur-sm'>
              <h2 className='mb-4 text-2xl font-bold'>
                An error occurred while loading the 3D scene.
              </h2>
              <p className='text-sm text-gray-500'>
                Please try refreshing the page or check your browser console for more details.
              </p>
              <pre
                className={`mt-4 overflow-x-auto rounded p-3 text-left text-xs text-red-500 ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'}`}
              >
                {error.message}
              </pre>
              <button
                onClick={resetError}
                className='mt-6 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <ThreeCanvas className='h-full w-full' />
        )}
      </div>
      <button
        onClick={() => setShowDebug(prev => !prev)}
        className={`absolute top-4 left-4 z-20 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur ${
          theme === 'dark'
            ? 'border-white/10 bg-slate-900/65 text-slate-100'
            : 'border-slate-300/70 bg-white/75 text-slate-900'
        }`}
      >
        {showDebug ? 'Hide Debug' : 'Show Debug'}
      </button>
      {showDebug && (
        <div
          className={`absolute top-16 left-4 z-10 flex max-h-[calc(100vh-5rem)] flex-col overflow-hidden rounded-2xl border p-2 shadow-lg backdrop-blur ${
            theme === 'dark'
              ? 'border-white/10 bg-slate-900/65 text-slate-100'
              : 'border-slate-300/70 bg-white/75 text-slate-900'
          }`}
        >
          <div
            className={`scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-rounded-full min-h-0 flex-1 overflow-y-auto p-2 ${
              theme === 'dark'
                ? 'scrollbar-thumb-slate-500 scrollbar-track-slate-800/40'
                : 'scrollbar-thumb-slate-400 scrollbar-track-slate-200/40'
            }`}
          >
            <div className='flex flex-col gap-2'>
              <button
                onClick={forceLostContext}
                className='rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600'
              >
                Force Lost Context
              </button>
              <button
                onClick={() => timeoutLostContext(1000)}
                className='rounded bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600'
              >
                Timeout Lost Context (1 seconds)
              </button>
              <button
                onClick={testError}
                className='rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600'
              >
                Test Error
              </button>
            </div>
            <div className='mt-4 border-t border-gray-300/40 pt-4'>
              <p className='mb-3 text-xs font-semibold uppercase tracking-widest opacity-60'>
                Camera Controls
              </p>
              <div className='flex flex-col gap-4'>
                <div>
                  <div className='mb-1 flex items-center justify-between text-xs opacity-70'>
                    <span>Vertical (Y)</span>
                    <span className='font-mono'>{cameraPositionY.toFixed(1)}</span>
                  </div>
                  <input
                    type='range'
                    min={-10}
                    max={10}
                    step={0.1}
                    value={cameraPositionY}
                    onChange={e => setCameraPositionY(parseFloat(e.target.value))}
                    className='w-full accent-blue-500'
                  />
                </div>
                <div>
                  <div className='mb-1 flex items-center justify-between text-xs opacity-70'>
                    <span>Distance (Z)</span>
                    <span className='font-mono'>{cameraPositionZ.toFixed(1)}</span>
                  </div>
                  <input
                    type='range'
                    min={1}
                    max={20}
                    step={0.1}
                    value={cameraPositionZ}
                    onChange={e => setCameraPositionZ(parseFloat(e.target.value))}
                    className='w-full accent-blue-500'
                  />
                </div>
              </div>
            </div>
            <div className='mt-4 border-t border-gray-300/40 pt-4'>
              <p className='mb-3 text-xs font-semibold uppercase tracking-widest opacity-60'>
                Renderer Controls
              </p>
              <div>
                <div className='mb-1 flex items-center justify-between text-xs opacity-70'>
                  <span>
                    Frame Rate <span className='font-mono'>`frameRate`</span>
                  </span>
                  <span className='font-mono'>{props.frameRate ?? '-'}</span>
                </div>
                <input
                  type='range'
                  min={1}
                  max={120}
                  step={1}
                  value={props.frameRate ?? 0}
                  onChange={e => props.setFrameRate(parseInt(e.target.value) || null)}
                  className='w-full accent-blue-500'
                />
                <button
                  onClick={() => props.setFrameRate(null)}
                  className='mt-2 rounded bg-gray-500 px-4 py-1 text-xs text-white hover:bg-gray-600'
                >
                  Reset to Default
                </button>
              </div>
              <div>
                <div className='mb-1 flex items-center justify-between text-xs opacity-70'>
                  <span>
                    Device Pixel Ratio <span className='font-mono'>`devicePixelRatio`</span>
                  </span>
                  <span className='font-mono'>{props.devicePixelRatio?.toFixed(2) ?? '-'}</span>
                </div>
                <input
                  type='range'
                  min={0.1}
                  max={4}
                  step={0.1}
                  value={props.devicePixelRatio ?? 0}
                  onChange={e => props.setDevicePixelRatio(parseFloat(e.target.value) || null)}
                  className='w-full accent-blue-500'
                />
                <button
                  onClick={() => props.setDevicePixelRatio(null)}
                  className='mt-2 rounded bg-gray-500 px-4 py-1 text-xs text-white hover:bg-gray-600'
                >
                  Reset to Default
                </button>
              </div>
              <div>
                <div className='mb-1 flex items-center justify-between text-xs opacity-70'>
                  <span>
                    Timescale <span className='font-mono'>`timescale`</span>
                  </span>
                  <span className='font-mono'>{timescale}</span>
                </div>
                <input
                  type='range'
                  min={0.0}
                  max={2.0}
                  step={0.1}
                  value={timescale ?? 0}
                  onChange={e => setTimescale(parseFloat(e.target.value))}
                  className='w-full accent-blue-500'
                />
                <button
                  onClick={() => setTimescale(1)}
                  className='mt-2 rounded bg-gray-500 px-4 py-1 text-xs text-white hover:bg-gray-600'
                >
                  Reset to 1.0
                </button>
              </div>
              <div>
                <label className='flex items-center gap-2 text-xs opacity-70'>
                  <input
                    type='checkbox'
                    checked={isUpdating}
                    onChange={e => setIsUpdating(e.target.checked)}
                    className='accent-blue-500'
                  />
                  <span>
                    Update <span className='font-mono'>`isUpdating`</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  // Render the ThreeProvider at the root of the component tree, passing the createInstance function to initialize the Three.js instance, and render the PageContent inside it.
  const { window, document } = globalThis;

  const { frameRate, setFrameRate, devicePixelRatio, setDevicePixelRatio } = useQueryParams();

  return (
    <ThreeProvider
      window={window}
      document={document}
      onCreate={createInstance}
      onRendererCreate={createCustomRenderer}
      disposeOnError={true}
      alpha={0}
      frameRate={frameRate ?? undefined}
      devicePixelRatio={devicePixelRatio ?? undefined}
    >
      <PageContent
        frameRate={frameRate}
        setFrameRate={setFrameRate}
        devicePixelRatio={devicePixelRatio}
        setDevicePixelRatio={setDevicePixelRatio}
      />
    </ThreeProvider>
  );
}
