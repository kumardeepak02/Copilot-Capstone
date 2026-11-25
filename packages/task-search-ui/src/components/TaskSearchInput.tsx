/**
 * Task Search Input - React component for entering search queries
 * Integrates debouncing to prevent excessive filtering operations
 */

import React, { useState, useCallback } from 'react';
import { useDebouncedCallback } from '../hooks/useInputDebouncer';

export interface TaskSearchInputProps {
  /**
   * Callback fired after debounce delay when input changes
   */
  onFilterChange: (query: string) => void;

  /**
   * Debounce delay in milliseconds (default: 300ms)
   */
  debounceDelay?: number;

  /**
   * Initial search query value
   */
  initialValue?: string;

  /**
   * Label for the search input field
   */
  label?: string;

  /**
   * Placeholder text for the input
   */
  placeholder?: string;

  /**
   * CSS class name for styling
   */
  className?: string;

  /**
   * Callback fired when user clicks clear button
   */
  onClear?: () => void;
}

/**
 * TaskSearchInput Component
 * 
 * @example
 * <TaskSearchInput
 *   onFilterChange={(query) => setSearchQuery(query)}
 *   debounceDelay={300}
 *   placeholder="Search tasks..."
 * />
 */
export const TaskSearchInput: React.FC<TaskSearchInputProps> = ({
  onFilterChange,
  debounceDelay = 300,
  initialValue = '',
  label = 'task search field',
  placeholder = 'Search tasks...',
  className = '',
  onClear,
}) => {
  const [inputValue, setInputValue] = useState(initialValue);

  // Create debounced callback for filter changes
  const debouncedFilterChange = useDebouncedCallback(
    onFilterChange,
    debounceDelay
  );

  /**
   * Handle input change - update local state and trigger debounced filter
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      debouncedFilterChange(newValue);
    },
    [debouncedFilterChange]
  );

  /**
   * Handle clear button click - reset input and trigger filter
   */
  const handleClear = useCallback(() => {
    setInputValue('');
    onFilterChange('');
    onClear?.();
  }, [onFilterChange, onClear]);

  /**
   * Handle Enter key - trigger filter immediately
   */
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onFilterChange(inputValue);
      }
    },
    [inputValue, onFilterChange]
  );

  return (
    <div className={`task-search-input-container ${className}`.trim()}>
      <label htmlFor="task-search-input" className="task-search-label">
        {label}
      </label>
      <div className="task-search-input-wrapper">
        <input
          id="task-search-input"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="task-search-input"
          aria-label={label}
          aria-describedby="task-search-hint"
        />
        {inputValue && (
          <button
            onClick={handleClear}
            className="task-search-clear-btn"
            type="button"
            aria-label="Clear search"
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>
      <span id="task-search-hint" className="visually-hidden">
        Results update as you type
      </span>
    </div>
  );
};

export default TaskSearchInput;
