import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const parseFiniteNumber = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value.replace(/['"]/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const useQueryParams = () => {
  const searchParams = useSearchParams();
  const [frameRate, setFrameRate] = useState<number | null>(null);
  const [devicePixelRatio, setDevicePixelRatio] = useState<number | null>(null);

  useEffect(() => {
    const queryFrameRate = searchParams.has('frameRate')
      ? parseFiniteNumber(searchParams.get('frameRate'))
      : null;
    const queryDevicePixelRatio = searchParams.has('devicePixelRatio')
      ? parseFiniteNumber(searchParams.get('devicePixelRatio'))
      : null;

    setFrameRate(queryFrameRate);
    setDevicePixelRatio(queryDevicePixelRatio);
  }, [searchParams]);
  return { frameRate, setFrameRate, devicePixelRatio, setDevicePixelRatio };
};

export default useQueryParams;
