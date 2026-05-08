'use client';

import React from 'react';
import { useThree } from '../context';

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
