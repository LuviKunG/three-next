'use client';

import { useState, useEffect, useCallback } from 'react';

import { useThree, ThreeCanvas, ThreeError, ThreeProvider } from '@/lib/three-next';
import { createInstance, type Instance } from '@/core/three';
import useTheme from '@/hooks/useTheme';

function PageContent() {
  // Access the Three.js instance and related functions from the context.
  const { rendererRef, instanceRef, optionsRef, resetError } = useThree();
  // Access the current theme (light/dark) for styling purposes.
  const theme = useTheme();

  // State for camera position controls
  const [cameraPositionY, setCameraPositionY] = useState<number>(0);
  // State for camera distance control
  const [cameraPositionZ, setCameraPositionZ] = useState<number>(5);

  // Function to force a lost WebGL context on the Three.js instance, with error handling if the instance or renderer is not available.
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
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) {
      ext.loseContext();
    }
  }, [rendererRef, instanceRef]);

  // Utility function to simulate a lost WebGL context after a specified delay, then automatically restore it.
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
    const { setCameraPosition } = instanceRef.current as Instance;
    setCameraPosition(0, cameraPositionY, cameraPositionZ);
  }, [cameraPositionY, cameraPositionZ, instanceRef]);

  return (
    <div
      className={`relative h-screen w-screen overflow-hidden transition-colors ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-stone-100 text-slate-900'
      }`}
    >
      <div className='absolute top-0 left-0 h-screen w-screen'>
        <ThreeCanvas className='h-full w-full' />
        <ThreeError className='absolute top-0 left-0 h-full w-full flex items-center justify-center p-4'>
          <div className='max-w-md rounded-lg border p-6 text-center shadow-lg backdrop-blur-sm'>
            <h2 className='mb-4 text-2xl font-bold'>
              An error occurred while loading the 3D scene.
            </h2>
            <p className='text-sm text-gray-500'>
              Please try refreshing the page or check your browser console for more details.
            </p>
            <button
              onClick={resetError}
              className='mt-6 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
            >
              Retry
            </button>
          </div>
        </ThreeError>
      </div>
      <div
        className={`absolute top-4 left-4 z-10 rounded-2xl border p-4 shadow-lg backdrop-blur ${
          theme === 'dark'
            ? 'border-white/10 bg-slate-900/65 text-slate-100'
            : 'border-slate-300/70 bg-white/75 text-slate-900'
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
      </div>
    </div>
  );
}

export default function Home() {
  // Render the ThreeProvider at the root of the component tree, passing the createInstance function to initialize the Three.js instance, and render the PageContent inside it.
  return (
    <ThreeProvider onCreate={createInstance} disposeOnError={true} alpha={1} color={0x333333}>
      <PageContent />
    </ThreeProvider>
  );
}
