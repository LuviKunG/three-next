'use client';

import { useRef, useState, useEffect } from 'react';

import { createInstance, type Instance } from '@/core/three';

import { isDebugging } from '@/env';

function PageContent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const mediaQuery = globalThis.window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = (matchesDark: boolean) => {
      setTheme(matchesDark ? 'dark' : 'light');
    };

    updateTheme(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      updateTheme(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Pass the global window object to the createInstance function
    const window = globalThis.window;

    const instance = createInstance(window, document, canvasRef.current);

    instanceRef.current = instance;

    return () => {
      instanceRef.current?.dispose();
    };
  }, []);

  return (
    <div
      className={`relative h-screen w-screen overflow-hidden transition-colors ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-stone-100 text-slate-900'
      }`}
    >
      <div className='absolute top-0 left-0 h-screen w-screen'>
        <canvas className='h-full w-full' ref={canvasRef} />
      </div>
      <div
        className={`absolute top-4 left-4 z-10 rounded-2xl border p-4 shadow-lg backdrop-blur ${
          theme === 'dark'
            ? 'border-white/10 bg-slate-900/65 text-slate-100'
            : 'border-slate-300/70 bg-white/75 text-slate-900'
        }`}
      ></div>
    </div>
  );
}

export default function Home() {
  return <PageContent />;
}
