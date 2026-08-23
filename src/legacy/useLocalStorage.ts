import { useState, useEffect, Dispatch, SetStateAction } from 'react';

/**
 * Reusable React hook for synchronizing state with LocalStorage safely.
 * Handles SSR by deferring localStorage access until client-side hydration.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (e) {
      console.warn(`Failed to read localStorage key "${key}":`, e);
      return initialValue;
    }
  });

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Failed to write localStorage key "${key}":`, e);
    }
  }, [key, value, isClient]);

  return [value, setValue];
}