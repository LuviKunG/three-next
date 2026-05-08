'use client';

import { useMemo, useCallback } from 'react';
import * as THREE from 'three';

import { useThree, ThreeCanvas, ThreeError, ThreeProvider } from '@/libs/three-next';
import { createInstance } from '@/core/three';
import useTheme from '@/hooks/useTheme';

function PageContent() {
  const { instance } = useThree();
  const theme = useTheme();

  const renderer: THREE.WebGLRenderer | undefined = useMemo(() => instance?.renderer, [instance]);

  const forceLostContext = useCallback(() => {
    if (renderer) {
      const gl = renderer.getContext();
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) {
        ext.loseContext();
      }
    }
  }, [renderer]);

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
        <button
          onClick={forceLostContext}
          className='rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600'
        >
          Force Lost Context
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ThreeProvider onCreate={createInstance}>
      <PageContent />
    </ThreeProvider>
  );
}
