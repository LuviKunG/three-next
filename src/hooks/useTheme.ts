import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const useTheme = () => {
  const [theme, setTheme] = useState<Theme>('dark');

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

  return theme;
};

export default useTheme;
export type { Theme };
