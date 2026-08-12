'use client';

import { useState, useCallback, useEffect } from 'react';

type UseLocalStorageTypes = string | number | boolean | object;

export default function useLocalStorage<T = UseLocalStorageTypes>(key: string, defaultValue: T) {
  const localStorage = globalThis.localStorage;
  const [storedValue, setStoredValue] = useState<T>(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        setStoredValue(defaultValue);
        return;
      }
      // Try to parse as JSON first
      try {
        setStoredValue(JSON.parse(item) as T);
      } catch {
        // If JSON.parse fails, treat as string
        setStoredValue(item as T);
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      setStoredValue(defaultValue);
    } finally {
      setIsLoaded(true);
    }
  }, [key, defaultValue]);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        // Handle strings differently to avoid double quotes in localStorage
        if (typeof valueToStore === 'string') {
          localStorage.setItem(key, valueToStore);
        } else {
          localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue, isLoaded] as const;
}
