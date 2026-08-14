'use client';

import React from 'react';
import { useThreeInternal } from '../context';

/**
 * Renders the `<canvas>` element that backs the Three.js instance, wiring
 * its ref callback to `ThreeProvider` so the renderer and instance are
 * created as soon as the element mounts. Renders nothing while the
 * provider is in an error state, since there is no valid renderer to
 * display until the error is cleared.
 */
function ThreeCanvas(props: React.CanvasHTMLAttributes<HTMLCanvasElement>) {
  const { canvasObserverRef, error } = useThreeInternal();

  // Shouldn't render the canvas if there's an error.
  if (error) {
    return null;
  }

  return <canvas {...props} ref={canvasObserverRef} />;
}

export default ThreeCanvas;
