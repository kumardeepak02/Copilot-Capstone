/**
 * Input Debouncer - React hook for debouncing input changes
 * Prevents excessive function calls while user is typing
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';

/**
 * Debounces a function call with a specified delay
 * 
 * @param callback - Function to call after debounce delay
 * @param delay - Delay in milliseconds (default: 200ms)
 * @returns Debounced function
 * 
 * @example
 * const handleSearch = useDebouncedCallback((query) => {
 *   console.log('Searching for:', query);
 * }, 300);
 * 
 * return <input onChange={(e) => handleSearch(e.target.value)} />;
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 200
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

/**
 * Debounces a value with a specified delay
 * Returns the debounced value that updates after delay when input changes
 * 
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds (default: 200ms)
 * @returns Debounced value
 * 
 * @example
 * const [query, setQuery] = useState('');
 * const debouncedQuery = useDebouncedValue(query, 300);
 * 
 * useEffect(() => {
 *   console.log('Filtering for:', debouncedQuery);
 * }, [debouncedQuery]);
 */
export function useDebouncedValue<T>(value: T, delay: number = 200): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [value, delay]);

  return debouncedValue;
}

export default useDebouncedCallback;
