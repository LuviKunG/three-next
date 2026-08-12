import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const useTheme = () => {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const window = globalThis.window;
    if (!window || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

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
