import { useState, useEffect } from 'react';

/**
 * Reusable React hook for synchronizing state with LocalStorage safely.
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (e) {
      console.warn(`Failed to read localStorage key "${key}":`, e);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Failed to write localStorage key "${key}":`, e);
    }
  }, [key, value]);

  return [value, setValue];
}
