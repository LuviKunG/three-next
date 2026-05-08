'use client';

import { useThree } from './context';

function ThreeCanvas(props: React.CanvasHTMLAttributes<HTMLCanvasElement>) {
  const { canvasObserverRef, error } = useThree();

  // Shouldn't render the canvas if there's an error.
  if (error) {
    return null;
  }

  return <canvas {...props} ref={canvasObserverRef} />;
}

export default ThreeCanvas;
