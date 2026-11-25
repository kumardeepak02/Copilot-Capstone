/**
 * Unit tests for InputDebouncer hook
 * Tests debounce utility
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebouncedCallback, useDebouncedValue } from '../hooks/useInputDebouncer';

describe('useInputDebouncer', () => {
  describe('useDebouncedCallback', () => {
    it('should debounce function calls', async () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 100));

      act(() => {
        result.current('call1');
        result.current('call2');
        result.current('call3');
      });

      // Callback should not be called immediately
      expect(callback).not.toHaveBeenCalled();

      // Wait for debounce delay
      await waitFor(() => {
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith('call3');
      });
    });

    it('should respect configurable delay', async () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 200));

      act(() => {
        result.current('test');
      });

      // Should not call immediately
      expect(callback).not.toHaveBeenCalled();

      // Wait for delay
      await waitFor(
        () => {
          expect(callback).toHaveBeenCalledWith('test');
        },
        { timeout: 300 }
      );
    });

    it('should use default delay of 200ms', async () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback));

      act(() => {
        result.current('test');
      });

      await waitFor(
        () => {
          expect(callback).toHaveBeenCalledWith('test');
        },
        { timeout: 300 }
      );
    });

    it('should clear pending timeouts on unmount', async () => {
      const callback = jest.fn();
      const { result, unmount } = renderHook(() =>
        useDebouncedCallback(callback, 100)
      );

      act(() => {
        result.current('test');
      });

      unmount();

      // Wait longer than debounce delay
      await new Promise(resolve => setTimeout(resolve, 150));

      // Callback should not be called after unmount
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple arguments', async () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 50));

      act(() => {
        result.current('arg1', 'arg2', 'arg3');
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
      });
    });

    it('should cancel previous timeout when called again before delay', async () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 100));

      act(() => {
        result.current('call1');
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      act(() => {
        result.current('call2');
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      // Should not have called yet (second call resets timer)
      expect(callback).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith('call2');
      });
    });
  });

  describe('useDebouncedValue', () => {
    it('should debounce value changes', async () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebouncedValue(value, delay),
        { initialProps: { value: 'initial', delay: 100 } }
      );

      // Initial value is set immediately
      expect(result.current).toBe('initial');

      // Update value
      rerender({ value: 'updated', delay: 100 });

      // Debounced value should not update immediately
      expect(result.current).toBe('initial');

      // Wait for debounce delay
      await waitFor(() => {
        expect(result.current).toBe('updated');
      });
    });

    it('should use default delay of 200ms', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });

      await waitFor(
        () => {
          expect(result.current).toBe('updated');
        },
        { timeout: 300 }
      );
    });

    it('should cancel previous timeout on rapid changes', async () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebouncedValue(value, delay),
        { initialProps: { value: 'value1', delay: 100 } }
      );

      rerender({ value: 'value2', delay: 100 });
      await new Promise(resolve => setTimeout(resolve, 50));

      rerender({ value: 'value3', delay: 100 });
      await new Promise(resolve => setTimeout(resolve, 50));

      // Value should still be 'value1' (not updated)
      expect(result.current).toBe('value1');

      await waitFor(() => {
        // Should update to 'value3' (the last value)
        expect(result.current).toBe('value3');
      });
    });
  });
});
