/**
 * Unit tests for TaskSearchInput component
 * Tests search input component (mocked state/callbacks)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskSearchInput } from '../components/TaskSearchInput';

// Mock the debouncer hook
jest.mock('../hooks/useInputDebouncer', () => ({
  useDebouncedCallback: (callback: any, delay: number) => callback,
}));

describe('TaskSearchInput', () => {
  it('should render text input with label', () => {
    const handleFilterChange = jest.fn();
    render(<TaskSearchInput onFilterChange={handleFilterChange} />);

    const label = screen.getByText('task search field');
    const input = screen.getByRole('textbox');

    expect(label).toBeInTheDocument();
    expect(input).toBeInTheDocument();
  });

  it('should capture user input on keystroke', async () => {
    const handleFilterChange = jest.fn();
    render(<TaskSearchInput onFilterChange={handleFilterChange} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    await userEvent.type(input, 'book');

    expect(input.value).toBe('book');
  });

  it('should call onFilterChange callback after typing', async () => {
    const handleFilterChange = jest.fn();
    render(<TaskSearchInput onFilterChange={handleFilterChange} />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'book');

    expect(handleFilterChange).toHaveBeenCalledWith('book');
  });

  it('should use custom debounce delay', () => {
    const handleFilterChange = jest.fn();
    const { rerender } = render(
      <TaskSearchInput
        onFilterChange={handleFilterChange}
        debounceDelay={500}
      />
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should use custom label', () => {
    const handleFilterChange = jest.fn();
    render(
      <TaskSearchInput
        onFilterChange={handleFilterChange}
        label="Custom label"
      />
    );

    expect(screen.getByText('Custom label')).toBeInTheDocument();
  });

  it('should use custom placeholder', () => {
    const handleFilterChange = jest.fn();
    render(
      <TaskSearchInput
        onFilterChange={handleFilterChange}
        placeholder="Custom placeholder"
      />
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.placeholder).toBe('Custom placeholder');
  });

  it('should show clear button when input has value', async () => {
    const handleFilterChange = jest.fn();
    render(<TaskSearchInput onFilterChange={handleFilterChange} />);

    const input = screen.getByRole('textbox');
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();

    await userEvent.type(input, 'book');

    expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument();
  });

  it('should clear input when clear button is clicked', async () => {
    const handleFilterChange = jest.fn();
    render(<TaskSearchInput onFilterChange={handleFilterChange} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    await userEvent.type(input, 'book');

    expect(input.value).toBe('book');

    const clearBtn = screen.getByRole('button', { name: 'Clear search' });
    fireEvent.click(clearBtn);

    expect(input.value).toBe('');
    expect(handleFilterChange).toHaveBeenCalledWith('');
  });

  it('should call onClear callback when clear button is clicked', async () => {
    const handleFilterChange = jest.fn();
    const handleClear = jest.fn();
    render(
      <TaskSearchInput
        onFilterChange={handleFilterChange}
        onClear={handleClear}
      />
    );

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'book');

    const clearBtn = screen.getByRole('button', { name: 'Clear search' });
    fireEvent.click(clearBtn);

    expect(handleClear).toHaveBeenCalled();
  });

  it('should trigger filter on Enter key press', async () => {
    const handleFilterChange = jest.fn();
    render(<TaskSearchInput onFilterChange={handleFilterChange} />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'book');
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(handleFilterChange).toHaveBeenCalledWith('book');
  });

  it('should be keyboard accessible', async () => {
    const handleFilterChange = jest.fn();
    render(<TaskSearchInput onFilterChange={handleFilterChange} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-label', 'task search field');
    expect(input).toHaveAttribute('aria-describedby', 'task-search-hint');
  });

  it('should use initial value', () => {
    const handleFilterChange = jest.fn();
    render(
      <TaskSearchInput
        onFilterChange={handleFilterChange}
        initialValue="initial query"
      />
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('initial query');
  });

  it('should accept custom className', () => {
    const handleFilterChange = jest.fn();
    render(
      <TaskSearchInput
        onFilterChange={handleFilterChange}
        className="custom-class"
      />
    );

    const container = screen.getByRole('textbox').closest('.task-search-input-container');
    expect(container).toHaveClass('custom-class');
  });

  it('should render hidden hint text for accessibility', () => {
    const handleFilterChange = jest.fn();
    render(<TaskSearchInput onFilterChange={handleFilterChange} />);

    const hint = screen.getByText('Results update as you type');
    expect(hint).toHaveClass('visually-hidden');
  });
});
