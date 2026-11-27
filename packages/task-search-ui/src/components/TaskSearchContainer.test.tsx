/**
 * Integration tests for complete search flow
 * Tests components working together (mocked API)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskSearchContainer } from '../components/TaskSearchContainer';
import { Task } from '../components/TaskFilterEngine';

describe('TaskSearchContainer - Integration Tests', () => {
  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Book flights',
      description: 'Travel to conference',
    },
    {
      id: '2',
      title: 'Write quarterly report',
      description: 'Q4 2026 report',
    },
    {
      id: '3',
      title: 'Pay invoices',
      description: 'Monthly invoices',
    },
  ];

  it('should render search input and task list', () => {
    render(<TaskSearchContainer tasks={mockTasks} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('should display all tasks initially', () => {
    render(<TaskSearchContainer tasks={mockTasks} />);

    expect(screen.getByText('Book flights')).toBeInTheDocument();
    expect(screen.getByText('Write quarterly report')).toBeInTheDocument();
    expect(screen.getByText('Pay invoices')).toBeInTheDocument();
  });

  it('should filter tasks when user types', async () => {
    render(<TaskSearchContainer tasks={mockTasks} />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'book');

    await waitFor(() => {
      expect(screen.getByText('Book flights')).toBeInTheDocument();
      expect(screen.queryByText('Write quarterly report')).not.toBeInTheDocument();
      expect(screen.queryByText('Pay invoices')).not.toBeInTheDocument();
    });
  });

  it('should perform case-insensitive filtering', async () => {
    render(<TaskSearchContainer tasks={mockTasks} />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'BOOK');

    await waitFor(() => {
      expect(screen.getByText('Book flights')).toBeInTheDocument();
    });
  });

  it('should restore all tasks when search is cleared', async () => {
    render(<TaskSearchContainer tasks={mockTasks} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    await userEvent.type(input, 'book');

    await waitFor(() => {
      expect(screen.getByText('Book flights')).toBeInTheDocument();
      expect(screen.queryByText('Write quarterly report')).not.toBeInTheDocument();
    });

    // Clear the search
    const clearBtn = screen.getByRole('button', { name: 'Clear search' });
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(input.value).toBe('');
      expect(screen.getByText('Book flights')).toBeInTheDocument();
      expect(screen.getByText('Write quarterly report')).toBeInTheDocument();
      expect(screen.getByText('Pay invoices')).toBeInTheDocument();
    });
  });

  it('should show empty state when no matches', async () => {
    render(<TaskSearchContainer tasks={mockTasks} />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'xyz');

    await waitFor(() => {
      expect(screen.getByText('No tasks found')).toBeInTheDocument();
      expect(screen.queryByText('Book flights')).not.toBeInTheDocument();
    });
  });

  it('should use custom empty message', async () => {
    render(
      <TaskSearchContainer
        tasks={mockTasks}
        emptyMessage="No results match your search"
      />
    );

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'xyz');

    await waitFor(() => {
      expect(screen.getByText('No results match your search')).toBeInTheDocument();
    });
  });

  it('should preserve original task list (no mutation)', async () => {
    const tasksCopy = JSON.parse(JSON.stringify(mockTasks));
    render(<TaskSearchContainer tasks={mockTasks} />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'book');

    await waitFor(() => {
      expect(screen.getByText('Book flights')).toBeInTheDocument();
    });

    // Original array should not be mutated
    expect(mockTasks).toEqual(tasksCopy);
  });

  it('should call onTaskSelect when task is clicked', async () => {
    const handleSelect = jest.fn();
    render(
      <TaskSearchContainer
        tasks={mockTasks}
        onTaskSelect={handleSelect}
      />
    );

    const taskItem = screen.getByText('Book flights').closest('.task-item');
    fireEvent.click(taskItem!);

    expect(handleSelect).toHaveBeenCalledWith(mockTasks[0]);
  });

  it('should handle custom debounce delay', async () => {
    render(
      <TaskSearchContainer
        tasks={mockTasks}
        debounceDelay={50}
      />
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should handle custom search placeholder', () => {
    render(
      <TaskSearchContainer
        tasks={mockTasks}
        searchPlaceholder="Custom placeholder"
      />
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.placeholder).toBe('Custom placeholder');
  });

  it('should handle custom search label', () => {
    render(
      <TaskSearchContainer
        tasks={mockTasks}
        searchLabel="Custom label"
      />
    );

    expect(screen.getByText('Custom label')).toBeInTheDocument();
  });

  it('should handle description visibility', async () => {
    const { rerender } = render(
      <TaskSearchContainer
        tasks={mockTasks}
        showDescription={true}
      />
    );

    expect(screen.getByText('Travel to conference')).toBeInTheDocument();

    rerender(
      <TaskSearchContainer
        tasks={mockTasks}
        showDescription={false}
      />
    );

    expect(screen.queryByText('Travel to conference')).not.toBeInTheDocument();
  });

  it('should update when task list prop changes', async () => {
    const { rerender } = render(
      <TaskSearchContainer tasks={[mockTasks[0]]} />
    );

    expect(screen.getByText('Book flights')).toBeInTheDocument();
    expect(screen.queryByText('Write quarterly report')).not.toBeInTheDocument();

    rerender(
      <TaskSearchContainer tasks={mockTasks} />
    );

    await waitFor(() => {
      expect(screen.getByText('Book flights')).toBeInTheDocument();
      expect(screen.getByText('Write quarterly report')).toBeInTheDocument();
      expect(screen.getByText('Pay invoices')).toBeInTheDocument();
    });
  });

  it('should handle multiple filters in sequence', async () => {
    render(<TaskSearchContainer tasks={mockTasks} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;

    // First search
    await userEvent.type(input, 'book');
    await waitFor(() => {
      expect(screen.getByText('Book flights')).toBeInTheDocument();
    });

    // Clear and search again
    const clearBtn = screen.getByRole('button', { name: 'Clear search' });
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(input.value).toBe('');
    });

    // New search
    await userEvent.type(input, 'report');
    await waitFor(() => {
      expect(screen.getByText('Write quarterly report')).toBeInTheDocument();
      expect(screen.queryByText('Book flights')).not.toBeInTheDocument();
    });
  });

  it('should show task count in display', async () => {
    render(<TaskSearchContainer tasks={mockTasks} />);

    expect(screen.getByText('3 tasks found')).toBeInTheDocument();

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'book');

    await waitFor(() => {
      expect(screen.getByText('1 task found')).toBeInTheDocument();
    });
  });
});
