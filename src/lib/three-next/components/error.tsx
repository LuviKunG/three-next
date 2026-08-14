'use client';

import React from 'react';
import { useThree } from '../context';

/**
 * Renders its children as a fallback UI whenever `ThreeProvider` is in an
 * error state, and renders nothing otherwise. Pass any `<div>` props
 * (e.g. `className`) to style the fallback container.
 */
function ThreeError(props: React.HTMLAttributes<HTMLDivElement>) {
  const { error } = useThree();

  // Shouldn't render the canvas if there's no error.
  if (!error) {
    return null;
  }

  const { children, ...divProps } = props;
  return <div {...divProps}>{children}</div>;
}

export default ThreeError;
